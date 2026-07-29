import { applyArithmetic } from "./ArithmeticEngine";
import type {
  ArithmeticOperation,
  ArithmeticPolicy,
  EquationEvaluation,
} from "./ArithmeticTypes";
import { DEFAULT_ARITHMETIC_POLICY } from "./OperatorRules";

export function evaluateEquation(
  left: number,
  operation: ArithmeticOperation,
  right: number,
  expectedResult: number,
  policy: ArithmeticPolicy = DEFAULT_ARITHMETIC_POLICY,
): EquationEvaluation {
  const arithmetic = applyArithmetic(
    operation,
    left,
    right,
    policy,
  );

  if (!arithmetic.ok) {
    return {
      valid: false,
      operation,
      left,
      right,
      expectedResult,
      failure: arithmetic,
    };
  }

  return {
    valid: arithmetic.result === expectedResult,
    operation,
    left,
    right,
    expectedResult,
    actualResult: arithmetic.result,
  };
}
