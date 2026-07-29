import type { ArithmeticPolicy } from "../engine/math/ArithmeticTypes";
import type { EquationId } from "./Topology";
import type { EquationGraph, VariableId } from "./EquationGraph";

export interface NumberSynthesisOptions {
  readonly seed: number;
  readonly policy?: ArithmeticPolicy;
  readonly requireDistinctValues?: boolean;
}

export interface SynthesizedVariable {
  readonly variableId: VariableId;
  readonly value: number;
}

export interface SynthesizedEquation {
  readonly equationId: EquationId;
  readonly left: number;
  readonly right: number;
  readonly result: number;
}

export interface NumberSynthesisResult {
  readonly graph: EquationGraph;
  readonly variables: readonly SynthesizedVariable[];
  readonly equations: readonly SynthesizedEquation[];
  readonly numberBank: readonly number[];
}

export type NumberSynthesisValidationCode =
  | "MISSING_ASSIGNMENT"
  | "DUPLICATE_ASSIGNMENT"
  | "OUT_OF_RANGE_VALUE"
  | "DUPLICATE_VALUE"
  | "INVALID_EQUATION";

export interface NumberSynthesisValidationIssue {
  readonly code: NumberSynthesisValidationCode;
  readonly message: string;
  readonly variableId?: VariableId;
  readonly equationId?: EquationId;
}

export interface NumberSynthesisValidationResult {
  readonly valid: boolean;
  readonly issues: readonly NumberSynthesisValidationIssue[];
}
