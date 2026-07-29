"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizePlayerAttempts = summarizePlayerAttempts;
function dayKey(value) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed))
        throw new Error(`Invalid completion timestamp: ${value}.`);
    return Math.floor(parsed / 86_400_000);
}
function summarizePlayerAttempts(attempts, masteryThreshold = 3) {
    if (!Number.isInteger(masteryThreshold) || masteryThreshold <= 0) {
        throw new Error("Mastery threshold must be a positive integer.");
    }
    const completed = attempts.filter((attempt) => attempt.stars > 0);
    const uniqueDays = [...new Set(completed.map((attempt) => dayKey(attempt.completedAt)))].sort((a, b) => a - b);
    let bestStreak = 0;
    let run = 0;
    let previous = null;
    for (const day of uniqueDays) {
        run = previous !== null && day === previous + 1 ? run + 1 : 1;
        bestStreak = Math.max(bestStreak, run);
        previous = day;
    }
    let currentStreak = 0;
    if (uniqueDays.length > 0) {
        currentStreak = 1;
        for (let index = uniqueDays.length - 1; index > 0; index -= 1) {
            if (uniqueDays[index] !== uniqueDays[index - 1] + 1)
                break;
            currentStreak += 1;
        }
    }
    const conceptCounts = {};
    for (const attempt of completed) {
        if (attempt.concept !== undefined)
            conceptCounts[attempt.concept] = (conceptCounts[attempt.concept] ?? 0) + 1;
    }
    const masteredConcepts = Object.keys(conceptCounts)
        .filter((concept) => (conceptCounts[concept] ?? 0) >= masteryThreshold)
        .sort();
    return {
        puzzlesCompleted: completed.length,
        perfectSolves: completed.filter((attempt) => attempt.stars === 3 && attempt.hintsUsed === 0 && attempt.mistakes === 0).length,
        totalHintsUsed: completed.reduce((sum, attempt) => sum + attempt.hintsUsed, 0),
        averageSolveTimeMs: completed.length === 0
            ? null
            : Math.round(completed.reduce((sum, attempt) => sum + attempt.elapsedMs, 0) / completed.length),
        currentStreak,
        bestStreak,
        masteredConcepts,
        conceptCompletionCounts: conceptCounts,
    };
}
