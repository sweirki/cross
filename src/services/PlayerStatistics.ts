import type { GameSession } from "../types/Game";
import type { PlayStatistics, PuzzleProgress } from "../types/RuntimeContent";

export function createPlayStatistics(
  puzzleId: string,
  startedAt = new Date().toISOString(),
): PlayStatistics {
  return {
    puzzleId,
    startedAt,
    elapsedMs: 0,
    moves: 0,
    mistakes: 0,
    undoCount: 0,
    hintCount: 0,
    completed: false,
  };
}

export function updatePlayStatistics(
  stats: PlayStatistics,
  event:
    | { readonly type: "tick"; readonly elapsedMs: number }
    | { readonly type: "mistake" }
    | { readonly type: "undo" }
    | { readonly type: "session"; readonly session: GameSession },
): PlayStatistics {
  switch (event.type) {
    case "tick":
      if (!Number.isInteger(event.elapsedMs) || event.elapsedMs < stats.elapsedMs) {
        throw new Error("Elapsed time must be a nondecreasing integer.");
      }
      return { ...stats, elapsedMs: event.elapsedMs };
    case "mistake":
      return { ...stats, mistakes: stats.mistakes + 1 };
    case "undo":
      return { ...stats, undoCount: stats.undoCount + 1 };
    case "session":
      if (event.session.puzzleId !== stats.puzzleId) throw new Error("Statistics puzzle mismatch.");
      return {
        ...stats,
        moves: event.session.moves,
        hintCount: event.session.hintsUsed,
        completed: event.session.completed,
      };
  }
}

function starsFor(stats: PlayStatistics): 0 | 1 | 2 | 3 {
  if (!stats.completed) return 0;
  if (stats.hintCount === 0 && stats.mistakes === 0) return 3;
  if (stats.hintCount <= 1 && stats.mistakes <= 2) return 2;
  return 1;
}

export function mergePuzzleProgress(
  previous: PuzzleProgress | undefined,
  stats: PlayStatistics,
  updatedAt = new Date().toISOString(),
): PuzzleProgress {
  const completed = previous?.completed === true || stats.completed;
  const bestTimeMs = stats.completed
    ? previous?.bestTimeMs === null || previous?.bestTimeMs === undefined
      ? stats.elapsedMs
      : Math.min(previous.bestTimeMs, stats.elapsedMs)
    : previous?.bestTimeMs ?? null;
  const bestMoves = stats.completed
    ? previous?.bestMoves === null || previous?.bestMoves === undefined
      ? stats.moves
      : Math.min(previous.bestMoves, stats.moves)
    : previous?.bestMoves ?? null;
  return {
    puzzleId: stats.puzzleId,
    completed,
    attempts: (previous?.attempts ?? 0) + 1,
    bestTimeMs,
    bestMoves,
    stars: Math.max(previous?.stars ?? 0, starsFor(stats)) as 0 | 1 | 2 | 3,
    hintsUsed: (previous?.hintsUsed ?? 0) + stats.hintCount,
    mistakes: (previous?.mistakes ?? 0) + stats.mistakes,
    updatedAt,
  };
}
