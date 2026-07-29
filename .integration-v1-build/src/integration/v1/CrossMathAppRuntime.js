"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRuntime = exports.CrossMathAppRuntime = void 0;
const runtime_1 = require("../../game/runtime");
const engine_1 = require("../../game/engine");
const ROUTES = ["home", "play", "academy", "studio", "profile"];
const MAX_RECENT = 20;
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
function requirePlayerId(value) {
    if (value.trim().length === 0)
        throw new Error("Player ID must not be empty.");
}
function validateLibrary(library) {
    if (library.schemaVersion !== 1 || library.id.trim().length === 0) {
        throw new Error("Puzzle library is invalid.");
    }
    const ids = new Set();
    for (const puzzle of library.puzzles) {
        if (ids.has(puzzle.id))
            throw new Error(`Duplicate puzzle ID: ${puzzle.id}.`);
        ids.add(puzzle.id);
    }
}
function puzzleById(library, puzzleId) {
    const puzzle = library.puzzles.find((candidate) => candidate.id === puzzleId);
    if (puzzle === undefined)
        throw new Error(`Unknown puzzle: ${puzzleId}.`);
    return puzzle;
}
function currentPuzzle(state, library) {
    if (state.activePuzzleId === null || state.game === null) {
        throw new Error("No puzzle is active.");
    }
    return puzzleById(library, state.activePuzzleId);
}
function recent(ids, puzzleId) {
    return [puzzleId, ...ids.filter((id) => id !== puzzleId)].slice(0, MAX_RECENT);
}
function transition(state, library, events) {
    const view = state.game === null ? null :
        (0, engine_1.buildGameView)(currentPuzzle(state, library), state.game.history.present);
    return { state, view, events };
}
function assertState(state, library) {
    requirePlayerId(state.playerId);
    if (state.schemaVersion !== 1)
        throw new Error("Unsupported app runtime schema.");
    if (!ROUTES.includes(state.route))
        throw new Error("Saved route is invalid.");
    if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
        throw new Error("Saved app revision is invalid.");
    }
    if (state.activePuzzleId === null !== (state.game === null)) {
        throw new Error("Saved active puzzle state is inconsistent.");
    }
    if (state.activePuzzleId !== null) {
        const puzzle = puzzleById(library, state.activePuzzleId);
        if (state.game?.puzzleId !== puzzle.id)
            throw new Error("Saved game does not match its puzzle.");
    }
    const unique = new Set(state.recentPuzzleIds);
    if (unique.size !== state.recentPuzzleIds.length || state.recentPuzzleIds.length > MAX_RECENT) {
        throw new Error("Saved recent puzzle history is invalid.");
    }
    for (const id of state.recentPuzzleIds)
        puzzleById(library, id);
}
class CrossMathAppRuntime {
    game = new runtime_1.CrossMathGameRuntime();
    create(playerId) {
        requirePlayerId(playerId);
        const state = {
            schemaVersion: 1,
            playerId,
            route: "home",
            activePuzzleId: null,
            game: null,
            recentPuzzleIds: [],
            hydrated: false,
            revision: 0,
        };
        return { state, view: null, events: [{ type: "app-created", playerId }] };
    }
    hydrate(playerId, serialized, library) {
        validateLibrary(library);
        const restored = serialized !== null;
        const state = restored
            ? { ...this.restore(playerId, serialized, library), hydrated: true }
            : { ...this.create(playerId).state, hydrated: true };
        return transition(state, library, [{ type: "app-hydrated", restored }]);
    }
    navigate(state, route, library) {
        assertState(state, library);
        if (!ROUTES.includes(route))
            throw new Error("Unknown app route.");
        if (route === "play" && state.game === null)
            throw new Error("Cannot open play without an active puzzle.");
        if (state.route === route)
            return transition(state, library, []);
        const next = { ...state, route, revision: state.revision + 1 };
        return transition(next, library, [{ type: "route-changed", route }]);
    }
    startPuzzle(state, puzzleId, library) {
        assertState(state, library);
        const puzzle = puzzleById(library, puzzleId);
        const resumed = state.activePuzzleId === puzzleId && state.game !== null;
        const game = resumed ? state.game : this.game.create(puzzle).state;
        const next = {
            ...state,
            route: "play",
            activePuzzleId: puzzleId,
            game,
            recentPuzzleIds: recent(state.recentPuzzleIds, puzzleId),
            revision: state.revision + 1,
        };
        return {
            state: next,
            view: (0, engine_1.buildGameView)(puzzle, game.history.present),
            events: [{ type: "puzzle-started", puzzleId, resumed }],
        };
    }
    dispatchGame(state, action, library) {
        assertState(state, library);
        const puzzle = currentPuzzle(state, library);
        const result = this.game.dispatch(puzzle, state.game, action);
        const next = {
            ...state,
            route: "play",
            game: result.state,
            revision: state.revision + 1,
        };
        return {
            state: next,
            view: result.view,
            events: result.events.map((event) => ({ type: "game-event", event })),
        };
    }
    closePuzzle(state, library) {
        assertState(state, library);
        if (state.activePuzzleId === null)
            return transition(state, library, []);
        const puzzleId = state.activePuzzleId;
        const next = {
            ...state,
            route: "home",
            activePuzzleId: null,
            game: null,
            revision: state.revision + 1,
        };
        return { state: next, view: null, events: [{ type: "puzzle-closed", puzzleId }] };
    }
    serialize(state) {
        return JSON.stringify(canonical(state));
    }
    restore(playerId, serialized, library) {
        validateLibrary(library);
        requirePlayerId(playerId);
        let parsed;
        try {
            parsed = JSON.parse(serialized);
        }
        catch {
            throw new Error("Saved app state is not valid JSON.");
        }
        if (parsed === null || typeof parsed !== "object")
            throw new Error("Saved app state is invalid.");
        const input = parsed;
        if (input.playerId !== playerId)
            throw new Error("Saved app state belongs to another player.");
        assertState(input, library);
        let game = input.game;
        if (input.activePuzzleId !== null && game !== null) {
            const puzzle = puzzleById(library, input.activePuzzleId);
            game = this.game.restore(puzzle, this.game.serialize(game)).state;
        }
        return { ...input, game };
    }
}
exports.CrossMathAppRuntime = CrossMathAppRuntime;
exports.appRuntime = new CrossMathAppRuntime();
