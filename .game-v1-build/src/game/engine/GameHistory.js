"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameHistory = createGameHistory;
exports.reduceGameHistory = reduceGameHistory;
exports.canUndo = canUndo;
exports.canRedo = canRedo;
const GameSession_1 = require("./GameSession");
function createGameHistory(puzzle, initial) {
    return {
        present: initial ?? (0, GameSession_1.createGameSession)(puzzle),
        past: [],
        future: [],
    };
}
function isNoOp(left, right) {
    return left === right ||
        JSON.stringify(left.placements) === JSON.stringify(right.placements) &&
            left.moves === right.moves &&
            left.hintsUsed === right.hintsUsed &&
            left.completed === right.completed;
}
function applyForward(puzzle, history, action) {
    const next = (0, GameSession_1.reduceGameSession)(puzzle, history.present, action);
    if (isNoOp(history.present, next))
        return history;
    return {
        present: next,
        past: [...history.past, history.present].slice(-100),
        future: [],
    };
}
function reduceGameHistory(puzzle, history, action) {
    switch (action.type) {
        case "undo": {
            const previous = history.past.at(-1);
            if (previous === undefined)
                return history;
            return {
                present: previous,
                past: history.past.slice(0, -1),
                future: [history.present, ...history.future],
            };
        }
        case "redo": {
            const next = history.future[0];
            if (next === undefined)
                return history;
            return {
                present: next,
                past: [...history.past, history.present].slice(-100),
                future: history.future.slice(1),
            };
        }
        case "restore":
            return { present: action.session, past: [], future: [] };
        default:
            return applyForward(puzzle, history, action);
    }
}
function canUndo(history) {
    return history.past.length > 0;
}
function canRedo(history) {
    return history.future.length > 0;
}
