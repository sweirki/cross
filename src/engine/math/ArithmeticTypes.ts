export type ArithmeticOperation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide";

export type ArithmeticFailureCode =
  | "NON_FINITE_OPERAND"
  | "NON_INTEGER_OPERAND"
  | "DIVISION_BY_ZERO"
  | "NON_INTEGER_DIVISION"
  | "NEGATIVE_RESULT_FORBIDDEN"
  | "ZERO_RESULT_FORBIDDEN"
  | "RESULT_OUT_OF_RANGE"
  | "UNSAFE_INTEGER_RESULT";

export interface ArithmeticPolicy {
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly requireIntegerOperands: boolean;
  readonly requireIntegerResults: boolean;
  readonly allowNegativeResults: boolean;
  readonly allowZeroResults: boolean;
}

export interface ArithmeticSuccess {
  readonly ok: true;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly result: number;
}

export interface ArithmeticFailure {
  readonly ok: false;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly code: ArithmeticFailureCode;
  readonly message: string;
}

export type ArithmeticResult =
  | ArithmeticSuccess
  | ArithmeticFailure;

export interface EquationEvaluation {
  readonly valid: boolean;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly expectedResult: number;
  readonly actualResult?: number;
  readonly failure?: ArithmeticFailure;
}
