import type { GameHistory, GameHistoryAction, GameSession, GameView } from "./Game";
import type { Puzzle } from "./Puzzle";

export type RuntimeStatus = "playing" | "completed";

export interface RuntimeClock {
  readonly elapsedMs: number;
  readonly paused: boolean;
}

export interface RuntimeState {
  readonly schemaVersion: 1;
  readonly puzzleId: string;
  readonly history: GameHistory;
  readonly clock: RuntimeClock;
  readonly selectedTileId: string | null;
  readonly mistakes: number;
  readonly status: RuntimeStatus;
  readonly revision: number;
}

export type RuntimeAction =
  | GameHistoryAction
  | { readonly type: "select-tile"; readonly tileId: string | null }
  | { readonly type: "place-selected"; readonly cellId: string }
  | { readonly type: "advance-time"; readonly milliseconds: number }
  | { readonly type: "pause" }
  | { readonly type: "resume" };

export type RuntimeEvent =
  | { readonly type: "tile-selected"; readonly tileId: string | null }
  | { readonly type: "tile-placed"; readonly cellId: string; readonly tileId: string }
  | { readonly type: "tile-removed"; readonly cellId: string }
  | { readonly type: "equation-completed"; readonly equationId: string }
  | { readonly type: "mistake-recorded"; readonly equationIds: readonly string[] }
  | { readonly type: "hint-used" }
  | { readonly type: "puzzle-completed"; readonly moves: number; readonly hintsUsed: number; readonly elapsedMs: number }
  | { readonly type: "session-reset" };

export interface RuntimeTransition {
  readonly state: RuntimeState;
  readonly view: GameView;
  readonly events: readonly RuntimeEvent[];
}

export interface PersistedRuntimeState {
  readonly schemaVersion: 1;
  readonly puzzleId: string;
  readonly session: GameSession;
  readonly clock: RuntimeClock;
  readonly selectedTileId: string | null;
  readonly mistakes: number;
  readonly revision: number;
}

export interface RuntimeRestoreResult {
  readonly state: RuntimeState;
  readonly migrated: boolean;
}

export interface CrossMathGameRuntimeContract {
  create(puzzle: Puzzle): RuntimeTransition;
  dispatch(puzzle: Puzzle, state: RuntimeState, action: RuntimeAction): RuntimeTransition;
  serialize(state: RuntimeState): string;
  restore(puzzle: Puzzle, serialized: string): RuntimeRestoreResult;
}
