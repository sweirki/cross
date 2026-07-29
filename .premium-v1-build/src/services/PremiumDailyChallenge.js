"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectDailyChallengeWithPolicy = selectDailyChallengeWithPolicy;
const DailyChallenge_1 = require("./DailyChallenge");
function selectDailyChallengeWithPolicy(library, date, policy) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.valueOf()))
        return (0, DailyChallenge_1.selectDailyChallenge)(library, date, policy.namespace);
    const target = policy.difficultyByWeekday?.[parsed.getUTCDay()];
    if (target === undefined)
        return (0, DailyChallenge_1.selectDailyChallenge)(library, date, policy.namespace);
    const filtered = library.puzzles.filter((puzzle) => puzzle.difficulty === target);
    return (0, DailyChallenge_1.selectDailyChallenge)(filtered.length === 0 ? library : { ...library, id: `${library.id}:${target}`, puzzles: filtered }, date, `${policy.namespace}:${target}`);
}
