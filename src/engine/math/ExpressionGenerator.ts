import { applyArithmetic } from "./ArithmeticEngine";
import {
  canonicalizeEquation,
  type CanonicalEquation,
} from "./EquationCanonicalizer";
import type {
  ArithmeticOperation,
  ArithmeticPolicy,
} from "./ArithmeticTypes";
import {
  ARITHMETIC_OPERATIONS,
  DEFAULT_ARITHMETIC_POLICY,
} from "./OperatorRules";

export interface ExpressionGeneratorOptions {
  readonly minimumOperand: number;
  readonly maximumOperand: number;
  readonly minimumTarget: number;
  readonly maximumTarget: number;
  readonly allowedOperations?: readonly ArithmeticOperation[];
  readonly policy?: ArithmeticPolicy;
}

export interface GeneratedExpression extends CanonicalEquation {}

function uniqueSorted(
  operations: readonly ArithmeticOperation[],
): readonly ArithmeticOperation[] {
  return [...new Set(operations)].sort();
}

export function* generateExpressions(
  options: ExpressionGeneratorOptions,
): Generator<GeneratedExpression> {
  const policy =
    options.policy ?? DEFAULT_ARITHMETIC_POLICY;

  const operations = uniqueSorted(
    options.allowedOperations ??
      ARITHMETIC_OPERATIONS,
  );

  for (
    let left = options.minimumOperand;
    left <= options.maximumOperand;
    left++
  ) {
    for (
      let right = options.minimumOperand;
      right <= options.maximumOperand;
      right++
    ) {
      for (const operation of operations) {
        const result = applyArithmetic(
          operation,
          left,
          right,
          policy,
        );

        if (!result.ok) {
          continue;
        }

        if (
          result.result < options.minimumTarget ||
          result.result > options.maximumTarget
        ) {
          continue;
        }

        yield canonicalizeEquation({
          left,
          operation,
          right,
          result: result.result,
        });
      }
    }
  }
}

export function generateExpressionArray(
  options: ExpressionGeneratorOptions,
): readonly GeneratedExpression[] {
  return [...generateExpressions(options)];
}