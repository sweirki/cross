import { useEffect, useMemo, useReducer, useState } from "react";
import {
  buildGameView,
  canRedo,
  canUndo,
  createGameHistory,
  reduceGameHistory,
} from "../game/engine";
import {
  loadGameSession,
  saveGameSession,
  type StringStorage,
} from "../services/GameSessionStorage";
import type { GameHistoryAction, GameSession } from "../types/Game";
import type { Puzzle } from "../types/Puzzle";

export function useGameSession(
  puzzle: Puzzle,
  options: {
    readonly initial?: GameSession;
    readonly storage?: StringStorage;
  } = {},
) {
  const [history, dispatch] = useReducer(
    (state: ReturnType<typeof createGameHistory>, action: GameHistoryAction) =>
      reduceGameHistory(puzzle, state, action),
    createGameHistory(puzzle, options.initial),
  );
  const [restored, setRestored] = useState(options.storage === undefined);

  useEffect(() => {
    let active = true;
    if (options.storage === undefined) return;
    setRestored(false);
    loadGameSession(options.storage, puzzle)
      .then((session) => {
        if (active && session !== null) dispatch({ type: "restore", session });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRestored(true);
      });
    return () => { active = false; };
  }, [options.storage, puzzle]);

  useEffect(() => {
    if (!restored || options.storage === undefined) return;
    void saveGameSession(options.storage, history.present);
  }, [history.present, options.storage, restored]);

  const view = useMemo(
    () => buildGameView(puzzle, history.present),
    [puzzle, history.present],
  );

  return {
    session: history.present,
    view,
    dispatch,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    restored,
  } as const;
}
