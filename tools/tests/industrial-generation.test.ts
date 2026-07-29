
import { fingerprintPuzzle, generateIndustrialLibrary } from "../../src/game/generator";
import type { Puzzle } from "../../src/types/Puzzle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
}

function puzzle(id: string, left = 2, right = 3): Puzzle {
  return {
    schemaVersion: 1,
    id,
    difficulty: "easy",
    width: 5,
    height: 1,
    cells: [
      { id: "n1", kind: "number", position: { row: 0, col: 0 }, value: left, solution: left, given: true, editable: false },
      { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
      { id: "n2", kind: "number", position: { row: 0, col: 2 }, value: null, solution: right, given: false, editable: true },
      { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
      { id: "n3", kind: "number", position: { row: 0, col: 4 }, value: null, solution: left + right, given: false, editable: true },
    ],
    equations: [{ id: "e1", orientation: "horizontal", cellIds: ["n1", "op", "n2", "eq", "n3"], operator: "+" }],
    numberBank: [{ id: "t1", value: right }, { id: "t2", value: left + right }],
  };
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ["creates deterministic fingerprints", () => {
    assertEqual(JSON.stringify(fingerprintPuzzle(puzzle("a"))), JSON.stringify(fingerprintPuzzle(puzzle("b"))), "Puzzle IDs must not affect fingerprints.");
  }],
  ["separates solution fingerprints", () => {
    assert(fingerprintPuzzle(puzzle("a", 2, 3)).solution !== fingerprintPuzzle(puzzle("b", 4, 3)).solution, "Solutions should differ.");
  }],
  ["generates a deterministic batch", () => {
    const request = { rootSeed: "root", count: 2, chunkSize: 1, maximumAttempts: 4 };
    const first = generateIndustrialLibrary(request, (index) => puzzle(`p-${index}`, index + 2, 3));
    const second = generateIndustrialLibrary(request, (index) => puzzle(`p-${index}`, index + 2, 3));
    assertEqual(JSON.stringify(first), JSON.stringify(second), "Batch output differs.");
  }],
  ["chunks records deterministically", () => {
    const result = generateIndustrialLibrary({ rootSeed: "r", count: 3, chunkSize: 2, maximumAttempts: 5 }, (i) => puzzle(`p-${i}`, i + 2, 3));
    assertEqual(result.chunks.length, 2, "Chunk count mismatch.");
    assertEqual(result.chunks[0]!.length, 2, "First chunk mismatch.");
  }],
  ["rejects exact duplicates", () => {
    const result = generateIndustrialLibrary({ rootSeed: "r", count: 2, chunkSize: 2, maximumAttempts: 3 }, (i) => i < 2 ? puzzle(`p-${i}`) : puzzle("unique", 4, 3));
    assertEqual(result.records.length, 2, "Accepted count mismatch.");
    assertEqual(result.manifest.rejectedDuplicates, 1, "Duplicate count mismatch.");
  }],
  ["supports structural duplicate rejection", () => {
    const result = generateIndustrialLibrary({ rootSeed: "r", count: 2, chunkSize: 2, maximumAttempts: 2, rejectStructuralDuplicates: true }, (i) => puzzle(`p-${i}`, i + 2, 3));
    assertEqual(result.records.length, 1, "Structural duplicates should be rejected.");
  }],
  ["records invalid candidates", () => {
    const result = generateIndustrialLibrary({ rootSeed: "r", count: 1, chunkSize: 1, maximumAttempts: 2 }, (i) => i === 0 ? undefined : puzzle("ok"));
    assertEqual(result.manifest.rejectedInvalid, 1, "Invalid count mismatch.");
  }],
  ["resumes from a checkpoint", () => {
    const first = generateIndustrialLibrary({ rootSeed: "r", count: 1, chunkSize: 1, maximumAttempts: 1 }, (i) => puzzle(`p-${i}`, i + 2, 3));
    const second = generateIndustrialLibrary({ rootSeed: "r", count: 1, chunkSize: 1, maximumAttempts: 2, checkpoint: first.checkpoint }, (i) => puzzle(`p-${i}`, i + 2, 3));
    assertEqual(second.records[0]!.attemptIndex, 1, "Resume attempt mismatch.");
    assertEqual(second.checkpoint.accepted, 2, "Cumulative accepted mismatch.");
  }],
  ["builds a difficulty distribution", () => {
    const result = generateIndustrialLibrary({ rootSeed: "r", count: 1, chunkSize: 1, maximumAttempts: 1 }, () => puzzle("p"));
    assertEqual(Object.values(result.manifest.difficultyDistribution).reduce((a,b)=>a+b,0), 1, "Distribution mismatch.");
  }],
  ["validates request and checkpoint compatibility", () => {
    const first = generateIndustrialLibrary({ rootSeed: "r", count: 1, chunkSize: 1, maximumAttempts: 1 }, () => puzzle("p"));
    let threw = false;
    try {
      generateIndustrialLibrary({ rootSeed: "other", count: 1, chunkSize: 1, maximumAttempts: 1, checkpoint: first.checkpoint }, () => puzzle("p"));
    } catch { threw = true; }
    assert(threw, "Mismatched checkpoint should throw.");
  }],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} industrial-generation tests passed.`);
