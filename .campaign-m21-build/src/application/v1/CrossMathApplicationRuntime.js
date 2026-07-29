"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationRuntime = exports.CrossMathApplicationRuntime = void 0;
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
function assertDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new Error("Date must use YYYY-MM-DD.");
}
class CrossMathApplicationRuntime {
    create(playerId) {
        if (playerId.trim().length === 0)
            throw new Error("Player ID must not be empty.");
        return {
            schemaVersion: 1,
            playerId,
            puzzleProgress: {},
            lastPuzzleId: null,
            lastLessonId: null,
            dailyChallengeDates: [],
            revision: 0,
        };
    }
    recordPuzzleStarted(state, puzzleId, lessonId) {
        if (puzzleId.trim().length === 0)
            throw new Error("Puzzle ID must not be empty.");
        return {
            ...state,
            lastPuzzleId: puzzleId,
            lastLessonId: lessonId,
            revision: state.revision + 1,
        };
    }
    recordPuzzleCompleted(state, puzzleId, moves, hintsUsed, completedAt) {
        if (!Number.isSafeInteger(moves) || moves < 0)
            throw new Error("Moves are invalid.");
        if (!Number.isSafeInteger(hintsUsed) || hintsUsed < 0)
            throw new Error("Hints are invalid.");
        const prior = state.puzzleProgress[puzzleId];
        const stars = hintsUsed === 0 && moves <= 3 ? 3 : hintsUsed <= 1 ? 2 : 1;
        const bestMoves = prior?.bestMoves === null || prior?.bestMoves === undefined
            ? moves : Math.min(prior.bestMoves, moves);
        return {
            ...state,
            puzzleProgress: {
                ...state.puzzleProgress,
                [puzzleId]: {
                    puzzleId,
                    completed: true,
                    stars: Math.max(prior?.stars ?? 0, stars),
                    bestMoves,
                    completedAt,
                },
            },
            revision: state.revision + 1,
        };
    }
    markDailyComplete(state, date) {
        assertDate(date);
        if (state.dailyChallengeDates.includes(date))
            return state;
        return {
            ...state,
            dailyChallengeDates: [...state.dailyChallengeDates, date].sort(),
            revision: state.revision + 1,
        };
    }
    nextLesson(content, state) {
        const ordered = content.campaign.chapters.flatMap(chapter => chapter.lessonIds.map(id => content.lessons.find(lesson => lesson.id === id)));
        return ordered.find(lesson => !lesson.puzzleIds.every(id => state.puzzleProgress[id]?.completed === true)) ?? null;
    }
    isLessonUnlocked(content, state, lessonId) {
        const ordered = content.campaign.chapters.flatMap(chapter => chapter.lessonIds);
        const index = ordered.indexOf(lessonId);
        if (index < 0)
            return false;
        if (index === 0)
            return true;
        const previous = content.lessons.find(lesson => lesson.id === ordered[index - 1]);
        return previous !== undefined &&
            previous.puzzleIds.every(id => state.puzzleProgress[id]?.completed === true);
    }
    dailyPuzzle(puzzles, date) {
        assertDate(date);
        if (puzzles.length === 0)
            throw new Error("Puzzle library is empty.");
        let hash = 0;
        for (const ch of date)
            hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        return puzzles[hash % puzzles.length];
    }
    practicePuzzle(puzzles, state) {
        if (puzzles.length === 0)
            throw new Error("Puzzle library is empty.");
        return puzzles.find(puzzle => !state.puzzleProgress[puzzle.id]?.completed)
            ?? puzzles[state.revision % puzzles.length];
    }
    serialize(state) {
        return JSON.stringify(canonical(state));
    }
    restore(playerId, serialized) {
        let value;
        try {
            value = JSON.parse(serialized);
        }
        catch {
            throw new Error("Progress is not valid JSON.");
        }
        if (value === null || typeof value !== "object")
            throw new Error("Progress is invalid.");
        const state = value;
        if (state.schemaVersion !== 1 || state.playerId !== playerId)
            throw new Error("Progress is incompatible.");
        if (!Number.isSafeInteger(state.revision) || state.revision < 0)
            throw new Error("Progress revision is invalid.");
        return state;
    }
}
exports.CrossMathApplicationRuntime = CrossMathApplicationRuntime;
exports.applicationRuntime = new CrossMathApplicationRuntime();
