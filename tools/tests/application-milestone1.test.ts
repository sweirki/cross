import { CrossMathApplicationRuntime } from "../../src/application/v1/CrossMathApplicationRuntime";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";

let passed = 0;
function test(name: string, run: () => void): void {
  try { run(); console.log(`PASS ${name}`); passed += 1; }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
}
function equal(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function throws(run: () => void): void {
  let didThrow = false; try { run(); } catch { didThrow = true; }
  if (!didThrow) throw new Error("Expected an error.");
}

const runtime = new CrossMathApplicationRuntime();
test("creates deterministic progress", () => equal(runtime.create("p1"), runtime.create("p1")));
test("rejects empty player IDs", () => throws(() => runtime.create(" ")));
test("records last puzzle and lesson", () => {
  const state = runtime.recordPuzzleStarted(runtime.create("p1"), "a", "lesson");
  equal([state.lastPuzzleId, state.lastLessonId, state.revision], ["a", "lesson", 1]);
});
test("records completed puzzles", () => {
  const state = runtime.recordPuzzleCompleted(runtime.create("p1"), "a", 2, 0, "2026-01-01T00:00:00.000Z");
  equal([state.puzzleProgress.a?.completed, state.puzzleProgress.a?.stars], [true, 3]);
});
test("preserves best completion", () => {
  let state = runtime.recordPuzzleCompleted(runtime.create("p1"), "a", 8, 2, "2026-01-01T00:00:00.000Z");
  state = runtime.recordPuzzleCompleted(state, "a", 3, 0, "2026-01-02T00:00:00.000Z");
  equal([state.puzzleProgress.a?.bestMoves, state.puzzleProgress.a?.stars], [3, 3]);
});
test("rejects invalid completion metrics", () => throws(() => runtime.recordPuzzleCompleted(runtime.create("p1"), "a", -1, 0, "x")));
test("marks a daily challenge once", () => {
  let state = runtime.markDailyComplete(runtime.create("p1"), "2026-01-01");
  state = runtime.markDailyComplete(state, "2026-01-01");
  equal(state.dailyChallengeDates, ["2026-01-01"]);
});
test("rejects invalid daily dates", () => throws(() => runtime.markDailyComplete(runtime.create("p1"), "bad")));
test("recommends the first lesson initially", () => equal(runtime.nextLesson(LEARNING_CONTENT, runtime.create("p1"))?.id, LEARNING_CONTENT.lessons[0]?.id));
test("unlocks lessons sequentially", () => {
  let state = runtime.create("p1");
  equal(runtime.isLessonUnlocked(LEARNING_CONTENT, state, LEARNING_CONTENT.lessons[1]!.id), false);
  state = runtime.recordPuzzleCompleted(state, LEARNING_CONTENT.lessons[0]!.puzzleIds[0]!, 2, 0, "2026-01-01T00:00:00.000Z");
  equal(runtime.isLessonUnlocked(LEARNING_CONTENT, state, LEARNING_CONTENT.lessons[1]!.id), true);
});
test("selects daily puzzles deterministically", () => equal(runtime.dailyPuzzle(BUNDLED_LIBRARY.puzzles, "2026-01-01").id, runtime.dailyPuzzle(BUNDLED_LIBRARY.puzzles, "2026-01-01").id));
test("selects unfinished practice first", () => equal(runtime.practicePuzzle(BUNDLED_LIBRARY.puzzles, runtime.create("p1")).id, BUNDLED_LIBRARY.puzzles[0]!.id));
test("serializes canonically", () => {
  const state = runtime.create("p1");
  equal(runtime.serialize(state), runtime.serialize(state));
});
test("restores valid progress", () => {
  const state = runtime.create("p1");
  equal(runtime.serialize(runtime.restore("p1", runtime.serialize(state))), runtime.serialize(state));
});
test("rejects corrupt JSON", () => throws(() => runtime.restore("p1", "{")));
test("rejects cross-player progress", () => throws(() => runtime.restore("p2", runtime.serialize(runtime.create("p1")))));

console.log(`\n${passed}/16 milestone-1 application tests passed.`);
