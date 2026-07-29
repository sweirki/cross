import { solvePuzzle, verifyUniqueSolution } from "../../src/game/solver";
import type { Puzzle } from "../../src/types/Puzzle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
}

function oneEquation(options: {
  readonly givenLeft?: boolean;
  readonly bank?: readonly number[];
  readonly solutions?: readonly [number, number, number];
} = {}): Puzzle {
  const [leftSolution, rightSolution, resultSolution] = options.solutions ?? [2, 3, 5];
  const givenLeft = options.givenLeft ?? true;
  const bank = options.bank ?? (givenLeft ? [3, 5] : [2, 3, 5]);
  return {
    schemaVersion: 1,
    id: "solver-test",
    difficulty: "easy",
    width: 5,
    height: 1,
    cells: [
      { id: "n1", kind: "number", position: { row: 0, col: 0 }, value: givenLeft ? 2 : null, solution: leftSolution, given: givenLeft, editable: !givenLeft },
      { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
      { id: "n2", kind: "number", position: { row: 0, col: 2 }, value: null, solution: rightSolution, given: false, editable: true },
      { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
      { id: "n3", kind: "number", position: { row: 0, col: 4 }, value: null, solution: resultSolution, given: false, editable: true },
    ],
    equations: [
      { id: "e1", orientation: "horizontal", cellIds: ["n1", "op", "n2", "eq", "n3"], operator: "+" },
    ],
    numberBank: bank.map((value, index) => ({ id: `t${index + 1}`, value })),
  };
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ["finds a unique solution", () => {
    const result = solvePuzzle(oneEquation());
    assertEqual(result.status, "unique", "Status mismatch.");
    assertEqual(result.solutionCount, 1, "Solution count mismatch.");
    assert(result.searchExhausted, "Unique search must be exhausted.");
    assertEqual(result.firstSolution?.find((x) => x.cellId === "n2")?.value, 3, "Right operand mismatch.");
    assertEqual(result.firstSolution?.find((x) => x.cellId === "n3")?.value, 5, "Result mismatch.");
  }],
  ["detects multiple value assignments", () => {
    const result = solvePuzzle(oneEquation({ givenLeft: false }));
    assertEqual(result.status, "multiple", "Multiple status mismatch.");
    assertEqual(result.solutionCount, 2, "Search should stop after two solutions.");
    assert(!result.searchExhausted, "Limited multiple search should not report exhaustion.");
  }],
  ["detects an unsolved puzzle", () => {
    const result = solvePuzzle(oneEquation({ bank: [4, 5] }));
    assertEqual(result.status, "unsolved", "Unsolved status mismatch.");
    assertEqual(result.solutionCount, 0, "Unsolved count mismatch.");
    assert(result.searchExhausted, "Unsolved search should be exhaustive.");
  }],
  ["verifies uniqueness with the required two-solution limit", () => {
    const result = verifyUniqueSolution(oneEquation());
    assert(result.unique, "Expected verified uniqueness.");
    assertEqual(result.solutionCount, 1, "Verification count mismatch.");
  }],
  ["does not trust embedded solution metadata", () => {
    const puzzle = oneEquation({ solutions: [99, 88, 77] });
    const result = solvePuzzle(puzzle);
    assertEqual(result.status, "unique", "Metadata must not affect solving.");
    assertEqual(result.firstSolution?.find((x) => x.cellId === "n3")?.value, 5, "Solved value mismatch.");
  }],
  ["produces a deterministic trace", () => {
    const first = solvePuzzle(oneEquation());
    const second = solvePuzzle(oneEquation());
    assertEqual(JSON.stringify(first.trace), JSON.stringify(second.trace), "Trace is not deterministic.");
    assert(first.trace.some((event) => event.kind === "solution"), "Trace lacks a solution event.");
  }],
  ["can omit trace collection", () => {
    const result = solvePuzzle(oneEquation(), { includeTrace: false });
    assertEqual(result.trace.length, 0, "Trace should be empty.");
  }],
  ["reports an indeterminate one-solution cutoff", () => {
    const result = solvePuzzle(oneEquation({ givenLeft: false }), { solutionLimit: 1 });
    assertEqual(result.status, "indeterminate", "One-solution cutoff must not claim uniqueness.");
    assert(!result.searchExhausted, "Cutoff search should not be exhausted.");
  }],
  ["rejects malformed equation paths", () => {
    const base = oneEquation();
    const broken: Puzzle = { ...base, equations: [{ ...base.equations[0]!, cellIds: ["n1", "n2", "op", "eq", "n3"] }] };
    let threw = false;
    try { solvePuzzle(broken); } catch { threw = true; }
    assert(threw, "Malformed path should be rejected.");
  }],
  ["rejects a number-bank cardinality mismatch", () => {
    const base = oneEquation();
    const broken: Puzzle = { ...base, numberBank: [{ id: "t1", value: 3 }] };
    let threw = false;
    try { solvePuzzle(broken); } catch { threw = true; }
    assert(threw, "Invalid number bank should be rejected.");
  }],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} unique-solution tests passed.`);
