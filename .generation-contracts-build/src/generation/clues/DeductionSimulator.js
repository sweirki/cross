"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateDeductions = simulateDeductions;
const ClusterLibrary_1 = require("../clusters/ClusterLibrary");
const ClusterTransforms_1 = require("../clusters/ClusterTransforms");
function extractEquations(composition) {
    const result = [];
    for (const cluster of composition.clusters) {
        const template = (0, ClusterTransforms_1.transformClusterTemplate)((0, ClusterLibrary_1.getClusterTemplate)(cluster.templateId), cluster.transform);
        for (const equation of template.equations) {
            result.push({
                id: `${cluster.id}:${equation.id.split(":").pop()}`,
                cellIds: [
                    cluster.cellIdMap[equation.cellIds[0]],
                    cluster.cellIdMap[equation.cellIds[2]],
                    cluster.cellIdMap[equation.cellIds[4]],
                ],
            });
        }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
}
function metrics(hiddenCount, initialDeductions, steps, solved) {
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
function simulateDeductions(composition, fill, clues) {
    const equations = extractEquations(composition);
    const known = new Map();
    for (const id of clues.givenCellIds) {
        const value = fill.values[id];
        if (value !== undefined)
            known.set(id, value);
    }
    const unresolved = new Set(clues.hiddenCellIds);
    const steps = [];
    let initialDeductions = 0;
    let pass = 0;
    while (unresolved.size > 0) {
        const available = [];
        for (const equation of equations) {
            const missing = equation.cellIds.filter((id) => !known.has(id));
            if (missing.length === 1 && unresolved.has(missing[0])) {
                available.push({
                    equation,
                    cellId: missing[0],
                    prerequisites: equation.cellIds.filter((id) => known.has(id)),
                });
            }
        }
        available.sort((a, b) => a.equation.id.localeCompare(b.equation.id) || a.cellId.localeCompare(b.cellId));
        if (pass === 0)
            initialDeductions = available.length;
        if (available.length > 0) {
            for (const candidate of available) {
                if (!unresolved.has(candidate.cellId))
                    continue;
                const value = fill.values[candidate.cellId];
                if (value === undefined)
                    continue;
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
            const cellId = [...unresolved][0];
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
