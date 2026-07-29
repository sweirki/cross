import type { Position } from "./Position";
import type { Operator } from "./Operator";

export interface BasePuzzleCell {
  readonly id: string;
  readonly position: Position;
}

export interface NumberPuzzleCell extends BasePuzzleCell {
  readonly kind: "number";
  readonly value: number | null;
  readonly solution: number;
  readonly given: boolean;
  readonly editable: boolean;
}

export interface OperatorPuzzleCell extends BasePuzzleCell {
  readonly kind: "operator";
  readonly operator: Exclude<Operator, "=">;
}

export interface EqualsPuzzleCell extends BasePuzzleCell {
  readonly kind: "equals";
  readonly operator: "=";
}

export type Cell =
  | NumberPuzzleCell
  | OperatorPuzzleCell
  | EqualsPuzzleCell;
