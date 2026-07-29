import type { ArithmeticOperator } from "./Topology";

export interface NumericDomain {
  readonly minimum: number;
  readonly maximum: number;
}

export const VERSION_1_NUMERIC_DOMAIN: NumericDomain = {
  minimum: 1,
  maximum: 99,
};

export interface CompleteEquationValues {
  readonly left: number;
  readonly operator: ArithmeticOperator;
  readonly right: number;
  readonly result: number;
}

export type EquationValueSlot = "left" | "right" | "result";

export interface PartialEquationValues {
  readonly left: number | null;
  readonly operator: ArithmeticOperator;
  readonly right: number | null;
  readonly result: number | null;
}

export type ArithmeticValidationCode =
  | "NON_INTEGER_VALUE"
  | "VALUE_OUT_OF_DOMAIN"
  | "DIVISION_BY_ZERO"
  | "NON_EXACT_DIVISION"
  | "NON_POSITIVE_SUBTRACTION_RESULT"
  | "EQUATION_NOT_SATISFIED"
  | "UNKNOWN_VALUE_COUNT_INVALID"
  | "DERIVATION_NOT_INTEGER"
  | "DERIVATION_OUT_OF_DOMAIN"
  | "DERIVATION_NOT_UNIQUE";

export interface ArithmeticValidationIssue {
  readonly code: ArithmeticValidationCode;
  readonly message: string;
  readonly slot?: EquationValueSlot;
}

export interface ArithmeticValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ArithmeticValidationIssue[];
}

export interface ArithmeticDerivationResult {
  readonly solved: boolean;
  readonly slot?: EquationValueSlot;
  readonly value?: number;
  readonly issues: readonly ArithmeticValidationIssue[];
}

export interface ArithmeticEngine {
  evaluate(
    left: number,
    operator: ArithmeticOperator,
    right: number,
  ): number | null;

  validate(
    equation: CompleteEquationValues,
    domain?: NumericDomain,
  ): ArithmeticValidationResult;

  deriveSingleUnknown(
    equation: PartialEquationValues,
    domain?: NumericDomain,
  ): ArithmeticDerivationResult;
}
