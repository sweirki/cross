import {
  applyArithmetic,
  canonicalizeEquation,
  evaluateEquation,
  serializeCanonicalEquation,
} from "../../src/engine/math";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(
  actual: T,
  expected: T,
  message: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${message} Expected ${String(expected)}, received ${String(actual)}.`,
    );
  }
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "addition succeeds",
    () => {
      const result = applyArithmetic("add", 7, 5);
      assert(result.ok, "Addition should succeed.");
      assertEqual(result.result, 12, "Addition result mismatch.");
    },
  ],
  [
    "subtraction rejects negative result under default policy",
    () => {
      const result = applyArithmetic("subtract", 3, 8);
      assert(!result.ok, "Negative subtraction should fail.");
      assertEqual(
        result.code,
        "NEGATIVE_RESULT_FORBIDDEN",
        "Unexpected subtraction failure.",
      );
    },
  ],
  [
    "multiplication succeeds",
    () => {
      const result = applyArithmetic("multiply", 6, 4);
      assert(result.ok, "Multiplication should succeed.");
      assertEqual(result.result, 24, "Multiplication result mismatch.");
    },
  ],
  [
    "division rejects zero divisor",
    () => {
      const result = applyArithmetic("divide", 10, 0);
      assert(!result.ok, "Division by zero should fail.");
      assertEqual(
        result.code,
        "DIVISION_BY_ZERO",
        "Unexpected zero-division failure.",
      );
    },
  ],
  [
    "division rejects fractional result",
    () => {
      const result = applyArithmetic("divide", 7, 2);
      assert(!result.ok, "Fractional division should fail.");
      assertEqual(
        result.code,
        "NON_INTEGER_DIVISION",
        "Unexpected fractional-division failure.",
      );
    },
  ],
  [
    "equation evaluator validates exact result",
    () => {
      const evaluation = evaluateEquation(
        9,
        "subtract",
        4,
        5,
      );
      assert(evaluation.valid, "Equation should be valid.");
      assertEqual(
        evaluation.actualResult,
        5,
        "Equation result mismatch.",
      );
    },
  ],
  [
    "equation evaluator rejects incorrect result",
    () => {
      const evaluation = evaluateEquation(
        9,
        "subtract",
        4,
        6,
      );
      assert(!evaluation.valid, "Equation should be invalid.");
      assertEqual(
        evaluation.actualResult,
        5,
        "Actual result should still be reported.",
      );
    },
  ],
  [
    "commutative equations canonicalize operand order",
    () => {
      const canonical = canonicalizeEquation({
        left: 9,
        operation: "add",
        right: 2,
        result: 11,
      });

      assertEqual(canonical.left, 2, "Canonical left mismatch.");
      assertEqual(canonical.right, 9, "Canonical right mismatch.");
    },
  ],
  [
    "noncommutative equations preserve operand order",
    () => {
      const canonical = canonicalizeEquation({
        left: 9,
        operation: "subtract",
        right: 2,
        result: 7,
      });

      assertEqual(canonical.left, 9, "Subtraction left changed.");
      assertEqual(canonical.right, 2, "Subtraction right changed.");
    },
  ],
  [
    "canonical serialization is deterministic",
    () => {
      const first = serializeCanonicalEquation({
        left: 9,
        operation: "multiply",
        right: 2,
        result: 18,
      });

      const second = serializeCanonicalEquation({
        left: 2,
        operation: "multiply",
        right: 9,
        result: 18,
      });

      assertEqual(
        first,
        second,
        "Equivalent multiplication equations must serialize equally.",
      );
    },
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  test();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log("");
console.log(`${passed}/${tests.length} arithmetic-engine tests passed.`);
