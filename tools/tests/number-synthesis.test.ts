import {
  buildEquationGraph,
  generateTopologySkeleton,
  materializeTopologySkeleton,
} from "../../src/game/board";
import {
  serializeNumberSynthesis,
  synthesizeNumbers,
  validateNumberSynthesis,
} from "../../src/game/generator";
import type { NumberSynthesisResult } from "../../src/types/NumberSynthesis";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function synthesize(seed = 12345, distinct = false): NumberSynthesisResult {
  const skeleton = generateTopologySkeleton({
    width: 9,
    height: 9,
    equationCount: 4,
    seed: 77,
  });
  const topology = materializeTopologySkeleton(
    skeleton,
    (_equation, index) => ["add", "subtract", "multiply", "divide"][index % 4] as
      | "add"
      | "subtract"
      | "multiply"
      | "divide",
  );
  return synthesizeNumbers(buildEquationGraph(topology), {
    seed,
    requireDistinctValues: distinct,
  });
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "assigns every graph variable",
    () => {
      const result = synthesize();
      assertEqual(result.variables.length, result.graph.variables.length, "Assignment count mismatch.");
    },
  ],
  [
    "satisfies every equation",
    () => {
      const validation = validateNumberSynthesis(synthesize());
      assert(validation.valid, JSON.stringify(validation.issues));
    },
  ],
  [
    "is deterministic for identical seeds",
    () => {
      assertEqual(
        serializeNumberSynthesis(synthesize(9)),
        serializeNumberSynthesis(synthesize(9)),
        "Identical requests produced different assignments.",
      );
    },
  ],
  [
    "preserves shared variable values",
    () => {
      const result = synthesize();
      for (const intersection of result.graph.intersections) {
        const assignment = result.variables.find(
          (candidate) => candidate.variableId === intersection.variableId,
        );
        assert(assignment !== undefined, "Intersection variable was not assigned.");
      }
    },
  ],
  [
    "builds a canonical number bank",
    () => {
      const result = synthesize();
      assertEqual(result.numberBank.length, result.variables.length, "Number bank length mismatch.");
      assertEqual(
        result.numberBank.join(","),
        result.variables.map((variable) => variable.value).join(","),
        "Number bank order is not canonical.",
      );
    },
  ],
  [
    "supports globally distinct values",
    () => {
      const result = synthesize(123, true);
      assertEqual(
        new Set(result.numberBank).size,
        result.numberBank.length,
        "Distinct synthesis returned duplicate values.",
      );
      assert(validateNumberSynthesis(result, undefined, true).valid, "Distinct result did not validate.");
    },
  ],
  [
    "rejects invalid equation graphs",
    () => {
      const result = synthesize();
      let threw = false;
      try {
        synthesizeNumbers({ ...result.graph, intersections: [] }, { seed: 1 });
      } catch {
        threw = true;
      }
      assert(threw, "Invalid graph should be rejected.");
    },
  ],
  [
    "detects a corrupted assignment",
    () => {
      const result = synthesize();
      const first = result.variables[0];
      assert(first !== undefined, "Missing first assignment.");
      const broken: NumberSynthesisResult = {
        ...result,
        variables: [
          { ...first, value: 999 },
          ...result.variables.slice(1),
        ],
      };
      assert(
        validateNumberSynthesis(broken).issues.some(
          (candidate) =>
            candidate.code === "OUT_OF_RANGE_VALUE" ||
            candidate.code === "INVALID_EQUATION",
        ),
        "Corrupted assignment was not detected.",
      );
    },
  ],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} number-synthesis tests passed.`);
