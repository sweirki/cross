import {
  buildEquationGraph,
  generateTopologySkeleton,
  materializeTopologySkeleton,
} from "../../src/game/board";
import {
  createPuzzle,
  serializePuzzle,
  synthesizeNumbers,
} from "../../src/game/generator";
import { validatePuzzle } from "../../src/game/validation/PuzzleValidation";
import type { Puzzle } from "../../src/types/Puzzle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function puzzle(visibleCount = 2): Puzzle {
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
  const synthesis = synthesizeNumbers(buildEquationGraph(topology), {
    seed: 12345,
  });
  return createPuzzle(topology, synthesis, {
    id: "easy-0001",
    difficulty: "easy",
    visibleVariableIds: synthesis.graph.variables
      .slice(0, visibleCount)
      .map((variable) => variable.id),
  });
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "creates the canonical puzzle JSON contract",
    () => {
      const value = puzzle();
      assertEqual(value.schemaVersion, 1, "Schema version mismatch.");
      assertEqual(value.id, "easy-0001", "Puzzle ID mismatch.");
      assertEqual(value.width, 9, "Width mismatch.");
      assertEqual(value.height, 9, "Height mismatch.");
    },
  ],
  [
    "materializes every topology node as a renderable cell",
    () => {
      const value = puzzle();
      assert(value.cells.some((cell) => cell.kind === "number"), "Missing number cells.");
      assert(value.cells.some((cell) => cell.kind === "operator"), "Missing operator cells.");
      assert(value.cells.some((cell) => cell.kind === "equals"), "Missing equals cells.");
    },
  ],
  [
    "creates one canonical equation per topology path",
    () => assertEqual(puzzle().equations.length, 4, "Equation count mismatch."),
  ],
  [
    "marks selected values as immutable givens",
    () => {
      const numbers = puzzle(2).cells.filter((cell) => cell.kind === "number");
      assertEqual(numbers.filter((cell) => cell.given).length, 2, "Given count mismatch.");
      assert(numbers.filter((cell) => cell.given).every((cell) => !cell.editable && cell.value === cell.solution), "Given state is invalid.");
    },
  ],
  [
    "creates one number-bank tile per hidden cell",
    () => {
      const value = puzzle(2);
      const hidden = value.cells.filter((cell) => cell.kind === "number" && !cell.given);
      assertEqual(value.numberBank.length, hidden.length, "Number bank count mismatch.");
    },
  ],
  [
    "preserves duplicate tile identity",
    () => {
      const value = puzzle(0);
      assertEqual(new Set(value.numberBank.map((tile) => tile.id)).size, value.numberBank.length, "Tile IDs are not unique.");
    },
  ],
  [
    "serializes deterministically",
    () => assertEqual(serializePuzzle(puzzle()), serializePuzzle(puzzle()), "Equivalent puzzles serialized differently."),
  ],
  [
    "validates a generated puzzle",
    () => {
      const result = validatePuzzle(puzzle());
      assert(result.valid, JSON.stringify(result.issues));
    },
  ],
  [
    "detects a corrupted equation solution",
    () => {
      const value = puzzle();
      const firstNumber = value.cells.find((cell) => cell.kind === "number");
      assert(firstNumber?.kind === "number", "Missing number cell.");
      const broken: Puzzle = {
        ...value,
        cells: value.cells.map((cell) =>
          cell.id === firstNumber.id && cell.kind === "number"
            ? { ...cell, solution: cell.solution + 1, value: cell.given ? cell.value! + 1 : null }
            : cell,
        ),
      };
      assert(
        validatePuzzle(broken).issues.some((candidate) => candidate.code === "INVALID_EQUATION"),
        "Corrupted solution was not detected.",
      );
    },
  ],
  [
    "rejects unknown visible variables",
    () => {
      const skeleton = generateTopologySkeleton({ width: 9, height: 9, equationCount: 2, seed: 5 });
      const topology = materializeTopologySkeleton(skeleton, "add");
      const synthesis = synthesizeNumbers(buildEquationGraph(topology), { seed: 5 });
      let threw = false;
      try {
        createPuzzle(topology, synthesis, {
          id: "bad",
          difficulty: "easy",
          visibleVariableIds: ["missing-variable"],
        });
      } catch {
        threw = true;
      }
      assert(threw, "Unknown visible variable should be rejected.");
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
console.log(`${passed}/${tests.length} puzzle-creation tests passed.`);
