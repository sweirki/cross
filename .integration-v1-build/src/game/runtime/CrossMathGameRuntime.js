"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRuntime = exports.CrossMathGameRuntime = void 0;
const engine_1 = require("../engine");
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value !== null && typeof value === "object") {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            result[key] = canonical(value[key]);
        }
        return result;
    }
    return value;
}
function assertState(puzzle, state) {
    if (state.schemaVersion !== 1 || state.puzzleId !== puzzle.id) {
        throw new Error("Runtime state is incompatible with this puzzle.");
    }
    if (!Number.isInteger(state.clock.elapsedMs) || state.clock.elapsedMs < 0) {
        throw new Error("Runtime clock is invalid.");
    }
    if (!Number.isInteger(state.mistakes) || state.mistakes < 0 ||
        !Number.isInteger(state.revision) || state.revision < 0) {
        throw new Error("Runtime counters are invalid.");
    }
}
function completedEquationIds(before, after) {
    const previous = new Map(before.map((item) => [item.equationId, item.state]));
    return after
        .filter((item) => item.state === "correct" && previous.get(item.equationId) !== "correct")
        .map((item) => item.equationId)
        .sort();
}
function incorrectEquationIds(feedback) {
    return feedback.filter((item) => item.state === "incorrect").map((item) => item.equationId).sort();
}
function isHistoryAction(action) {
    return action.type === "place" || action.type === "remove" || action.type === "hint" ||
        action.type === "reset" || action.type === "undo" || action.type === "redo" ||
        action.type === "restore";
}
function isBoardMutation(action) {
    return action.type === "place" || action.type === "remove" ||
        action.type === "hint" || action.type === "reset";
}
function transition(puzzle, state, events) {
    return { state, view: (0, engine_1.buildGameView)(puzzle, state.history.present), events };
}
class CrossMathGameRuntime {
    create(puzzle) {
        const history = (0, engine_1.createGameHistory)(puzzle);
        const state = {
            schemaVersion: 1,
            puzzleId: puzzle.id,
            history,
            clock: { elapsedMs: 0, paused: false },
            selectedTileId: null,
            mistakes: 0,
            status: history.present.completed ? "completed" : "playing",
            revision: 0,
        };
        return transition(puzzle, state, []);
    }
    dispatch(puzzle, state, action) {
        assertState(puzzle, state);
        if (action.type === "advance-time") {
            if (!Number.isInteger(action.milliseconds) || action.milliseconds < 0) {
                throw new Error("Time advancement must be a non-negative integer.");
            }
            if (state.clock.paused || state.status === "completed" || action.milliseconds === 0) {
                return transition(puzzle, state, []);
            }
            return transition(puzzle, {
                ...state,
                clock: { ...state.clock, elapsedMs: state.clock.elapsedMs + action.milliseconds },
                revision: state.revision + 1,
            }, []);
        }
        if (action.type === "pause" || action.type === "resume") {
            const paused = action.type === "pause";
            if (state.clock.paused === paused)
                return transition(puzzle, state, []);
            return transition(puzzle, {
                ...state,
                clock: { ...state.clock, paused },
                revision: state.revision + 1,
            }, []);
        }
        if (action.type === "select-tile") {
            if (action.tileId !== null && !puzzle.numberBank.some((tile) => tile.id === action.tileId)) {
                throw new Error(`Unknown number-bank tile: ${action.tileId}.`);
            }
            if (state.selectedTileId === action.tileId)
                return transition(puzzle, state, []);
            const next = { ...state, selectedTileId: action.tileId, revision: state.revision + 1 };
            return transition(puzzle, next, [{ type: "tile-selected", tileId: action.tileId }]);
        }
        if (action.type === "place-selected") {
            if (state.selectedTileId === null)
                throw new Error("No tile is selected.");
            return this.dispatch(puzzle, state, {
                type: "place",
                cellId: action.cellId,
                tileId: state.selectedTileId,
            });
        }
        if (!isHistoryAction(action))
            return transition(puzzle, state, []);
        const beforeView = (0, engine_1.buildGameView)(puzzle, state.history.present);
        const history = (0, engine_1.reduceGameHistory)(puzzle, state.history, action);
        if (history === state.history)
            return transition(puzzle, state, []);
        const afterView = (0, engine_1.buildGameView)(puzzle, history.present);
        const events = [];
        let mistakes = state.mistakes;
        let selectedTileId = state.selectedTileId;
        if (action.type === "place") {
            events.push({ type: "tile-placed", cellId: action.cellId, tileId: action.tileId });
            selectedTileId = null;
        }
        else if (action.type === "remove") {
            events.push({ type: "tile-removed", cellId: action.cellId });
        }
        else if (action.type === "hint") {
            events.push({ type: "hint-used" });
            selectedTileId = null;
        }
        else if (action.type === "reset") {
            events.push({ type: "session-reset" });
            selectedTileId = null;
            mistakes = 0;
        }
        if (isBoardMutation(action) && action.type !== "reset") {
            const wrong = incorrectEquationIds(afterView.equations);
            if (wrong.length > 0) {
                mistakes += 1;
                events.push({ type: "mistake-recorded", equationIds: wrong });
            }
        }
        for (const equationId of completedEquationIds(beforeView.equations, afterView.equations)) {
            events.push({ type: "equation-completed", equationId });
        }
        const justCompleted = !state.history.present.completed && history.present.completed;
        if (justCompleted) {
            events.push({
                type: "puzzle-completed",
                moves: history.present.moves,
                hintsUsed: history.present.hintsUsed,
                elapsedMs: state.clock.elapsedMs,
            });
        }
        const next = {
            ...state,
            history,
            selectedTileId,
            mistakes,
            status: history.present.completed ? "completed" : "playing",
            clock: justCompleted ? { ...state.clock, paused: true } : state.clock,
            revision: state.revision + 1,
        };
        return transition(puzzle, next, events);
    }
    serialize(state) {
        const persisted = {
            schemaVersion: 1,
            puzzleId: state.puzzleId,
            session: state.history.present,
            clock: state.clock,
            selectedTileId: state.selectedTileId,
            mistakes: state.mistakes,
            revision: state.revision,
        };
        return JSON.stringify(canonical(persisted));
    }
    restore(puzzle, serialized) {
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Saved runtime state is not valid JSON.");
        }
        if (parsed === null || typeof parsed !== "object")
            throw new Error("Saved runtime state is invalid.");
        const input = parsed;
        if (input.schemaVersion !== 1 || input.puzzleId !== puzzle.id || input.session === undefined ||
            input.clock === undefined || typeof input.mistakes !== "number" || typeof input.revision !== "number") {
            throw new Error("Saved runtime state is incompatible.");
        }
        const session = (0, engine_1.restoreGameSession)(puzzle, input.session);
        if (!Number.isInteger(input.clock.elapsedMs) || input.clock.elapsedMs < 0 ||
            typeof input.clock.paused !== "boolean" ||
            !Number.isInteger(input.mistakes) || input.mistakes < 0 ||
            !Number.isInteger(input.revision) || input.revision < 0) {
            throw new Error("Saved runtime state contains invalid counters.");
        }
        if (input.selectedTileId !== null &&
            !puzzle.numberBank.some((tile) => tile.id === input.selectedTileId)) {
            throw new Error("Saved runtime state contains an unknown selected tile.");
        }
        const state = {
            schemaVersion: 1,
            puzzleId: puzzle.id,
            history: (0, engine_1.createGameHistory)(puzzle, session),
            clock: input.clock,
            selectedTileId: input.selectedTileId ?? null,
            mistakes: input.mistakes,
            status: session.completed ? "completed" : "playing",
            revision: input.revision,
        };
        assertState(puzzle, state);
        return { state, migrated: false };
    }
}
exports.CrossMathGameRuntime = CrossMathGameRuntime;
exports.gameRuntime = new CrossMathGameRuntime();
