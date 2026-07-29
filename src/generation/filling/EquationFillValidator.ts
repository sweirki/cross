
import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import type { ArithmeticOperation } from "../../engine/math/ArithmeticTypes";
import type { CompositionPlan, EquationFillPlan } from "../contracts/GenerationContracts";
import { getClusterTemplate } from "../clusters/ClusterLibrary";
import { transformClusterTemplate } from "../clusters/ClusterTransforms";
import { arithmeticProfileForDifficulty } from "./ArithmeticProfiles";
import type { DifficultyTier } from "../../types/Difficulty";

const OPERATION: Readonly<Record<string, ArithmeticOperation>> = {
  "+": "add", "-": "subtract", "×": "multiply", "÷": "divide",
};

export interface EquationFillValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateEquationFillPlan(
  difficulty: DifficultyTier,
  composition: CompositionPlan,
  plan: EquationFillPlan,
): EquationFillValidation {
  const errors: string[] = [];
  const profile = arithmeticProfileForDifficulty(difficulty);
  for (const cluster of composition.clusters) {
    const template = transformClusterTemplate(getClusterTemplate(cluster.templateId), cluster.transform);
    for (const equation of template.equations) {
      const sourceId = `${cluster.id}:${equation.id.split(":").pop()!}`;
      const operator = plan.operators[sourceId];
      if (!operator) { errors.push(`Missing operator for ${sourceId}.`); continue; }
      if (!profile.operators.includes(operator)) errors.push(`Operator ${operator} is not allowed for ${difficulty}.`);
      const ids = [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]].map((id) => cluster.cellIdMap[id]!);
      const values = ids.map((id) => plan.values[id]);
      if (values.some((value) => value === undefined)) { errors.push(`Missing value for ${sourceId}.`); continue; }
      const result = applyArithmetic(OPERATION[operator]!, values[0]!, values[1]!, profile.policy);
      if (!result.ok || result.result !== values[2]) errors.push(`Invalid arithmetic for ${sourceId}.`);
    }
  }
  const numberCells = composition.occupiedCells.filter((cell) => cell.kind === "number").map((cell) => cell.cellId);
  for (const id of numberCells) if (plan.values[id] === undefined) errors.push(`Missing number cell ${id}.`);
  for (const id of Object.keys(plan.values)) if (!numberCells.includes(id)) errors.push(`Unknown number cell ${id}.`);
  return { valid: errors.length === 0, errors: Object.freeze(errors) };
}

export function assertValidEquationFillPlan(
  difficulty: DifficultyTier,
  composition: CompositionPlan,
  plan: EquationFillPlan,
): void {
  const validation = validateEquationFillPlan(difficulty, composition, plan);
  if (!validation.valid) throw new Error(`Invalid equation fill plan: ${validation.errors.join(" ")}`);
}
