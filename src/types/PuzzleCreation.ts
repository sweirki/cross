import type { DifficultyTier } from "./Difficulty";
import type { VariableId } from "./EquationGraph";

export interface PuzzleCreationOptions {
  readonly id: string;
  readonly difficulty: DifficultyTier;
  readonly visibleVariableIds?: readonly VariableId[];
}

export type PuzzleValidationCode =
  | "INVALID_DIMENSIONS"
  | "DUPLICATE_CELL_ID"
  | "DUPLICATE_POSITION"
  | "OUT_OF_BOUNDS_CELL"
  | "INVALID_CELL_STATE"
  | "DUPLICATE_EQUATION_ID"
  | "MISSING_CELL_REFERENCE"
  | "INVALID_EQUATION_PATH"
  | "INVALID_EQUATION"
  | "INVALID_NUMBER_BANK";

export interface PuzzleValidationIssue {
  readonly code: PuzzleValidationCode;
  readonly message: string;
  readonly cellId?: string;
  readonly equationId?: string;
}

export interface PuzzleValidationResult {
  readonly valid: boolean;
  readonly issues: readonly PuzzleValidationIssue[];
}
