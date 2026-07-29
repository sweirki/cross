"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
const trace = Object.freeze({
    solved: true,
    unresolvedCellIds: Object.freeze([]),
    metrics: Object.freeze({ deductionDepth: 3 }),
    steps: Object.freeze([
        Object.freeze({
            index: 0,
            rule: "equation-two-known",
            cellId: "c",
            value: 7,
            equationId: "eq-1",
            prerequisiteCellIds: Object.freeze(["a", "b"]),
        }),
        Object.freeze({
            index: 1,
            rule: "equation-two-known",
            cellId: "d",
            value: 9,
            equationId: "eq-2",
            prerequisiteCellIds: Object.freeze(["c", "x"]),
        }),
        Object.freeze({
            index: 2,
            rule: "number-bank-last-value",
            cellId: "e",
            value: 4,
            prerequisiteCellIds: Object.freeze([]),
        }),
    ]),
});
for (const level of [1, 2, 3, 4]) {
    const hint = (0, generation_1.createHint)({
        puzzleId: "p-1",
        trace,
        solvedCellIds: ["a", "b", "x"],
        requestedLevel: level,
    });
    check(hint.level === level, `level ${level}`);
    check(hint.targetCellId === "c", "first available target");
    check(hint.stepIndex === 0, "step index");
    check(hint.equationId === "eq-1", "equation id");
    check(hint.prerequisiteCellIds.join(",") === "a,b", "prerequisites");
    check((level === 4) === (hint.revealedValue === 7), "reveal only at level four");
    check((0, generation_1.validateHintAgainstTrace)({
        puzzleId: "p-1",
        trace,
        solvedCellIds: ["a", "b", "x"],
        requestedLevel: level,
    }, hint).valid, "hint validates");
}
const deterministicA = (0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: ["a", "b", "x"], requestedLevel: 2 });
const deterministicB = (0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: ["x", "b", "a"], requestedLevel: 2 });
check(deterministicA.deterministicId === deterministicB.deterministicId, "hint deterministic");
check(deterministicA.kind === "explain-deduction", "level two kind");
check((0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: ["a", "b", "c", "d", "e", "x"] }).kind === "puzzle-complete", "complete hint");
check((0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: [] }).kind === "narrow-candidates" || (0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: [] }).kind === "focus-equation", "fallback step is supported");
const tampered = { ...(0, generation_1.createHint)({ puzzleId: "p-1", trace, solvedCellIds: ["a", "b"], requestedLevel: 4 }), revealedValue: 999 };
check(!(0, generation_1.validateHintAgainstTrace)({ puzzleId: "p-1", trace, solvedCellIds: ["a", "b"], requestedLevel: 4 }, tampered).valid, "tamper rejected");
const hintSession = new generation_1.HintSession("p-1", trace);
check(hintSession.next(["a", "b", "x"]).level === 1, "session level one");
check(hintSession.next(["a", "b", "x"]).level === 2, "session level two");
check(hintSession.next(["a", "b", "x"]).level === 3, "session level three");
check(hintSession.next(["a", "b", "x"]).level === 4, "session level four");
check(hintSession.next(["a", "b", "x"]).level === 4, "session caps level");
hintSession.resetStep(0);
check(hintSession.next(["a", "b", "x"]).level === 1, "session reset");
const session = {
    schemaVersion: 1,
    sessionId: "session-1",
    puzzleId: "p-1",
    difficulty: "hard",
    contentFingerprint: "fp-1",
    events: [
        { type: "session-started", atMs: 1000 },
        { type: "cell-placed", atMs: 2000, correct: false, deductionStepIndex: 0 },
        { type: "hint-requested", atMs: 3000, level: 2, deductionStepIndex: 0 },
        { type: "stall", atMs: 4000, durationMs: 31000, deductionStepIndex: 1 },
        { type: "undo", atMs: 5000 },
        { type: "cell-placed", atMs: 6000, correct: true, deductionStepIndex: 1 },
        { type: "session-completed", atMs: 10000 },
    ],
};
const summary = (0, generation_1.summarizeDifficultyTelemetry)(session);
check(summary.completed, "completed");
check(!summary.abandoned, "not abandoned");
check(summary.activeDurationMs === 9000, "duration");
check(summary.placements === 2, "placements");
check(summary.mistakes === 1, "mistakes");
check(summary.hints === 1, "hints");
check(summary.maximumHintLevel === 2, "max hint");
check(summary.undos === 1, "undos");
check(summary.stallCount === 1, "stall count");
check(summary.stalledDurationMs === 31000, "stall duration");
check(summary.frictionByDeductionStep["0"] === 4, "step zero friction");
check(summary.frictionByDeductionStep["1"] === 3, "step one friction");
check((0, generation_1.validateTelemetryPrivacy)(session).valid, "session privacy");
const unsafe = (0, generation_1.validateTelemetryPrivacy)({ type: "unsafe", answer: 7, nested: { email: "x@y.test" } });
check(!unsafe.valid, "unsafe rejected");
check(unsafe.forbiddenPaths.includes("answer"), "answer path");
check(unsafe.forbiddenPaths.includes("nested.email"), "email path");
const buffer = new generation_1.TelemetryBuffer({
    schemaVersion: 1,
    sessionId: "buffer",
    puzzleId: "p-2",
    difficulty: "easy",
    contentFingerprint: "fp-2",
    events: [],
});
buffer.record({ type: "session-started", atMs: 0 });
buffer.record({ type: "hint-requested", atMs: 1, level: 1 });
buffer.record({ type: "session-abandoned", atMs: 5 });
check(buffer.snapshot().events.length === 3, "buffer records");
check(buffer.summary().abandoned, "buffer abandoned");
check(buffer.summary().activeDurationMs === 5, "buffer duration");
const drained = buffer.drainSummary();
check(drained.hints === 1, "drain summary");
check(buffer.snapshot().events.length === 0, "drain clears");
let timestampRejected = false;
try {
    buffer.record({ type: "undo", atMs: -1 });
}
catch {
    timestampRejected = true;
}
check(timestampRejected, "invalid timestamp rejected");
console.log(`Hint AI and telemetry: ${assertions}/${assertions} assertions passed.`);
