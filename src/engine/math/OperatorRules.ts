import type {
  ArithmeticOperation,
  ArithmeticPolicy,
} from "./ArithmeticTypes";

export const DEFAULT_ARITHMETIC_POLICY: ArithmeticPolicy = Object.freeze({
  minimumValue: 0,
  maximumValue: 100,
  requireIntegerOperands: true,
  requireIntegerResults: true,
  allowNegativeResults: false,
  allowZeroResults: true,
});

export const ARITHMETIC_OPERATIONS: readonly ArithmeticOperation[] =
  Object.freeze([
    "add",
    "subtract",
    "multiply",
    "divide",
  ]);

export function isArithmeticOperation(
  value: unknown,
): value is ArithmeticOperation {
  return (
    value === "add" ||
    value === "subtract" ||
    value === "multiply" ||
    value === "divide"
  );
}

export function getOperationSymbol(
  operation: ArithmeticOperation,
): "+" | "-" | "Ã—" | "Ã·" {
  switch (operation) {
    case "add":
      return "+";
    case "subtract":
      return "-";
    case "multiply":
      return "Ã—";
    case "divide":
      return "Ã·";
  }
}
