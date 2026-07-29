import type { Puzzle } from "./Puzzle";

export type EquationState = "incomplete" | "correct" | "incorrect";
export type CellValueSource = "given" | "tile" | "empty";

export interface RuntimeCellValue {
  readonly cellId: string;
  readonly value: number | null;
  readonly source: CellValueSource;
  readonly tileId?: string;
}

export interface EquationFeedback {
  readonly equationId: string;
  readonly state: EquationState;
}

export interface GameSession {
  readonly schemaVersion: 1;
  readonly puzzleId: string;
  readonly placements: Readonly<Record<string, string>>;
  readonly moves: number;
  readonly hintsUsed: number;
  readonly completed: boolean;
}

export interface GameView {
  readonly puzzle: Puzzle;
  readonly session: GameSession;
  readonly cells: readonly RuntimeCellValue[];
  readonly equations: readonly EquationFeedback[];
  readonly availableTileIds: readonly string[];
}

export interface GameHistory {
  readonly present: GameSession;
  readonly past: readonly GameSession[];
  readonly future: readonly GameSession[];
}

export type GameAction =
  | { readonly type: "place"; readonly cellId: string; readonly tileId: string }
  | { readonly type: "remove"; readonly cellId: string }
  | { readonly type: "hint" }
  | { readonly type: "reset" };

export type GameHistoryAction =
  | GameAction
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "restore"; readonly session: GameSession };


export interface PersistedGameSession {
  readonly schemaVersion: 1;
  readonly puzzleId: string;
  readonly placements: Readonly<Record<string, string>>;
  readonly moves: number;
  readonly hintsUsed: number;
  readonly completed: boolean;
}
