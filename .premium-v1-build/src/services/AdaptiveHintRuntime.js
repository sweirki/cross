"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdaptiveHint = buildAdaptiveHint;
const engine_1 = require("../game/engine");
function equationLabel(ids) {
    return ids.length === 0 ? "the highlighted area" : ids.length === 1 ? "the highlighted equation" : "the connected equations";
}
function buildAdaptiveHint(puzzle, session, level) {
    const logical = (0, engine_1.getLogicalHint)(puzzle, session);
    if (logical === null)
        return null;
    const candidateValues = [...new Set(puzzle.numberBank.map((tile) => tile.value))].sort((a, b) => a - b);
    const shared = logical.equationIds.length > 1;
    switch (level) {
        case 1:
            return {
                level, kind: "focus-equation",
                message: `Start with ${equationLabel(logical.equationIds)}. It has the strongest constraints.`,
                cellId: null, equationIds: logical.equationIds, candidateValues: [], revealedValue: null,
            };
        case 2:
            return {
                level, kind: "explain-concept",
                message: shared
                    ? "This number is shared. Its value must make every crossing equation true."
                    : "Use the operator and known values to determine the missing number.",
                cellId: null, equationIds: logical.equationIds, candidateValues: [], revealedValue: null,
            };
        case 3:
            return {
                level, kind: "focus-cell",
                message: "Focus on the highlighted number cell.",
                cellId: logical.cellId, equationIds: logical.equationIds, candidateValues: [], revealedValue: null,
            };
        case 4:
            return {
                level, kind: "show-candidates",
                message: `Try one of these available values: ${candidateValues.join(", ")}.`,
                cellId: logical.cellId, equationIds: logical.equationIds, candidateValues, revealedValue: null,
            };
        case 5:
            return {
                level, kind: "reveal-value",
                message: logical.message,
                cellId: logical.cellId, equationIds: logical.equationIds,
                candidateValues: [logical.value], revealedValue: logical.value,
            };
    }
}
