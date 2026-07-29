
import type {
  CluePlan,
  CompositionPlan,
  DeductionStep,
  DeductionTrace,
  EquationFillPlan,
} from "../contracts/GenerationContracts";
import { getClusterTemplate } from "../clusters/ClusterLibrary";
import { transformClusterTemplate } from "../clusters/ClusterTransforms";

interface Equation {
  readonly id: string;
  readonly cellIds: readonly [string, string, string];
}

function extractEquations(composition: CompositionPlan): Equation[] {
  const result: Equation[] = [];
  for (const cluster of composition.clusters) {
    const template = transformClusterTemplate(getClusterTemplate(cluster.templateId), cluster.transform);
    for (const equation of template.equations) {
      result.push({
        id: `${cluster.id}:${equation.id.split(":").pop()!}`,
        cellIds: [
          cluster.cellIdMap[equation.cellIds[0]]!,
          cluster.cellIdMap[equation.cellIds[2]]!,
          cluster.cellIdMap[equation.cellIds[4]]!,
        ],
      });
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

function metrics(
  hiddenCount: number,
  initialDeductions: number,
  steps: readonly DeductionStep[],
  solved: boolean,
): Readonly<Record<string, number>> {
  const equationSteps = steps.filter((step) => step.rule === "equation-two-known").length;
  const bankSteps = steps.length - equationSteps;
  return Object.freeze({
    hiddenCount,
    solvedCount: steps.length,
    unresolvedCount: hiddenCount - steps.length,
    initialDeductions,
    deductionDepth: steps.length,
    forcedMoveRatio: hiddenCount === 0 ? 1 : Number((steps.length / hiddenCount).toFixed(6)),
    equationDeductionCount: equationSteps,
    bankDeductionCount: bankSteps,
    solved: solved ? 1 : 0,
  });
}

export function simulateDeductions(
  composition: CompositionPlan,
  fill: EquationFillPlan,
  clues: Pick<CluePlan, "givenCellIds" | "hiddenCellIds" | "numberBank">,
): DeductionTrace {
  const equations = extractEquations(composition);
  const known = new Map<string, number>();
  for (const id of clues.givenCellIds) {
    const value = fill.values[id];
    if (value !== undefined) known.set(id, value);
  }

  const unresolved = new Set(clues.hiddenCellIds);
  const steps: DeductionStep[] = [];
  let initialDeductions = 0;
  let pass = 0;

  while (unresolved.size > 0) {
    const available: { equation: Equation; cellId: string; prerequisites: string[] }[] = [];
    for (const equation of equations) {
      const missing = equation.cellIds.filter((id) => !known.has(id));
      if (missing.length === 1 && unresolved.has(missing[0]!)) {
        available.push({
          equation,
          cellId: missing[0]!,
          prerequisites: equation.cellIds.filter((id) => known.has(id)),
        });
      }
    }
    available.sort((a, b) => a.equation.id.localeCompare(b.equation.id) || a.cellId.localeCompare(b.cellId));

    if (pass === 0) initialDeductions = available.length;
    if (available.length > 0) {
      for (const candidate of available) {
        if (!unresolved.has(candidate.cellId)) continue;
        const value = fill.values[candidate.cellId];
        if (value === undefined) continue;
        known.set(candidate.cellId, value);
        unresolved.delete(candidate.cellId);
        steps.push(Object.freeze({
          index: steps.length,
          rule: "equation-two-known",
          cellId: candidate.cellId,
          value,
          equationId: candidate.equation.id,
          prerequisiteCellIds: Object.freeze([...candidate.prerequisites].sort()),
        }));
      }
      pass += 1;
      continue;
    }

    if (unresolved.size === 1) {
      const cellId = [...unresolved][0]!;
      const value = fill.values[cellId];
      if (value !== undefined) {
        known.set(cellId, value);
        unresolved.delete(cellId);
        steps.push(Object.freeze({
          index: steps.length,
          rule: "number-bank-last-value",
          cellId,
          value,
          prerequisiteCellIds: Object.freeze([]),
        }));
        pass += 1;
        continue;
      }
    }
    break;
  }

  const unresolvedCellIds = Object.freeze([...unresolved].sort());
  const solved = unresolvedCellIds.length === 0;
  return Object.freeze({
    solved,
    steps: Object.freeze(steps),
    unresolvedCellIds,
    metrics: metrics(clues.hiddenCellIds.length, initialDeductions, steps, solved),
  });
}
