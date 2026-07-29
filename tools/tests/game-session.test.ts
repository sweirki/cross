import {
  applyHint,
  buildGameView,
  createGameSession,
  placeTile,
  removeTile,
  restoreGameSession,
  serializeGameSession,
} from "../../src/game/engine";
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
  id: "runtime-test",
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
  ["creates an empty deterministic session", () => {
    const session = createGameSession(puzzle);
    assertEqual(session.puzzleId, puzzle.id, "Puzzle ID mismatch.");
    assertEqual(Object.keys(session.placements).length, 0, "Session should start empty.");
    assertEqual(session.completed, false, "Session should not start complete.");
  }],
  ["places a tile into an editable cell", () => {
    const session = placeTile(puzzle, createGameSession(puzzle), "n1", "t1");
    assertEqual(session.placements.n1, "t1", "Tile was not placed.");
    assertEqual(session.moves, 1, "Move counter mismatch.");
  }],
  ["moves a tile rather than duplicating it", () => {
    let session = placeTile(puzzle, createGameSession(puzzle), "n1", "t1");
    session = placeTile(puzzle, session, "n3", "t1");
    assert(session.placements.n1 === undefined, "Tile remained in its old cell.");
    assertEqual(session.placements.n3, "t1", "Tile was not moved.");
  }],
  ["rejects placement into a given", () => {
    let threw = false;
    try { placeTile(puzzle, createGameSession(puzzle), "n2", "t1"); } catch { threw = true; }
    assert(threw, "Given cell accepted a tile.");
  }],
  ["reports incomplete and incorrect equations", () => {
    let session = placeTile(puzzle, createGameSession(puzzle), "n1", "t2");
    session = placeTile(puzzle, session, "n3", "t1");
    const view = buildGameView(puzzle, session);
    assertEqual(view.equations[0]?.state, "incorrect", "Equation state mismatch.");
  }],
  ["detects completion only when every equation is correct", () => {
    let session = placeTile(puzzle, createGameSession(puzzle), "n1", "t1");
    session = placeTile(puzzle, session, "n3", "t2");
    assertEqual(session.completed, true, "Correct board was not completed.");
    assertEqual(buildGameView(puzzle, session).equations[0]?.state, "correct", "Equation should be correct.");
  }],
  ["removes a tile and returns it to the bank", () => {
    let session = placeTile(puzzle, createGameSession(puzzle), "n1", "t1");
    session = removeTile(puzzle, session, "n1");
    assertEqual(buildGameView(puzzle, session).availableTileIds.includes("t1"), true, "Tile was not returned.");
  }],
  ["applies deterministic hints", () => {
    const session = applyHint(puzzle, createGameSession(puzzle));
    assertEqual(session.placements.n1, "t1", "Hint chose the wrong first cell or tile.");
    assertEqual(session.hintsUsed, 1, "Hint counter mismatch.");
  }],
  ["serializes placements canonically", () => {
    let session = placeTile(puzzle, createGameSession(puzzle), "n3", "t2");
    session = placeTile(puzzle, session, "n1", "t1");
    assertEqual(
      serializeGameSession(session),
      serializeGameSession({ ...session, placements: { n3: "t2", n1: "t1" } }),
      "Serialization is not canonical.",
    );
  }],
  ["restores and validates persisted progress", () => {
    const original = placeTile(puzzle, createGameSession(puzzle), "n1", "t1");
    const restored = restoreGameSession(puzzle, JSON.parse(serializeGameSession(original)));
    assertEqual(restored.placements.n1, "t1", "Placement was not restored.");
    let threw = false;
    try {
      restoreGameSession(puzzle, { ...restored, placements: { n1: "missing" } });
    } catch { threw = true; }
    assert(threw, "Invalid persisted tile was accepted.");
  }],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} game-session tests passed.`);
