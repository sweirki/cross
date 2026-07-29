import type { Cell } from "./Cell";
import type { DifficultyTier } from "./Difficulty";
import type { Equation } from "./Equation";

export interface NumberBankTile {
  readonly id: string;
  readonly value: number;
}

export interface Puzzle {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly difficulty: DifficultyTier;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];
  readonly equations: readonly Equation[];
  readonly numberBank: readonly NumberBankTile[];
}
