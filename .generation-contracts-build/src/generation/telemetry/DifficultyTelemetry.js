"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTelemetryPrivacy = validateTelemetryPrivacy;
exports.summarizeDifficultyTelemetry = summarizeDifficultyTelemetry;
exports.appendTelemetryEvent = appendTelemetryEvent;
const FORBIDDEN_KEYS = new Set([
    "answer", "answers", "value", "values", "numberBank", "givenCellIds",
    "hiddenCellIds", "email", "name", "deviceId", "advertisingId",
]);
function validateTelemetryPrivacy(value) {
    const forbiddenPaths = [];
    const visit = (node, path) => {
        if (Array.isArray(node)) {
            node.forEach((item, index) => visit(item, `${path}[${index}]`));
            return;
        }
        if (!node || typeof node !== "object")
            return;
        for (const [key, child] of Object.entries(node)) {
            const childPath = path ? `${path}.${key}` : key;
            if (FORBIDDEN_KEYS.has(key))
                forbiddenPaths.push(childPath);
            visit(child, childPath);
        }
    };
    visit(value, "");
    return Object.freeze({ valid: forbiddenPaths.length === 0, forbiddenPaths: Object.freeze(forbiddenPaths.sort()) });
}
function friction(events) {
    const values = {};
    for (const event of events) {
        const step = "deductionStepIndex" in event ? event.deductionStepIndex : undefined;
        if (step === undefined)
            continue;
        let weight = 0;
        if (event.type === "cell-placed" && !event.correct)
            weight = 2;
        if (event.type === "hint-requested")
            weight = event.level;
        if (event.type === "stall")
            weight = Math.max(1, Math.ceil(event.durationMs / 15000));
        if (weight > 0)
            values[String(step)] = (values[String(step)] ?? 0) + weight;
    }
    return Object.freeze(Object.fromEntries(Object.entries(values).sort(([a], [b]) => Number(a) - Number(b))));
}
function summarizeDifficultyTelemetry(session) {
    const events = [...session.events].sort((a, b) => a.atMs - b.atMs || a.type.localeCompare(b.type));
    const start = events.find((event) => event.type === "session-started")?.atMs;
    const terminal = [...events].reverse().find((event) => event.type === "session-completed" || event.type === "session-abandoned");
    const placements = events.filter((event) => event.type === "cell-placed");
    const hints = events.filter((event) => event.type === "hint-requested");
    const stalls = events.filter((event) => event.type === "stall");
    return Object.freeze({
        schemaVersion: 1,
        sessionId: session.sessionId,
        puzzleId: session.puzzleId,
        difficulty: session.difficulty,
        contentFingerprint: session.contentFingerprint,
        startedAtMs: start,
        endedAtMs: terminal?.atMs,
        activeDurationMs: start === undefined || terminal === undefined ? 0 : Math.max(0, terminal.atMs - start),
        completed: terminal?.type === "session-completed",
        abandoned: terminal?.type === "session-abandoned",
        placements: placements.length,
        mistakes: placements.filter((event) => !event.correct).length,
        hints: hints.length,
        maximumHintLevel: hints.reduce((maximum, event) => Math.max(maximum, event.level), 0),
        undos: events.filter((event) => event.type === "undo").length,
        stallCount: stalls.length,
        stalledDurationMs: stalls.reduce((total, event) => total + Math.max(0, event.durationMs), 0),
        frictionByDeductionStep: friction(events),
    });
}
function appendTelemetryEvent(session, event) {
    if (!Number.isFinite(event.atMs) || event.atMs < 0)
        throw new Error("INVALID_EVENT_TIMESTAMP");
    return Object.freeze({
        ...session,
        events: Object.freeze([...session.events, Object.freeze({ ...event })]),
    });
}
