
import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  canonicalSerialize,
  fillEquations,
  generateCompositionPlan,
  planClues,
  simulateDeductions,
  validateCluePlan,
  clueProfileForDifficulty,
} from "../../src/generation";
import type { GenerationRequest } from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string): GenerationRequest {
  return {
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `clues-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 8,
    constraints: {},
  };
}

for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  const profile = clueProfileForDifficulty(difficulty);
  check(profile.difficulty === difficulty, `${difficulty}: profile mismatch`);
  check(profile.targetGivenRatio > 0 && profile.targetGivenRatio < 1, `${difficulty}: invalid ratio`);

  const fingerprints = new Set<string>();
  for (let index = 0; index < 8; index += 1) {
    const input = request(difficulty, `seed-${index}`);
    const composition = generateCompositionPlan(input, index);
    const filling = fillEquations(input, composition, index);
    check(filling.ok, `${difficulty}/${index}: fill failed`);
    if (!filling.ok) continue;

    const result = planClues(input, composition, filling.plan, index);
    check(result.ok, `${difficulty}/${index}: clue planning failed`);
    if (!result.ok) continue;

    const replay = planClues(input, composition, filling.plan, index);
    check(replay.ok, `${difficulty}/${index}: replay failed`);
    if (!replay.ok) continue;

    check(canonicalSerialize(result.plan) === canonicalSerialize(replay.plan), `${difficulty}/${index}: nondeterministic plan`);
    check(canonicalSerialize(result.trace) === canonicalSerialize(replay.trace), `${difficulty}/${index}: nondeterministic trace`);
    check(result.plan.schema === GENERATION_SCHEMA_IDS.cluePlan, `${difficulty}/${index}: wrong schema`);
    check(result.plan.givenCellIds.length > 0, `${difficulty}/${index}: no givens`);
    check(result.plan.hiddenCellIds.length > 0, `${difficulty}/${index}: no hidden cells`);
    check(result.plan.numberBank.length === result.plan.hiddenCellIds.length, `${difficulty}/${index}: bank mismatch`);
    check(result.trace.solved, `${difficulty}/${index}: trace did not solve`);
    check(result.trace.unresolvedCellIds.length === 0, `${difficulty}/${index}: unresolved cells remain`);
    check(result.trace.steps.length === result.plan.hiddenCellIds.length, `${difficulty}/${index}: incomplete trace`);
    check((result.trace.metrics.initialDeductions ?? 0) >= 1, `${difficulty}/${index}: no available start`);
    check(validateCluePlan(composition, filling.plan, result.plan).valid, `${difficulty}/${index}: invalid clue plan`);
    check(canonicalSerialize(simulateDeductions(composition, filling.plan, result.plan)) === canonicalSerialize(result.trace), `${difficulty}/${index}: simulator mismatch`);

    const allCells = new Set([...result.plan.givenCellIds, ...result.plan.hiddenCellIds]);
    check(allCells.size === Object.keys(filling.plan.values).length, `${difficulty}/${index}: clue coverage mismatch`);
    fingerprints.add(canonicalSerialize(result.plan));
  }
  check(fingerprints.size >= 7, `${difficulty}: insufficient clue diversity`);
}

console.log(`Clue planning and deduction: ${assertions}/${assertions} assertions passed.`);
