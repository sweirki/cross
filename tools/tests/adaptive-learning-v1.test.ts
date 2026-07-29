import {
  CrossMathAcademyRuntime,
  calculateMastery,
  validateAttempt,
  validateSkillGraph,
} from "../../src/academy/v1";
import type {
  AcademyAttempt,
  LessonSkillBinding,
  PracticePuzzleRef,
  SkillGraphDefinition,
} from "../../src/types/AdaptiveLearningRuntime";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message} Expected ${String(expected)}, got ${String(actual)}.`);
}
function throws(body: () => void, message: string): void {
  let failed = false; try { body(); } catch { failed = true; }
  assert(failed, message);
}
function attempt(
  id: string,
  skillId: string,
  overrides: Partial<AcademyAttempt> = {},
): AcademyAttempt {
  return {
    id, skillId, lessonId: `lesson-${skillId}`, completed: true, stars: 3,
    hintsUsed: 0, mistakes: 0, elapsedMs: 1000, occurredAt: Number(id.replace(/\D/g, "")) || 1,
    ...overrides,
  };
}

const graph: SkillGraphDefinition = {
  schemaVersion: 1,
  id: "academy",
  skills: [
    { id: "addition", title: "Addition", prerequisiteIds: [] },
    { id: "subtraction", title: "Subtraction", prerequisiteIds: ["addition"] },
    { id: "intersections", title: "Intersections", prerequisiteIds: ["addition"] },
    { id: "chains", title: "Dependency Chains", prerequisiteIds: ["subtraction", "intersections"] },
  ],
};
const lessons: readonly LessonSkillBinding[] = [
  { lessonId: "l-add", skillIds: ["addition"] },
  { lessonId: "l-sub", skillIds: ["subtraction"] },
  { lessonId: "l-int", skillIds: ["intersections"] },
  { lessonId: "l-chain", skillIds: ["chains"] },
];
const catalog: readonly PracticePuzzleRef[] = [
  { puzzleId: "p-add-2", skillIds: ["addition"], difficulty: "medium" },
  { puzzleId: "p-add-1", skillIds: ["addition"], difficulty: "easy" },
  { puzzleId: "p-sub", skillIds: ["subtraction"], difficulty: "easy" },
  { puzzleId: "p-int", skillIds: ["intersections"], difficulty: "easy" },
  { puzzleId: "p-chain", skillIds: ["chains"], difficulty: "hard" },
];

const runtime = new CrossMathAcademyRuntime();
let count = 0;
function test(name: string, body: () => void): void {
  body(); count += 1; console.log(`PASS ${name}`);
}

test("validates a prerequisite graph", () => validateSkillGraph(graph));
test("rejects empty graphs", () => throws(() => validateSkillGraph({ ...graph, skills: [] }), "Empty graph accepted."));
test("rejects duplicate skill IDs", () => throws(() => validateSkillGraph({
  ...graph, skills: [...graph.skills, graph.skills[0]!],
}), "Duplicate skill accepted."));
test("rejects missing prerequisites", () => throws(() => validateSkillGraph({
  ...graph, skills: [{ id: "x", title: "X", prerequisiteIds: ["missing"] }],
}), "Missing prerequisite accepted."));
test("rejects self prerequisites", () => throws(() => validateSkillGraph({
  ...graph, skills: [{ id: "x", title: "X", prerequisiteIds: ["x"] }],
}), "Self prerequisite accepted."));
test("rejects graph cycles", () => throws(() => validateSkillGraph({
  schemaVersion: 1, id: "cycle", skills: [
    { id: "a", title: "A", prerequisiteIds: ["b"] },
    { id: "b", title: "B", prerequisiteIds: ["a"] },
  ],
}), "Cycle accepted."));
test("rejects invalid mastery thresholds", () => throws(() => validateSkillGraph({
  ...graph, skills: [{ id: "x", title: "X", prerequisiteIds: [], masteryThreshold: 101 }],
}), "Bad threshold accepted."));

test("creates deterministic empty profiles", () => {
  const one = runtime.createProfile(graph, "player");
  const two = runtime.createProfile(graph, "player");
  equal(runtime.serialize(one), runtime.serialize(two), "Initial profiles differ.");
  equal(one.mastery[0]?.band, "not-started", "Initial mastery band is wrong.");
});
test("rejects unknown attempt skills", () =>
  throws(() => validateAttempt(graph, attempt("1", "missing")), "Unknown skill accepted."));
test("rejects invalid stars", () =>
  throws(() => validateAttempt(graph, attempt("1", "addition", { stars: 4 as 3 })), "Invalid stars accepted."));
test("records attempts and increments revision", () => {
  const transition = runtime.recordAttempt(graph, runtime.createProfile(graph, "p"), attempt("1", "addition"));
  equal(transition.state.revision, 1, "Revision did not increment.");
  equal(transition.state.attempts.length, 1, "Attempt not stored.");
  equal(transition.events[0]?.type, "attempt-recorded", "Attempt event missing.");
});
test("rejects duplicate attempt IDs", () => {
  const first = runtime.recordAttempt(graph, runtime.createProfile(graph, "p"), attempt("1", "addition")).state;
  throws(() => runtime.recordAttempt(graph, first, attempt("1", "addition")), "Duplicate attempt accepted.");
});
test("scores perfect attempts highly", () => {
  const mastery = calculateMastery(graph, [
    attempt("1", "addition"), attempt("2", "addition"), attempt("3", "addition"),
  ])[0]!;
  equal(mastery.score, 100, "Perfect mastery score is wrong.");
  equal(mastery.confidence, 60, "Confidence is wrong.");
  equal(mastery.band, "mastered", "Perfect skill was not mastered.");
});
test("penalizes hints and mistakes", () => {
  const clean = calculateMastery(graph, [attempt("1", "addition")])[0]!.score;
  const assisted = calculateMastery(graph, [attempt("1", "addition", { hintsUsed: 2, mistakes: 2 })])[0]!.score;
  assert(assisted < clean, "Hints and mistakes did not reduce mastery.");
});
test("weights recent attempts more heavily", () => {
  const improving = calculateMastery(graph, [
    attempt("1", "addition", { completed: false, stars: 0 }),
    attempt("2", "addition"),
  ])[0]!.score;
  const declining = calculateMastery(graph, [
    attempt("1", "addition"),
    attempt("2", "addition", { completed: false, stars: 0 }),
  ])[0]!.score;
  assert(improving > declining, "Recent attempts are not weighted more heavily.");
});
test("emits mastery band changes", () => {
  let state = runtime.createProfile(graph, "p");
  let latest = runtime.recordAttempt(graph, state, attempt("1", "addition")); state = latest.state;
  latest = runtime.recordAttempt(graph, state, attempt("2", "addition")); state = latest.state;
  latest = runtime.recordAttempt(graph, state, attempt("3", "addition"));
  assert(latest.events.some((event) => event.type === "skill-mastered"), "Mastery event missing.");
});

test("recommends the first available lesson", () => {
  const recommendation = runtime.recommend(graph, runtime.createProfile(graph, "p"), lessons, catalog);
  equal(recommendation.type, "lesson", "Wrong recommendation type.");
  if (recommendation.type === "lesson") equal(recommendation.skillId, "addition", "Wrong first skill.");
});
test("gates lessons behind prerequisites", () => {
  const profile = runtime.createProfile(graph, "p");
  const recommendation = runtime.recommend(graph, profile, lessons.filter((item) => item.lessonId !== "l-add"), catalog);
  equal(recommendation.type, "practice", "Locked prerequisite was bypassed.");
  if (recommendation.type === "practice") equal(recommendation.skillId, "addition", "Wrong gated skill.");
});
test("unlocks dependent lessons after mastery", () => {
  const profile = runtime.replay(graph, "p", [
    attempt("1", "addition"), attempt("2", "addition"), attempt("3", "addition"),
  ]);
  const recommendation = runtime.recommend(graph, profile, lessons, catalog);
  equal(recommendation.type, "lesson", "Dependent lesson not recommended.");
  if (recommendation.type === "lesson") assert(
    recommendation.skillId === "intersections" || recommendation.skillId === "subtraction",
    "Unexpected dependent skill.",
  );
});
test("recommends practice for attempted weak skills", () => {
  const profile = runtime.replay(graph, "p", [
    attempt("1", "addition", { completed: false, stars: 0 }),
  ]);
  const recommendation = runtime.recommend(graph, profile, lessons, catalog);
  equal(recommendation.type, "practice", "Weak skill did not receive practice.");
});
test("recommends stale review", () => {
  const profile = runtime.replay(graph, "p", [
    attempt("1", "addition", { occurredAt: 1 }),
  ]);
  const now = 31 * 24 * 60 * 60 * 1000;
  equal(runtime.recommend(graph, profile, lessons, catalog, now).type, "review", "Stale skill did not receive review.");
});
test("returns complete when all skills are mastered", () => {
  const attempts: AcademyAttempt[] = [];
  let n = 1;
  for (const skill of graph.skills) for (let i = 0; i < 3; i += 1) attempts.push(attempt(String(n++), skill.id));
  equal(runtime.recommend(graph, runtime.replay(graph, "p", attempts), lessons, catalog).type, "complete", "Completion missing.");
});
test("selects practice deterministically", () => {
  const selected = runtime.selectPractice("addition", [...catalog].reverse(), 2);
  equal(selected.join(","), "p-add-1,p-add-2", "Practice order is not deterministic.");
});
test("limits practice set size", () => equal(runtime.selectPractice("addition", catalog, 1).length, 1, "Practice limit ignored."));
test("emits recommendation events", () => {
  const result = runtime.recommendWithEvent(graph, runtime.createProfile(graph, "p"), lessons, catalog);
  equal(result.events[0]?.type, "recommendation-created", "Recommendation event missing.");
});

test("aggregates learning analytics", () => {
  const report = runtime.analytics(graph, [
    attempt("1", "addition"),
    attempt("2", "addition", { completed: false, stars: 0, hintsUsed: 2, mistakes: 1, elapsedMs: 3000 }),
  ]);
  equal(report.totalAttempts, 2, "Total attempts wrong.");
  equal(report.completedAttempts, 1, "Completed attempts wrong.");
  equal(report.skills[0]?.completionRate, 0.5, "Completion rate wrong.");
  equal(report.skills[0]?.averageStars, 1.5, "Average stars wrong.");
});
test("calculates first-attempt success by lesson", () => {
  const report = runtime.analytics(graph, [
    attempt("1", "addition", { lessonId: "same", completed: false, stars: 0 }),
    attempt("2", "addition", { lessonId: "same", completed: true }),
  ]);
  equal(report.skills[0]?.firstAttemptSuccessRate, 0, "First-attempt rate is wrong.");
});
test("returns zero analytics for untouched skills", () => {
  const report = runtime.analytics(graph, []);
  equal(report.skills[0]?.averageElapsedMs, 0, "Empty analytics should be zero.");
});

test("builds deterministic coach dashboards", () => {
  const a = runtime.replay(graph, "b", [attempt("1", "addition", { completed: false, stars: 0 })]);
  const b = runtime.replay(graph, "a", [attempt("2", "addition", { completed: false, stars: 0 })]);
  const dashboard = runtime.coachDashboard(graph, [a, b], lessons, catalog);
  equal(dashboard.learnerCount, 2, "Learner count wrong.");
  equal(dashboard.learners[0]?.playerId, "a", "Learners are not sorted.");
  equal(dashboard.prioritySupportSkillIds[0], "addition", "Priority support skill wrong.");
});
test("handles empty coach dashboards", () => {
  const dashboard = runtime.coachDashboard(graph, [], lessons, catalog);
  equal(dashboard.classAverageMastery, 0, "Empty class average should be zero.");
});

test("serializes canonically and restores", () => {
  const state = runtime.replay(graph, "p", [
    attempt("2", "addition", { occurredAt: 2 }),
    attempt("1", "addition", { occurredAt: 1 }),
  ]);
  const serialized = runtime.serialize(state);
  const restored = runtime.restore(graph, serialized);
  equal(runtime.serialize(restored), serialized, "Academy round trip changed state.");
});
test("rejects corrupt save JSON", () => throws(() => runtime.restore(graph, "{bad"), "Corrupt JSON accepted."));
test("rejects tampered mastery", () => {
  const state = runtime.replay(graph, "p", [attempt("1", "addition")]);
  const parsed = JSON.parse(runtime.serialize(state));
  parsed.mastery[0].score = 0;
  throws(() => runtime.restore(graph, JSON.stringify(parsed)), "Tampered mastery accepted.");
});
test("replay is deterministic across input order", () => {
  const rows = [attempt("2", "addition", { occurredAt: 2 }), attempt("1", "addition", { occurredAt: 1 })];
  equal(
    runtime.serialize(runtime.replay(graph, "p", rows)),
    runtime.serialize(runtime.replay(graph, "p", [...rows].reverse())),
    "Replay depends on input order.",
  );
});
test("replay preserves all attempts", () => {
  const state = runtime.replay(graph, "p", [attempt("1", "addition"), attempt("2", "addition")]);
  equal(state.attempts.length, 2, "Replay dropped attempts.");
});

console.log(`\n${count}/${count} phase-9 adaptive-learning tests passed.`);
