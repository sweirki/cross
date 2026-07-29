"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HintSession = void 0;
const HintEngine_1 = require("./HintEngine");
class HintSession {
    puzzleId;
    trace;
    levels = new Map();
    constructor(puzzleId, trace) {
        this.puzzleId = puzzleId;
        this.trace = trace;
    }
    next(solvedCellIds) {
        const solved = new Set(solvedCellIds);
        const step = this.trace.steps.find((candidate) => !solved.has(candidate.cellId) &&
            candidate.prerequisiteCellIds.every((cellId) => solved.has(cellId)));
        const key = step?.index ?? -1;
        const prior = this.levels.get(key) ?? 0;
        const level = Math.min(4, prior + 1);
        this.levels.set(key, level);
        return (0, HintEngine_1.createHint)({ puzzleId: this.puzzleId, trace: this.trace, solvedCellIds, requestedLevel: level });
    }
    resetStep(stepIndex) {
        this.levels.delete(stepIndex);
    }
}
exports.HintSession = HintSession;
