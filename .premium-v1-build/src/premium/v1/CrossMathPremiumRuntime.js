"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossMathPremiumRuntime = void 0;
const runtime_1 = require("../../game/runtime");
const AdaptiveHintRuntime_1 = require("../../services/AdaptiveHintRuntime");
const AccessibilityRuntime_1 = require("../../services/AccessibilityRuntime");
const GameplayFeedbackRuntime_1 = require("../../services/GameplayFeedbackRuntime");
const PracticeGenerator_1 = require("../../services/PracticeGenerator");
const PremiumDailyChallenge_1 = require("../../services/PremiumDailyChallenge");
const PlayerProfileStatistics_1 = require("../../services/PlayerProfileStatistics");
function requireString(value, label) {
    if (typeof value !== "string" || value.trim() === "")
        throw new Error(`${label} must be a non-empty string.`);
}
function requireInteger(value, label, minimum = 0) {
    if (!Number.isInteger(value) || Number(value) < minimum)
        throw new Error(`${label} must be an integer >= ${minimum}.`);
}
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value !== null && typeof value === "object") {
        const output = {};
        for (const key of Object.keys(value).sort()) {
            output[key] = canonical(value[key]);
        }
        return output;
    }
    return value;
}
function validateDate(value) {
    requireString(value, "Date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new Error("Date must use YYYY-MM-DD.");
    }
}
function validateProfile(profile) {
    if (profile.schemaVersion !== 1)
        throw new Error("Unsupported premium profile schema.");
    requireString(profile.playerId, "Player id");
    requireInteger(profile.revision, "Profile revision");
    (0, AccessibilityRuntime_1.normalizeAccessibilityPreferences)(profile.accessibility);
    const dates = new Set();
    for (const date of profile.completedDailyDates) {
        validateDate(date);
        if (dates.has(date))
            throw new Error(`Duplicate daily completion: ${date}.`);
        dates.add(date);
    }
    const attempts = new Set();
    for (const attempt of profile.attempts) {
        requireString(attempt.puzzleId, "Attempt puzzle id");
        requireInteger(attempt.elapsedMs, "Attempt elapsed milliseconds");
        requireInteger(attempt.hintsUsed, "Attempt hints");
        requireInteger(attempt.mistakes, "Attempt mistakes");
        requireInteger(attempt.stars, "Attempt stars");
        if (attempt.stars > 3 || Number.isNaN(Date.parse(attempt.completedAt)))
            throw new Error("Invalid attempt.");
        const key = `${attempt.puzzleId}|${attempt.completedAt}`;
        if (attempts.has(key))
            throw new Error("Duplicate attempt.");
        attempts.add(key);
    }
}
function validateSession(puzzle, session) {
    if (session.schemaVersion !== 1 || session.puzzleId !== puzzle.id)
        throw new Error("Premium session is incompatible with this puzzle.");
    requireString(session.playerId, "Player id");
    requireInteger(session.startedAt, "Session start timestamp");
    requireInteger(session.revision, "Session revision");
    requireInteger(session.hintLevel, "Hint level");
    if (session.hintLevel > 5)
        throw new Error("Hint level must be <= 5.");
}
function starsFor(session) {
    if (!session.runtime.history.present.completed)
        return 0;
    if (session.runtime.mistakes === 0 && session.runtime.history.present.hintsUsed === 0)
        return 3;
    if (session.runtime.mistakes <= 1 && session.runtime.history.present.hintsUsed <= 1)
        return 2;
    return 1;
}
class CrossMathPremiumRuntime {
    game = new runtime_1.CrossMathGameRuntime();
    createProfile(playerId, accessibility = {}) {
        requireString(playerId, "Player id");
        return {
            schemaVersion: 1,
            playerId,
            attempts: [],
            accessibility: (0, AccessibilityRuntime_1.normalizeAccessibilityPreferences)(accessibility),
            completedDailyDates: [],
            revision: 0,
        };
    }
    startSession(profile, puzzle, startedAt) {
        validateProfile(profile);
        requireInteger(startedAt, "Session start timestamp");
        const runtime = this.game.create(puzzle);
        const session = {
            schemaVersion: 1, playerId: profile.playerId, puzzleId: puzzle.id,
            runtime: runtime.state, hintLevel: 0, startedAt, revision: 0,
        };
        return { session, runtime, events: [{ type: "session-started", puzzleId: puzzle.id }] };
    }
    dispatch(puzzle, session, action) {
        validateSession(puzzle, session);
        const previous = { state: session.runtime, view: this.game.dispatch(puzzle, session.runtime, { type: "advance-time", milliseconds: 0 }).view, events: [] };
        const runtime = this.game.dispatch(puzzle, session.runtime, action);
        const preferences = AccessibilityRuntime_1.DEFAULT_ACCESSIBILITY_PREFERENCES;
        const feedback = (0, GameplayFeedbackRuntime_1.deriveGameplayFeedback)(previous.view, runtime.view, preferences);
        const events = feedback.map((item) => ({ type: "feedback", feedback: item }));
        return {
            session: { ...session, runtime: runtime.state, revision: session.revision + (runtime.state === session.runtime ? 0 : 1) },
            runtime,
            events,
        };
    }
    requestHint(puzzle, session, level) {
        validateSession(puzzle, session);
        const selected = level ?? Math.min(5, session.hintLevel + 1);
        if (!Number.isInteger(selected) || selected < 1 || selected > 5)
            throw new Error("Hint level must be between 1 and 5.");
        const hint = (0, AdaptiveHintRuntime_1.buildAdaptiveHint)(puzzle, session.runtime.history.present, selected);
        if (hint === null)
            return { session, hint: null, runtimeEvents: [], events: [] };
        const runtime = this.game.dispatch(puzzle, session.runtime, { type: "hint" });
        const next = {
            ...session, runtime: runtime.state, hintLevel: Math.max(session.hintLevel, selected),
            revision: session.revision + 1,
        };
        return {
            session: next, hint, runtimeEvents: runtime.events,
            events: [{ type: "hint-presented", level: selected, kind: hint.kind }],
        };
    }
    completeAttempt(profile, session, input) {
        validateProfile(profile);
        if (profile.playerId !== session.playerId)
            throw new Error("Session belongs to another player.");
        if (!session.runtime.history.present.completed)
            throw new Error("Cannot record an incomplete puzzle.");
        if (Number.isNaN(Date.parse(input.completedAt)))
            throw new Error("Invalid completion timestamp.");
        const attempt = {
            puzzleId: session.puzzleId, concept: input.concept, completedAt: input.completedAt,
            elapsedMs: session.runtime.clock.elapsedMs, hintsUsed: session.runtime.history.present.hintsUsed,
            mistakes: session.runtime.mistakes, stars: starsFor(session),
        };
        if (profile.attempts.some((item) => item.puzzleId === attempt.puzzleId && item.completedAt === attempt.completedAt)) {
            throw new Error("Duplicate attempt.");
        }
        const next = { ...profile, attempts: [...profile.attempts, attempt], revision: profile.revision + 1 };
        return { profile: next, events: [{ type: "attempt-recorded", puzzleId: attempt.puzzleId, stars: attempt.stars }] };
    }
    buildPractice(content, library, concept, count, seed, excludePuzzleIds) {
        requireString(seed, "Practice seed");
        return (0, PracticeGenerator_1.buildPracticeSet)(content, library, { concept, count, seed, excludePuzzleIds });
    }
    selectDaily(library, date, policy) {
        validateDate(date);
        requireString(policy.namespace, "Daily namespace");
        const result = (0, PremiumDailyChallenge_1.selectDailyChallengeWithPolicy)(library, date, policy);
        return { date, puzzle: result.puzzle };
    }
    markDailyComplete(profile, date) {
        validateProfile(profile);
        validateDate(date);
        if (profile.completedDailyDates.includes(date))
            return { profile, events: [] };
        const dates = [...profile.completedDailyDates, date].sort();
        return {
            profile: { ...profile, completedDailyDates: dates, revision: profile.revision + 1 },
            events: [{ type: "daily-completed", date }],
        };
    }
    statistics(profile, masteryThreshold = 3) {
        validateProfile(profile);
        return (0, PlayerProfileStatistics_1.summarizePlayerAttempts)(profile.attempts, masteryThreshold);
    }
    updateAccessibility(profile, value) {
        validateProfile(profile);
        const accessibility = (0, AccessibilityRuntime_1.normalizeAccessibilityPreferences)({ ...profile.accessibility, ...value });
        if (JSON.stringify(accessibility) === JSON.stringify(profile.accessibility))
            return { profile, events: [] };
        return {
            profile: { ...profile, accessibility, revision: profile.revision + 1 },
            events: [{ type: "accessibility-updated" }],
        };
    }
    serializeProfile(profile) { validateProfile(profile); return JSON.stringify(canonical(profile)); }
    restoreProfile(serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Premium profile save is not valid JSON.");
        }
        validateProfile(parsed);
        return canonical(parsed);
    }
    serializeSession(session) { return JSON.stringify(canonical(session)); }
    restoreSession(puzzle, serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Premium session save is not valid JSON.");
        }
        const session = parsed;
        validateSession(puzzle, session);
        this.game.restore(puzzle, this.game.serialize(session.runtime));
        return canonical(session);
    }
    replay(puzzle, profile, actions, startedAt) {
        let current = this.startSession(profile, puzzle, startedAt);
        for (const action of actions)
            current = this.dispatch(puzzle, current.session, action);
        return current;
    }
}
exports.CrossMathPremiumRuntime = CrossMathPremiumRuntime;
