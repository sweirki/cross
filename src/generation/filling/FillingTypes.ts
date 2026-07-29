
import type { EquationFillPlan } from "../contracts/GenerationContracts";

export type FillingFailureCode =
  | "NO_ALLOWED_OPERATORS"
  | "SEARCH_BUDGET_EXHAUSTED"
  | "UNSATISFIABLE_STRUCTURE"
  | "QUALITY_REJECTED";

export interface EquationFillingDiagnostics {
  readonly searchNodes: number;
  readonly backtracks: number;
  readonly candidateTriples: number;
  readonly elapsedMilliseconds: number;
  readonly operatorCounts: Readonly<Record<string, number>>;
  readonly repeatedValueRatio: number;
  readonly trivialEquationRatio: number;
}

export type EquationFillingResult =
  | { readonly ok: true; readonly plan: EquationFillPlan; readonly diagnostics: EquationFillingDiagnostics }
  | { readonly ok: false; readonly code: FillingFailureCode; readonly message: string; readonly diagnostics: EquationFillingDiagnostics };
