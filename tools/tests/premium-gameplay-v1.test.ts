
import { CrossMathPremiumRuntime } from "../../src/premium/v1";
import type { Puzzle } from "../../src/types/Puzzle";
import type { LearningContent } from "../../src/types/LearningContent";
import type { PuzzleLibrary } from "../../src/services/PuzzleLibrary";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function equal<T>(actual: T, expected: T, message: string): void { if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, got ${String(actual)}.`); }
function throws(body: () => void, message: string): void { let threw = false; try { body(); } catch { threw = true; } assert(threw, message); }

const puzzle: Puzzle = {
  schemaVersion: 1, id: "premium-v1", difficulty: "easy", width: 5, height: 1,
  cells: [
    { id: "a", kind: "number", position: { row: 0, col: 0 }, value: null, solution: 2, given: false, editable: true },
    { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
    { id: "b", kind: "number", position: { row: 0, col: 2 }, value: 3, solution: 3, given: true, editable: false },
    { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
    { id: "c", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
  ],
  equations: [{ id: "e", orientation: "horizontal", cellIds: ["a", "op", "b", "eq", "c"], operator: "+" }],
  numberBank: [{ id: "two", value: 2 }, { id: "five", value: 5 }],
};
const puzzle2 = { ...puzzle, id: "premium-v2", difficulty: "medium" as const };
const library: PuzzleLibrary = { schemaVersion: 1, id: "lib", puzzles: [puzzle, puzzle2] };
const content: LearningContent = {
  templates: [{
    schemaVersion: 1, id: "template", title: "Template", width: 5, height: 1,
    equations: [{ id: "e", orientation: "horizontal", start: { row: 0, column: 0 } }],
    concepts: ["addition"], allowedOperators: ["add"], minimumGivens: 1, recommendedDifficulty: "easy",
  }],
  lessons: [{
    schemaVersion: 1, id: "lesson", title: "Lesson", instruction: "Add",
    concept: "addition", templateId: "template", puzzleIds: [puzzle.id, puzzle2.id],
    order: 1, masteryStars: 2, guidance: [], completionMessage: "Done",
  }],
  campaign: {
    schemaVersion: 1, id: "campaign", title: "Campaign",
    chapters: [{ id: "chapter", title: "Chapter", description: "D", lessonIds: ["lesson"] }],
  },
};
const runtime = new CrossMathPremiumRuntime();
let count = 0;
function test(name: string, body: () => void): void { body(); count += 1; console.log(`PASS ${name}`); }
function solvedSession(hints = false) {
  let p = runtime.createProfile("player");
  let s = runtime.startSession(p, puzzle, 100).session;
  s = runtime.dispatch(puzzle, s, { type: "advance-time", milliseconds: 5000 }).session;
  if (hints) s = runtime.requestHint(puzzle, s, 1).session;
  s = runtime.dispatch(puzzle, s, { type: "place", cellId: "a", tileId: "two" }).session;
  s = runtime.dispatch(puzzle, s, { type: "place", cellId: "c", tileId: "five" }).session;
  return { p, s };
}

test("creates deterministic profiles", () => equal(runtime.serializeProfile(runtime.createProfile("p")), runtime.serializeProfile(runtime.createProfile("p")), "Profiles differ."));
test("rejects empty player IDs", () => throws(() => runtime.createProfile(""), "Empty player accepted."));
test("normalizes accessibility", () => equal(runtime.createProfile("p", { textScale: 1.5 }).accessibility.textScale, 1.5, "Scale mismatch."));
test("starts sessions", () => equal(runtime.startSession(runtime.createProfile("p"), puzzle, 10).events[0]?.type, "session-started", "Missing event."));
test("rejects invalid start time", () => throws(() => runtime.startSession(runtime.createProfile("p"), puzzle, -1), "Invalid time accepted."));
test("dispatches game actions", () => {
  let s = runtime.startSession(runtime.createProfile("p"), puzzle, 0).session;
  s = runtime.dispatch(puzzle, s, { type: "place", cellId: "a", tileId: "two" }).session;
  equal(s.runtime.history.present.placements.a, "two", "Placement failed.");
});
test("emits completion feedback", () => {
  const { s } = solvedSession();
  assert(s.runtime.status === "completed", "Not completed.");
});
test("advances hints progressively", () => {
  let s = runtime.startSession(runtime.createProfile("p"), puzzle, 0).session;
  const h1 = runtime.requestHint(puzzle, s); s = h1.session;
  const h2 = runtime.requestHint(puzzle, s);
  equal(h1.hint?.level, 1, "Wrong first level."); equal(h2.hint?.level, 2, "Wrong second level.");
});
test("supports explicit hint levels", () => equal(runtime.requestHint(puzzle, runtime.startSession(runtime.createProfile("p"), puzzle, 0).session, 5).hint?.kind, "reveal-value", "Wrong hint."));
test("rejects bad hint levels", () => throws(() => runtime.requestHint(puzzle, runtime.startSession(runtime.createProfile("p"), puzzle, 0).session, 6 as never), "Bad level accepted."));
test("counts hint usage", () => equal(solvedSession(true).s.runtime.history.present.hintsUsed, 1, "Hint not counted."));
test("records completed attempts", () => {
  const { p, s } = solvedSession(); const r = runtime.completeAttempt(p, s, { concept: "addition", completedAt: "2026-07-28T10:00:00Z" });
  equal(r.profile.attempts.length, 1, "Attempt missing."); equal(r.profile.attempts[0]?.stars, 3, "Stars wrong.");
});
test("penalizes hinted solves", () => {
  const { p, s } = solvedSession(true); equal(runtime.completeAttempt(p, s, { completedAt: "2026-07-28T10:00:00Z" }).profile.attempts[0]?.stars, 2, "Hint penalty wrong.");
});
test("rejects incomplete attempts", () => {
  const p = runtime.createProfile("p"); const s = runtime.startSession(p, puzzle, 0).session;
  throws(() => runtime.completeAttempt(p, s, { completedAt: "2026-07-28T10:00:00Z" }), "Incomplete accepted.");
});
test("rejects cross-player attempts", () => {
  const { s } = solvedSession(); throws(() => runtime.completeAttempt(runtime.createProfile("other"), s, { completedAt: "2026-07-28T10:00:00Z" }), "Cross-player accepted.");
});
test("rejects duplicate attempts", () => {
  const { p, s } = solvedSession(); const a = runtime.completeAttempt(p, s, { completedAt: "2026-07-28T10:00:00Z" }).profile;
  throws(() => runtime.completeAttempt(a, s, { completedAt: "2026-07-28T10:00:00Z" }), "Duplicate accepted.");
});
test("builds deterministic practice", () => {
  const a = runtime.buildPractice(content, library, "addition", 2, "seed");
  const b = runtime.buildPractice(content, library, "addition", 2, "seed");
  equal(JSON.stringify(a), JSON.stringify(b), "Practice differs.");
});
test("excludes practice puzzles", () => {
  const p = runtime.buildPractice(content, library, "addition", 2, "seed", [puzzle.id]);
  assert(!p.puzzleIds.includes(puzzle.id), "Excluded puzzle returned.");
});
test("rejects invalid practice count", () => throws(() => runtime.buildPractice(content, library, "addition", 0, "seed"), "Zero count accepted."));
test("selects deterministic daily puzzles", () => {
  const a = runtime.selectDaily(library, "2026-07-28", { namespace: "premium" });
  const b = runtime.selectDaily(library, "2026-07-28", { namespace: "premium" });
  equal(a.puzzle.id, b.puzzle.id, "Daily differs.");
});
test("honors daily difficulty policy", () => equal(runtime.selectDaily(library, "2026-07-28", { namespace: "p", difficultyByWeekday: { 2: "easy" } }).puzzle.difficulty, "easy", "Policy ignored."));
test("rejects invalid daily dates", () => throws(() => runtime.selectDaily(library, "bad", { namespace: "p" }), "Bad date accepted."));
test("marks daily completion once", () => {
  const p = runtime.createProfile("p"); const a = runtime.markDailyComplete(p, "2026-07-28"); const b = runtime.markDailyComplete(a.profile, "2026-07-28");
  equal(a.profile.completedDailyDates.length, 1, "Date missing."); equal(b.events.length, 0, "Duplicate event emitted.");
});
test("summarizes statistics", () => {
  const { p, s } = solvedSession(); const p2 = runtime.completeAttempt(p, s, { concept: "addition", completedAt: "2026-07-28T10:00:00Z" }).profile;
  equal(runtime.statistics(p2).puzzlesCompleted, 1, "Stats wrong.");
});
test("updates accessibility", () => {
  const r = runtime.updateAccessibility(runtime.createProfile("p"), { reducedMotion: true });
  equal(r.profile.accessibility.reducedMotion, true, "Preference missing."); equal(r.events[0]?.type, "accessibility-updated", "Event missing.");
});
test("rejects invalid accessibility", () => throws(() => runtime.updateAccessibility(runtime.createProfile("p"), { textScale: 9 }), "Invalid scale accepted."));
test("serializes profiles canonically", () => {
  const p = runtime.createProfile("p"); equal(runtime.serializeProfile(runtime.restoreProfile(runtime.serializeProfile(p))), runtime.serializeProfile(p), "Profile roundtrip failed.");
});
test("rejects corrupt profile JSON", () => throws(() => runtime.restoreProfile("{"), "Corrupt profile accepted."));
test("serializes sessions canonically", () => {
  const s = runtime.startSession(runtime.createProfile("p"), puzzle, 0).session;
  equal(runtime.serializeSession(runtime.restoreSession(puzzle, runtime.serializeSession(s))), runtime.serializeSession(s), "Session roundtrip failed.");
});
test("rejects corrupt session JSON", () => throws(() => runtime.restoreSession(puzzle, "{"), "Corrupt session accepted."));
test("rejects mismatched session puzzles", () => {
  const s = runtime.startSession(runtime.createProfile("p"), puzzle, 0).session;
  throws(() => runtime.restoreSession(puzzle2, runtime.serializeSession(s)), "Mismatch accepted.");
});
test("replays deterministically", () => {
  const p = runtime.createProfile("p"); const actions = [{ type: "advance-time", milliseconds: 1000 }, { type: "place", cellId: "a", tileId: "two" }] as const;
  const a = runtime.replay(puzzle, p, actions, 0); const b = runtime.replay(puzzle, p, actions, 0);
  equal(runtime.serializeSession(a.session), runtime.serializeSession(b.session), "Replay differs.");
});

console.log(`\n${count}/${count} phase-10 premium-gameplay tests passed.`);
