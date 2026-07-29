import type {
  GameAction,
  GameHistory,
  GameHistoryAction,
  GameSession,
} from "../../types/Game";
import type { Puzzle } from "../../types/Puzzle";
import { createGameSession, reduceGameSession } from "./GameSession";

export function createGameHistory(
  puzzle: Puzzle,
  initial?: GameSession,
): GameHistory {
  return {
    present: initial ?? createGameSession(puzzle),
    past: [],
    future: [],
  };
}

function isNoOp(left: GameSession, right: GameSession): boolean {
  return left === right ||
    JSON.stringify(left.placements) === JSON.stringify(right.placements) &&
    left.moves === right.moves &&
    left.hintsUsed === right.hintsUsed &&
    left.completed === right.completed;
}

function applyForward(
  puzzle: Puzzle,
  history: GameHistory,
  action: GameAction,
): GameHistory {
  const next = reduceGameSession(puzzle, history.present, action);
  if (isNoOp(history.present, next)) return history;
  return {
    present: next,
    past: [...history.past, history.present].slice(-100),
    future: [],
  };
}

export function reduceGameHistory(
  puzzle: Puzzle,
  history: GameHistory,
  action: GameHistoryAction,
): GameHistory {
  switch (action.type) {
    case "undo": {
      const previous = history.past.at(-1);
      if (previous === undefined) return history;
      return {
        present: previous,
        past: history.past.slice(0, -1),
        future: [history.present, ...history.future],
      };
    }
    case "redo": {
      const next = history.future[0];
      if (next === undefined) return history;
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

export function canUndo(history: GameHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: GameHistory): boolean {
  return history.future.length > 0;
}
