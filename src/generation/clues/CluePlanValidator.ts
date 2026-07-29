
import type { CluePlan, CompositionPlan, EquationFillPlan } from "../contracts/GenerationContracts";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { simulateDeductions } from "./DeductionSimulator";

export interface CluePlanValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

export function validateCluePlan(
  composition: CompositionPlan,
  fill: EquationFillPlan,
  plan: CluePlan,
): CluePlanValidation {
  const errors: string[] = [];
  if (plan.schema !== GENERATION_SCHEMA_IDS.cluePlan) errors.push("Unsupported clue-plan schema.");
  const numberIds = sorted(composition.occupiedCells.filter((cell) => cell.kind === "number").map((cell) => cell.cellId));
  const givens = sorted(plan.givenCellIds);
  const hidden = sorted(plan.hiddenCellIds);
  if (new Set(givens).size !== givens.length) errors.push("Given cell IDs contain duplicates.");
  if (new Set(hidden).size !== hidden.length) errors.push("Hidden cell IDs contain duplicates.");
  if (givens.some((id) => hidden.includes(id))) errors.push("Given and hidden cell sets overlap.");
  if (sorted([...givens, ...hidden]).join("|") !== numberIds.join("|")) errors.push("Clue cells do not cover all number cells.");
  const expectedBank = hidden.map((id) => fill.values[id]).filter((value): value is number => value !== undefined).sort((a, b) => a - b);
  const actualBank = [...plan.numberBank].sort((a, b) => a - b);
  if (expectedBank.join("|") !== actualBank.join("|")) errors.push("Number bank does not match hidden-cell values.");
  if (Object.keys(fill.values).some((id) => fill.values[id] === undefined)) errors.push("Fill plan contains undefined values.");
  if (errors.length === 0) {
    const trace = simulateDeductions(composition, fill, plan);
    if (!trace.solved) errors.push(`Clue plan stalls with ${trace.unresolvedCellIds.length} unresolved cells.`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

export function assertValidCluePlan(composition: CompositionPlan, fill: EquationFillPlan, plan: CluePlan): void {
  const result = validateCluePlan(composition, fill, plan);
  if (!result.valid) throw new Error(`Invalid clue plan: ${result.errors.join("; ")}`);
}
