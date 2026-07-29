import {
  generateExpressionArray,
  type ExpressionGeneratorOptions,
} from "../../src/engine/math/ExpressionGenerator";

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

const baseOptions: ExpressionGeneratorOptions = {
  minimumOperand: 1,
  maximumOperand: 5,
  minimumTarget: 1,
  maximumTarget: 25,
};

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "generator produces expressions",
    () => {
      const expressions = generateExpressionArray(baseOptions);
      assert(expressions.length > 0, "Generator produced no expressions.");
    },
  ],
  [
    "results stay within target range",
    () => {
      const expressions = generateExpressionArray(baseOptions);

      for (const expression of expressions) {
        assert(
          expression.result >= baseOptions.minimumTarget &&
            expression.result <= baseOptions.maximumTarget,
          "Expression target outside configured range.",
        );
      }
    },
  ],
  [
    "commutative equations are canonicalized",
    () => {
      const expressions = generateExpressionArray({
        ...baseOptions,
        allowedOperations: ["add"],
      });

      for (const expression of expressions) {
        assert(
          expression.left <= expression.right,
          "Addition expression is not canonical.",
        );
      }
    },
  ],
  [
    "subtraction never becomes negative",
    () => {
      const expressions = generateExpressionArray({
        ...baseOptions,
        allowedOperations: ["subtract"],
      });

      for (const expression of expressions) {
        assert(
          expression.result >= 0,
          "Negative subtraction generated.",
        );
      }
    },
  ],
  [
    "division is always integral",
    () => {
      const expressions = generateExpressionArray({
        ...baseOptions,
        allowedOperations: ["divide"],
      });

      for (const expression of expressions) {
        assert(
          Number.isInteger(expression.result),
          "Fractional division generated.",
        );
      }
    },
  ],
  [
    "generation is deterministic",
    () => {
      const first = JSON.stringify(
        generateExpressionArray(baseOptions),
      );

      const second = JSON.stringify(
        generateExpressionArray(baseOptions),
      );

      assertEqual(
        first,
        second,
        "Generation is not deterministic.",
      );
    },
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  test();
  passed++;
  console.log(`PASS ${name}`);
}

console.log("");
console.log(`${passed}/${tests.length} expression-generator tests passed.`);