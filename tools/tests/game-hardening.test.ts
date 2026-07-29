import {
  canRedo,
  canUndo,
  createGameHistory,
  reduceGameHistory,
} from "../../src/game/engine";
import {
  parsePuzzleLibrary,
  selectPuzzle,
  validatePuzzleLibrary,
} from "../../src/services/PuzzleLibrary";
import type { Puzzle } from "../../src/types/Puzzle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

const puzzle: Puzzle = {
  schemaVersion: 1,
  id: "hardening-test",
  difficulty: "easy",
  width: 5,
  height: 1,
  cells: [
    { id: "n1", kind: "number", position: { row: 0, col: 0 }, value: null, solution: 2, given: false, editable: true },
    { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
    { id: "n2", kind: "number", position: { row: 0, col: 2 }, value: 3, solution: 3, given: true, editable: false },
    { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
    { id: "n3", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
  ],
  equations: [
    { id: "e1", orientation: "horizontal", cellIds: ["n1", "op", "n2", "eq", "n3"], operator: "+" },
  ],
  numberBank: [
    { id: "t1", value: 2 },
    { id: "t2", value: 5 },
  ],
};

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ["creates history with no undo or redo", () => {
    const history = createGameHistory(puzzle);
    assertEqual(canUndo(history), false, "Fresh history allowed undo.");
    assertEqual(canRedo(history), false, "Fresh history allowed redo.");
  }],
  ["records a placement as an undo step", () => {
    const history = reduceGameHistory(
      puzzle,
      createGameHistory(puzzle),
      { type: "place", cellId: "n1", tileId: "t1" },
    );
    assertEqual(canUndo(history), true, "Placement did not create history.");
    assertEqual(history.present.placements.n1, "t1", "Placement missing.");
  }],
  ["undo restores the previous session", () => {
    let history = reduceGameHistory(
      puzzle,
      createGameHistory(puzzle),
      { type: "place", cellId: "n1", tileId: "t1" },
    );
    history = reduceGameHistory(puzzle, history, { type: "undo" });
    assert(history.present.placements.n1 === undefined, "Undo did not restore state.");
    assertEqual(canRedo(history), true, "Undo did not create redo state.");
  }],
  ["redo reapplies the undone session", () => {
    let history = reduceGameHistory(
      puzzle,
      createGameHistory(puzzle),
      { type: "place", cellId: "n1", tileId: "t1" },
    );
    history = reduceGameHistory(puzzle, history, { type: "undo" });
    history = reduceGameHistory(puzzle, history, { type: "redo" });
    assertEqual(history.present.placements.n1, "t1", "Redo did not restore placement.");
  }],
  ["new actions clear the redo stack", () => {
    let history = reduceGameHistory(
      puzzle,
      createGameHistory(puzzle),
      { type: "place", cellId: "n1", tileId: "t1" },
    );
    history = reduceGameHistory(puzzle, history, { type: "undo" });
    history = reduceGameHistory(puzzle, history, { type: "place", cellId: "n3", tileId: "t2" });
    assertEqual(canRedo(history), false, "New action retained stale redo state.");
  }],
  ["no-op removals do not create history", () => {
    const initial = createGameHistory(puzzle);
    const next = reduceGameHistory(puzzle, initial, { type: "remove", cellId: "n1" });
    assertEqual(next, initial, "No-op removal changed history.");
  }],
  ["restore resets undo and redo state", () => {
    let history = reduceGameHistory(
      puzzle,
      createGameHistory(puzzle),
      { type: "place", cellId: "n1", tileId: "t1" },
    );
    history = reduceGameHistory(puzzle, history, { type: "restore", session: history.present });
    assertEqual(canUndo(history), false, "Restore retained undo state.");
    assertEqual(canRedo(history), false, "Restore retained redo state.");
  }],
  ["parses and selects a puzzle library", () => {
    const library = parsePuzzleLibrary(JSON.stringify({
      schemaVersion: 1,
      id: "test-library",
      puzzles: [puzzle],
    }));
    assertEqual(selectPuzzle(library).id, puzzle.id, "Wrong puzzle selected.");
  }],
  ["selects puzzles by difficulty", () => {
    const library = validatePuzzleLibrary({
      schemaVersion: 1,
      id: "test-library",
      puzzles: [puzzle],
    });
    assertEqual(selectPuzzle(library, { difficulty: "easy" }).id, puzzle.id, "Difficulty selection failed.");
  }],
  ["rejects duplicate puzzle IDs", () => {
    let threw = false;
    try {
      validatePuzzleLibrary({
        schemaVersion: 1,
        id: "duplicates",
        puzzles: [puzzle, puzzle],
      });
    } catch {
      threw = true;
    }
    assert(threw, "Duplicate puzzle IDs were accepted.");
  }],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} game-hardening tests passed.`);
