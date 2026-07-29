import type { ArithmeticOperation } from "./ArithmeticTypes";

export interface CanonicalEquation {
  readonly left: number;
  readonly operation: ArithmeticOperation;
  readonly right: number;
  readonly result: number;
}

function isCommutative(
  operation: ArithmeticOperation,
): boolean {
  return operation === "add" || operation === "multiply";
}

export function canonicalizeEquation(
  equation: CanonicalEquation,
): CanonicalEquation {
  if (
    isCommutative(equation.operation) &&
    equation.left > equation.right
  ) {
    return {
      left: equation.right,
      operation: equation.operation,
      right: equation.left,
      result: equation.result,
    };
  }

  return equation;
}

export function serializeCanonicalEquation(
  equation: CanonicalEquation,
): string {
  const canonical = canonicalizeEquation(equation);

  return [
    canonical.left,
    canonical.operation,
    canonical.right,
    canonical.result,
  ].join("|");
}
