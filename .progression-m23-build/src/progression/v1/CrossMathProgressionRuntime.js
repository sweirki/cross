"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressionRuntime = exports.CrossMathProgressionRuntime = exports.ACHIEVEMENTS = void 0;
const EMPTY_STATS = {
    puzzlesCompleted: 0,
    perfectSolves: 0,
    hintFreeSolves: 0,
    dailyChallengesCompleted: 0,
    lessonsCompleted: 0,
    campaignsCompleted: 0,
    totalStars: 0,
    totalMoves: 0,
    totalHints: 0,
    totalMistakes: 0,
    totalPlayTimeMs: 0,
    fastestSolveMs: null,
};
exports.ACHIEVEMENTS = [
    { id: "first-solve", name: "First Steps", description: "Complete your first puzzle.", xpReward: 25, badge: "spark" },
    { id: "five-solves", name: "Puzzle Apprentice", description: "Complete five puzzles.", xpReward: 75, badge: "five" },
    { id: "twenty-five-solves", name: "CrossMath Explorer", description: "Complete twenty-five puzzles.", xpReward: 250, badge: "compass" },
    { id: "perfect-solve", name: "Perfect Solver", description: "Earn three stars on a puzzle.", xpReward: 50, badge: "crown" },
    { id: "hint-free", name: "Independent Thinker", description: "Complete a puzzle without a hint.", xpReward: 35, badge: "lightbulb" },
    { id: "fast-solve", name: "Quick Thinker", description: "Finish a puzzle in under one minute.", xpReward: 50, badge: "bolt" },
    { id: "daily-streak-3", name: "Three-Day Rhythm", description: "Play on three consecutive days.", xpReward: 60, badge: "flame-3" },
    { id: "daily-streak-7", name: "Weekly Streak", description: "Play on seven consecutive days.", xpReward: 150, badge: "flame-7" },
    { id: "star-collector-25", name: "Star Collector", description: "Earn twenty-five stars.", xpReward: 100, badge: "star-25" },
    { id: "star-collector-100", name: "Galaxy Builder", description: "Earn one hundred stars.", xpReward: 400, badge: "star-100" },
];
function assertNonNegativeInteger(value, name) {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new Error(`${name} must be a non-negative integer.`);
}
function assertDateTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()))
        throw new Error("Completion date is invalid.");
}
function dateKey(iso) {
    return iso.slice(0, 10);
}
function dayNumber(date) {
    const parts = date.split("-").map(Number);
    return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86_400_000);
}
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value !== null && typeof value === "object") {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            out[key] = canonical(value[key]);
        }
        return out;
    }
    return value;
}
function rewardId(revision, index) {
    return `reward-${revision}-${index}`;
}
class CrossMathProgressionRuntime {
    create(playerId) {
        if (playerId.trim().length === 0)
            throw new Error("Player ID must not be empty.");
        return {
            schemaVersion: 1,
            playerId,
            totalXp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            activityDates: [],
            achievements: [],
            stats: EMPTY_STATS,
            rewardQueue: [],
            processedCompletionIds: [],
            revision: 0,
        };
    }
    xpForLevel(level) {
        if (!Number.isSafeInteger(level) || level < 1)
            throw new Error("Level must be a positive integer.");
        return Math.floor(50 * (level - 1) * level);
    }
    levelForXp(xp) {
        assertNonNegativeInteger(xp, "XP");
        let level = 1;
        while (this.xpForLevel(level + 1) <= xp)
            level += 1;
        return level;
    }
    levelProgress(state) {
        const start = this.xpForLevel(state.level);
        const end = this.xpForLevel(state.level + 1);
        const current = state.totalXp - start;
        const required = end - start;
        return { current, required, percent: Math.max(0, Math.min(100, Math.round(current / required * 100))) };
    }
    baseXp(input) {
        this.validateInput(input);
        let xp = 50 + input.stars * 25;
        if (input.hintsUsed === 0)
            xp += 15;
        if (input.mistakes === 0)
            xp += 15;
        if (input.elapsedMs <= 60_000)
            xp += 20;
        if (input.mode === "daily")
            xp += 30;
        if (input.lessonCompleted === true)
            xp += 40;
        if (input.campaignCompleted === true)
            xp += 150;
        if (input.masteryImproved === true)
            xp += 25;
        return xp;
    }
    completionId(input) {
        return `${input.puzzleId}|${input.completedAt}|${input.mode}`;
    }
    recordCompletion(state, input) {
        this.validateInput(input);
        const completionId = this.completionId(input);
        if (state.processedCompletionIds.includes(completionId)) {
            return { state, xpEarned: 0, rewards: [], newlyUnlocked: [] };
        }
        const activityDate = dateKey(input.completedAt);
        const activityDates = state.activityDates.includes(activityDate)
            ? state.activityDates
            : [...state.activityDates, activityDate].sort();
        let currentStreak = state.currentStreak;
        if (state.lastActiveDate === null)
            currentStreak = 1;
        else if (activityDate === state.lastActiveDate)
            currentStreak = state.currentStreak;
        else {
            const gap = dayNumber(activityDate) - dayNumber(state.lastActiveDate);
            currentStreak = gap === 1 ? state.currentStreak + 1 : gap > 1 ? 1 : state.currentStreak;
        }
        const lastActiveDate = state.lastActiveDate === null || activityDate > state.lastActiveDate
            ? activityDate : state.lastActiveDate;
        const longestStreak = Math.max(state.longestStreak, currentStreak);
        const stats = {
            puzzlesCompleted: state.stats.puzzlesCompleted + 1,
            perfectSolves: state.stats.perfectSolves + (input.stars === 3 ? 1 : 0),
            hintFreeSolves: state.stats.hintFreeSolves + (input.hintsUsed === 0 ? 1 : 0),
            dailyChallengesCompleted: state.stats.dailyChallengesCompleted + (input.mode === "daily" ? 1 : 0),
            lessonsCompleted: state.stats.lessonsCompleted + (input.lessonCompleted === true ? 1 : 0),
            campaignsCompleted: state.stats.campaignsCompleted + (input.campaignCompleted === true ? 1 : 0),
            totalStars: state.stats.totalStars + input.stars,
            totalMoves: state.stats.totalMoves + input.moves,
            totalHints: state.stats.totalHints + input.hintsUsed,
            totalMistakes: state.stats.totalMistakes + input.mistakes,
            totalPlayTimeMs: state.stats.totalPlayTimeMs + input.elapsedMs,
            fastestSolveMs: state.stats.fastestSolveMs === null
                ? input.elapsedMs : Math.min(state.stats.fastestSolveMs, input.elapsedMs),
        };
        const already = new Set(state.achievements.map(item => item.id));
        const candidates = this.achievementCandidates(stats, currentStreak, input)
            .filter(id => !already.has(id));
        const unlockedAt = input.completedAt;
        const definitions = candidates.map(id => this.achievement(id));
        const baseXp = this.baseXp(input);
        const achievementXp = definitions.reduce((sum, item) => sum + item.xpReward, 0);
        const xpEarned = baseXp + achievementXp;
        const totalXp = state.totalXp + xpEarned;
        const level = this.levelForXp(totalXp);
        const rewards = [];
        rewards.push({
            id: rewardId(state.revision + 1, rewards.length),
            kind: "xp",
            title: `+${baseXp} XP`,
            detail: "Puzzle completion reward",
            amount: baseXp,
        });
        for (let reached = state.level + 1; reached <= level; reached += 1) {
            rewards.push({
                id: rewardId(state.revision + 1, rewards.length),
                kind: "level-up",
                title: `Level ${reached}`,
                detail: "New level reached",
                level: reached,
            });
        }
        for (const definition of definitions) {
            rewards.push({
                id: rewardId(state.revision + 1, rewards.length),
                kind: "achievement",
                title: definition.name,
                detail: definition.description,
                achievementId: definition.id,
            });
            rewards.push({
                id: rewardId(state.revision + 1, rewards.length),
                kind: "badge",
                title: "New badge",
                detail: definition.badge,
                achievementId: definition.id,
            });
            if (definition.xpReward > 0) {
                rewards.push({
                    id: rewardId(state.revision + 1, rewards.length),
                    kind: "xp",
                    title: `+${definition.xpReward} XP`,
                    detail: `${definition.name} achievement`,
                    amount: definition.xpReward,
                });
            }
        }
        if (currentStreak > state.currentStreak && currentStreak > 1) {
            rewards.push({
                id: rewardId(state.revision + 1, rewards.length),
                kind: "streak",
                title: `${currentStreak}-day streak`,
                detail: "Keep the momentum going",
            });
        }
        const next = {
            ...state,
            totalXp,
            level,
            currentStreak,
            longestStreak,
            lastActiveDate,
            activityDates,
            achievements: [
                ...state.achievements,
                ...candidates.map(id => ({ id, unlockedAt })),
            ],
            stats,
            rewardQueue: [...state.rewardQueue, ...rewards],
            processedCompletionIds: [...state.processedCompletionIds, completionId],
            revision: state.revision + 1,
        };
        return { state: next, xpEarned, rewards, newlyUnlocked: candidates };
    }
    dismissReward(state, rewardIdValue) {
        if (state.rewardQueue.length === 0)
            return state;
        const id = rewardIdValue ?? state.rewardQueue[0].id;
        if (!state.rewardQueue.some(item => item.id === id))
            return state;
        return {
            ...state,
            rewardQueue: state.rewardQueue.filter(item => item.id !== id),
            revision: state.revision + 1,
        };
    }
    clearRewards(state) {
        if (state.rewardQueue.length === 0)
            return state;
        return { ...state, rewardQueue: [], revision: state.revision + 1 };
    }
    averageSolveTimeMs(state) {
        return state.stats.puzzlesCompleted === 0
            ? null
            : Math.round(state.stats.totalPlayTimeMs / state.stats.puzzlesCompleted);
    }
    achievement(id) {
        const found = exports.ACHIEVEMENTS.find(item => item.id === id);
        if (found === undefined)
            throw new Error(`Unknown achievement: ${id}`);
        return found;
    }
    serialize(state) {
        return JSON.stringify(canonical(state));
    }
    restore(playerId, serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Progression data is not valid JSON.");
        }
        if (parsed === null || typeof parsed !== "object")
            throw new Error("Progression data is invalid.");
        const state = parsed;
        if (state.schemaVersion !== 1 || state.playerId !== playerId)
            throw new Error("Progression data is incompatible.");
        assertNonNegativeInteger(state.totalXp, "Total XP");
        assertNonNegativeInteger(state.revision, "Revision");
        if (state.level !== this.levelForXp(state.totalXp))
            throw new Error("Progression level is inconsistent.");
        if (!Array.isArray(state.achievements) || !Array.isArray(state.rewardQueue))
            throw new Error("Progression arrays are invalid.");
        return state;
    }
    validateInput(input) {
        if (input.puzzleId.trim().length === 0)
            throw new Error("Puzzle ID must not be empty.");
        assertDateTime(input.completedAt);
        if (![1, 2, 3].includes(input.stars))
            throw new Error("Stars must be between one and three.");
        assertNonNegativeInteger(input.moves, "Moves");
        assertNonNegativeInteger(input.hintsUsed, "Hints");
        assertNonNegativeInteger(input.mistakes, "Mistakes");
        assertNonNegativeInteger(input.elapsedMs, "Elapsed time");
    }
    achievementCandidates(stats, streak, input) {
        const ids = [];
        if (stats.puzzlesCompleted >= 1)
            ids.push("first-solve");
        if (stats.puzzlesCompleted >= 5)
            ids.push("five-solves");
        if (stats.puzzlesCompleted >= 25)
            ids.push("twenty-five-solves");
        if (input.stars === 3)
            ids.push("perfect-solve");
        if (input.hintsUsed === 0)
            ids.push("hint-free");
        if (input.elapsedMs <= 60_000)
            ids.push("fast-solve");
        if (streak >= 3)
            ids.push("daily-streak-3");
        if (streak >= 7)
            ids.push("daily-streak-7");
        if (stats.totalStars >= 25)
            ids.push("star-collector-25");
        if (stats.totalStars >= 100)
            ids.push("star-collector-100");
        return ids;
    }
}
exports.CrossMathProgressionRuntime = CrossMathProgressionRuntime;
exports.progressionRuntime = new CrossMathProgressionRuntime();
