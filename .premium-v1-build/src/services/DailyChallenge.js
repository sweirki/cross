"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectDailyChallenge = selectDailyChallenge;
function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
        throw new Error("Daily challenge date must use YYYY-MM-DD.");
    }
}
function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
function selectDailyChallenge(library, date, namespace = library.id) {
    validDate(date);
    if (library.puzzles.length === 0)
        throw new Error("Cannot select a daily puzzle from an empty library.");
    const sorted = [...library.puzzles].sort((a, b) => a.id.localeCompare(b.id));
    const puzzle = sorted[fnv1a(`${namespace}:${date}`) % sorted.length];
    return { date, puzzleId: puzzle.id, puzzle };
}
