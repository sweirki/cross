import type {
  ArithmeticFailure,
  ArithmeticFailureCode,
  ArithmeticOperation,
  ArithmeticPolicy,
  ArithmeticResult,
} from "./ArithmeticTypes";
import { DEFAULT_ARITHMETIC_POLICY } from "./OperatorRules";

function fail(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  code: ArithmeticFailureCode,
  message: string,
): ArithmeticFailure {
  return {
    ok: false,
    operation,
    left,
    right,
    code,
    message,
  };
}

function validateOperand(
  value: number,
  side: "left" | "right",
  operation: ArithmeticOperation,
  left: number,
  right: number,
  policy: ArithmeticPolicy,
): ArithmeticFailure | null {
  if (!Number.isFinite(value)) {
    return fail(
      operation,
      left,
      right,
      "NON_FINITE_OPERAND",
      `${side} operand must be finite.`,
    );
  }

  if (policy.requireIntegerOperands && !Number.isInteger(value)) {
    return fail(
      operation,
      left,
      right,
      "NON_INTEGER_OPERAND",
      `${side} operand must be an integer.`,
    );
  }

  return null;
}

function calculateRaw(
  operation: ArithmeticOperation,
  left: number,
  right: number,
): number {
  switch (operation) {
    case "add":
      return left + right;
    case "subtract":
      return left - right;
    case "multiply":
      return left * right;
    case "divide":
      return left / right;
  }
}

export function applyArithmetic(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  policy: ArithmeticPolicy = DEFAULT_ARITHMETIC_POLICY,
): ArithmeticResult {
  const leftFailure = validateOperand(
    left,
    "left",
    operation,
    left,
    right,
    policy,
  );

  if (leftFailure) {
    return leftFailure;
  }

  const rightFailure = validateOperand(
    right,
    "right",
    operation,
    left,
    right,
    policy,
  );

  if (rightFailure) {
    return rightFailure;
  }

  if (operation === "divide" && right === 0) {
    return fail(
      operation,
      left,
      right,
      "DIVISION_BY_ZERO",
      "Division by zero is forbidden.",
    );
  }

  const result = calculateRaw(operation, left, right);

  if (!Number.isSafeInteger(result) && Number.isInteger(result)) {
    return fail(
      operation,
      left,
      right,
      "UNSAFE_INTEGER_RESULT",
      "Result exceeds the safe integer range.",
    );
  }

  if (policy.requireIntegerResults && !Number.isInteger(result)) {
    return fail(
      operation,
      left,
      right,
      operation === "divide"
        ? "NON_INTEGER_DIVISION"
        : "RESULT_OUT_OF_RANGE",
      "Result must be an integer.",
    );
  }

  if (!policy.allowNegativeResults && result < 0) {
    return fail(
      operation,
      left,
      right,
      "NEGATIVE_RESULT_FORBIDDEN",
      "Negative results are forbidden by policy.",
    );
  }

  if (!policy.allowZeroResults && result === 0) {
    return fail(
      operation,
      left,
      right,
      "ZERO_RESULT_FORBIDDEN",
      "Zero results are forbidden by policy.",
    );
  }

  if (
    result < policy.minimumValue ||
    result > policy.maximumValue
  ) {
    return fail(
      operation,
      left,
      right,
      "RESULT_OUT_OF_RANGE",
      `Result must be between ${policy.minimumValue} and ${policy.maximumValue}.`,
    );
  }

  return {
    ok: true,
    operation,
    left,
    right,
    result,
  };
}
