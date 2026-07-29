import { useEffect } from "react";
import { canRedo, canUndo } from "../../game/engine";
import type { Puzzle } from "../../types/Puzzle";
import { useCrossMathApp } from "./CrossMathAppProvider";

export function useIntegratedGameSession(puzzle: Puzzle) {
  const { transition, startPuzzle, dispatchGame } = useCrossMathApp();
  const { state, view } = transition;

  useEffect(() => {
    if (state.hydrated && state.activePuzzleId !== puzzle.id) {
      startPuzzle(puzzle.id);
    }
  }, [puzzle.id, startPuzzle, state.activePuzzleId, state.hydrated]);

  const game = state.activePuzzleId === puzzle.id ? state.game : null;

  useEffect(() => {
    if (game === null || game.status === "completed" || game.clock.paused) return;
    const timer = setInterval(() => dispatchGame({ type: "advance-time", milliseconds: 1000 }), 1000);
    return () => clearInterval(timer);
  }, [dispatchGame, game?.clock.paused, game?.status, game === null]);

  return {
    session: game?.history.present ?? null,
    view: game === null ? null : view,
    dispatch: dispatchGame,
    selectedTileId: game?.selectedTileId ?? null,
    canUndo: game === null ? false : canUndo(game.history),
    canRedo: game === null ? false : canRedo(game.history),
    elapsedMs: game?.clock.elapsedMs ?? 0,
    mistakes: game?.mistakes ?? 0,
    events: transition.events,
    restored: state.hydrated && game !== null,
  } as const;
}
