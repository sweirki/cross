import type { DeductionRule, DeductionTrace } from "../contracts/GenerationContracts";

export type HintEscalationLevel = 1 | 2 | 3 | 4;

export interface HintRequest {
  readonly puzzleId: string;
  readonly trace: DeductionTrace;
  readonly solvedCellIds: readonly string[];
  readonly requestedLevel?: HintEscalationLevel;
}

export type HintKind =
  | "focus-equation"
  | "explain-deduction"
  | "narrow-candidates"
  | "reveal-value"
  | "puzzle-complete"
  | "no-supported-deduction";

export interface HintResult {
  readonly schemaVersion: 1;
  readonly puzzleId: string;
  readonly kind: HintKind;
  readonly level: HintEscalationLevel;
  readonly stepIndex?: number;
  readonly rule?: DeductionRule;
  readonly targetCellId?: string;
  readonly equationId?: string;
  readonly prerequisiteCellIds: readonly string[];
  readonly revealedValue?: number;
  readonly messageKey: string;
  readonly deterministicId: string;
}

export interface HintValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
