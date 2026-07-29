
import type {
  CluePlan,
  CompositionPlan,
  EquationFillPlan,
  GenerationRequest,
} from "../contracts/GenerationContracts";
import { allocateStageSeeds } from "../random/GenerationSeeds";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { clueProfileForDifficulty } from "./ClueProfiles";
import { assertValidCluePlan } from "./CluePlanValidator";
import { simulateDeductions } from "./DeductionSimulator";
import type { CluePlanningResult } from "./DeductionTypes";

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rank(seed: number, id: string): number {
  let value = (seed ^ hashText(id)) >>> 0;
  value ^= value >>> 16; value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15; value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function bankOrder(values: readonly number[], seed: number): number[] {
  return values.map((value, index) => ({ value, index }))
    .sort((a, b) => rank(seed, `${a.value}:${a.index}`) - rank(seed, `${b.value}:${b.index}`) || a.index - b.index)
    .map((entry) => entry.value);
}

export function planClues(
  request: GenerationRequest,
  composition: CompositionPlan,
  fill: EquationFillPlan,
  candidateIndex = 0,
): CluePlanningResult {
  const profile = clueProfileForDifficulty(request.difficulty);
  const clueSeed = allocateStageSeeds(request.rootSeed, candidateIndex).clue;
  const numberIds = composition.occupiedCells
    .filter((cell) => cell.kind === "number")
    .map((cell) => cell.cellId)
    .sort();

  if (numberIds.some((id) => fill.values[id] === undefined)) {
    return { ok: false, code: "INVALID_CLUE_COVERAGE", message: "The fill plan does not cover every number cell." };
  }

  const targetGivenCount = Math.max(1, Math.ceil(numberIds.length * profile.targetGivenRatio));
  const given = new Set(numberIds);
  const hidden = new Set<string>();
  const removalOrder = [...numberIds].sort((a, b) => rank(clueSeed.value, a) - rank(clueSeed.value, b) || a.localeCompare(b));

  for (const cellId of removalOrder) {
    if (given.size <= targetGivenCount) break;
    given.delete(cellId);
    hidden.add(cellId);
    const trial = {
      givenCellIds: [...given].sort(),
      hiddenCellIds: [...hidden].sort(),
      numberBank: [...hidden].map((id) => fill.values[id]!),
    };
    if (!simulateDeductions(composition, fill, trial).solved) {
      hidden.delete(cellId);
      given.add(cellId);
    }
  }

  const givenCellIds = Object.freeze([...given].sort());
  const hiddenCellIds = Object.freeze([...hidden].sort());
  const numberBank = Object.freeze(bankOrder(hiddenCellIds.map((id) => fill.values[id]!), clueSeed.value));
  const plan: CluePlan = Object.freeze({
    schema: GENERATION_SCHEMA_IDS.cluePlan,
    id: `${composition.id}:clues`,
    givenCellIds,
    hiddenCellIds,
    numberBank,
    profileId: profile.id,
    clueSeed,
  });
  const trace = simulateDeductions(composition, fill, plan);
  if (!trace.solved) {
    return { ok: false, code: "UNSOLVABLE_BY_SUPPORTED_RULES", message: "The clue plan requires unsupported guessing.", trace };
  }
  assertValidCluePlan(composition, fill, plan);
  return { ok: true, plan, trace };
}
