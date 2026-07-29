"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHint = createHint;
exports.validateHintAgainstTrace = validateHintAgainstTrace;
function clampLevel(value) {
    if (value === undefined || value <= 1)
        return 1;
    if (value >= 4)
        return 4;
    return value;
}
function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        value ^= text.charCodeAt(i);
        value = Math.imul(value, 16777619);
    }
    return (value >>> 0).toString(16).padStart(8, "0");
}
function findNextStep(request) {
    const solved = new Set(request.solvedCellIds);
    return request.trace.steps.find((step) => !solved.has(step.cellId) &&
        step.prerequisiteCellIds.every((cellId) => solved.has(cellId)));
}
function createHint(request) {
    const level = clampLevel(request.requestedLevel);
    if (request.trace.solved && request.trace.steps.every((step) => request.solvedCellIds.includes(step.cellId))) {
        return Object.freeze({
            schemaVersion: 1,
            puzzleId: request.puzzleId,
            kind: "puzzle-complete",
            level,
            prerequisiteCellIds: Object.freeze([]),
            messageKey: "hint.puzzleComplete",
            deterministicId: hash(`${request.puzzleId}|complete|${level}`),
        });
    }
    const step = findNextStep(request);
    if (!step) {
        return Object.freeze({
            schemaVersion: 1,
            puzzleId: request.puzzleId,
            kind: "no-supported-deduction",
            level,
            prerequisiteCellIds: Object.freeze([]),
            messageKey: "hint.noSupportedDeduction",
            deterministicId: hash(`${request.puzzleId}|none|${level}|${[...request.solvedCellIds].sort().join(",")}`),
        });
    }
    const kind = level === 1
        ? "focus-equation"
        : level === 2
            ? "explain-deduction"
            : level === 3
                ? "narrow-candidates"
                : "reveal-value";
    const messageKey = step.rule === "equation-two-known"
        ? `hint.equation.${kind}`
        : `hint.numberBank.${kind}`;
    return Object.freeze({
        schemaVersion: 1,
        puzzleId: request.puzzleId,
        kind,
        level,
        stepIndex: step.index,
        rule: step.rule,
        targetCellId: step.cellId,
        equationId: step.equationId,
        prerequisiteCellIds: Object.freeze([...step.prerequisiteCellIds]),
        ...(level === 4 ? { revealedValue: step.value } : {}),
        messageKey,
        deterministicId: hash(`${request.puzzleId}|${step.index}|${level}|${step.cellId}`),
    });
}
function validateHintAgainstTrace(request, hint) {
    const errors = [];
    if (hint.puzzleId !== request.puzzleId)
        errors.push("PUZZLE_ID_MISMATCH");
    if (hint.kind === "reveal-value") {
        const step = request.trace.steps.find((candidate) => candidate.index === hint.stepIndex);
        if (!step)
            errors.push("UNKNOWN_DEDUCTION_STEP");
        else {
            if (step.cellId !== hint.targetCellId)
                errors.push("TARGET_CELL_MISMATCH");
            if (step.value !== hint.revealedValue)
                errors.push("REVEALED_VALUE_MISMATCH");
        }
    }
    else if (hint.revealedValue !== undefined) {
        errors.push("VALUE_REVEALED_BEFORE_LEVEL_4");
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
