import { strict as assert } from "node:assert";
import { ACADEMY_SKILL_GRAPH } from "../../src/data/academySkillGraph";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import {
  buildAcademyAnalytics,
  buildAdaptiveCurriculum,
  buildCoachDashboard,
  buildPersonalizedPractice,
  calculateMasteryProfile,
  topologicalSkills,
  validateSkillAttempts,
  validateSkillGraph,
} from "../../src/services/CrossMathAcademy";
import type { SkillAttempt, SkillGraph } from "../../src/types/CrossMathAcademy";

const NOW = "2026-07-28T12:00:00Z";

function attempt(
  id: string,
  concept: SkillAttempt["concept"],
  overrides: Partial<SkillAttempt> = {},
): SkillAttempt {
  return {
    id,
    puzzleId: `puzzle-${id}`,
    concept,
    completed: true,
    stars: 3,
    hintsUsed: 0,
    mistakes: 0,
    elapsedMs: 15_000,
    completedAt: NOW,
    firstAttempt: true,
    ...overrides,
  };
}

function main(): void {
  assert.equal(validateSkillGraph(ACADEMY_SKILL_GRAPH), ACADEMY_SKILL_GRAPH);
  const ordered = topologicalSkills(ACADEMY_SKILL_GRAPH);
  assert.equal(ordered[0]?.id, "place-number");
  assert.ok(ordered.findIndex((skill) => skill.id === "addition") <
    ordered.findIndex((skill) => skill.id === "shared-number"));
  assert.ok(ordered.findIndex((skill) => skill.id === "multiplication") <
    ordered.findIndex((skill) => skill.id === "division"));

  const cyclic: SkillGraph = {
    schemaVersion: 1,
    skills: [
      {
        id: "addition",
        title: "Addition",
        description: "A",
        prerequisites: ["subtraction"],
        practiceThreshold: 50,
        masteryThreshold: 80,
      },
      {
        id: "subtraction",
        title: "Subtraction",
        description: "S",
        prerequisites: ["addition"],
        practiceThreshold: 50,
        masteryThreshold: 80,
      },
    ],
  };
  assert.throws(() => validateSkillGraph(cyclic), /cycle/);
  assert.throws(() => validateSkillGraph({
    schemaVersion: 1,
    skills: [{
      id: "addition",
      title: "Addition",
      description: "A",
      prerequisites: ["division"],
      practiceThreshold: 50,
      masteryThreshold: 80,
    }],
  }), /unknown prerequisite/);
  assert.throws(() => validateSkillGraph({
    schemaVersion: 1,
    skills: [{
      id: "addition",
      title: "Addition",
      description: "A",
      prerequisites: [],
      practiceThreshold: 80,
      masteryThreshold: 80,
    }],
  }), /thresholds/);

  const strongAttempts: SkillAttempt[] = [
    attempt("place-1", "place-number"),
    attempt("place-2", "place-number", { completedAt: "2026-07-27T12:00:00Z" }),
    attempt("place-3", "place-number", { completedAt: "2026-07-26T12:00:00Z" }),
    attempt("place-4", "place-number", { completedAt: "2026-07-25T12:00:00Z" }),
    attempt("place-5", "place-number", { completedAt: "2026-07-24T12:00:00Z" }),
    attempt("add-1", "addition", { stars: 1, hintsUsed: 4, mistakes: 3 }),
  ];
  const mastery = calculateMasteryProfile(ACADEMY_SKILL_GRAPH, strongAttempts, NOW);
  const place = mastery.skills.find((skill) => skill.concept === "place-number");
  const addition = mastery.skills.find((skill) => skill.concept === "addition");
  assert.equal(place?.band, "mastered");
  assert.equal(place?.score, 98);
  assert.equal(place?.confidence, 1);
  assert.equal(addition?.band, "developing");
  assert.equal(addition?.attempts, 1);
  assert.ok((addition?.score ?? 100) < 50);
  assert.equal(mastery.skills.find((skill) => skill.concept === "division")?.band, "not-started");
  assert.ok(mastery.overallScore > 0);

  assert.throws(() => validateSkillAttempts([
    attempt("same", "addition"),
    attempt("same", "addition"),
  ]), /Duplicate attempt/);
  assert.throws(() => validateSkillAttempts([
    attempt("bad-time", "addition", { completedAt: "not-a-date" }),
  ]), /valid timestamp/);

  const curriculum = buildAdaptiveCurriculum(
    LEARNING_CONTENT,
    ACADEMY_SKILL_GRAPH,
    mastery,
    NOW,
  );
  assert.equal(curriculum.recommendations[0]?.concept, "addition");
  assert.equal(curriculum.recommendations[0]?.kind, "practice");
  assert.ok(curriculum.blockedLessonIds.includes("lesson-003-shared-number"));
  assert.ok(curriculum.optionalLessonIds.includes("lesson-001-place-a-number"));

  const emptyMastery = calculateMasteryProfile(ACADEMY_SKILL_GRAPH, [], NOW);
  const emptyCurriculum = buildAdaptiveCurriculum(
    LEARNING_CONTENT,
    ACADEMY_SKILL_GRAPH,
    emptyMastery,
    NOW,
  );
  assert.equal(emptyCurriculum.recommendations[0]?.kind, "lesson");
  assert.equal(emptyCurriculum.recommendations[0]?.concept, "place-number");

  const practice = buildPersonalizedPractice(
    {
      content: LEARNING_CONTENT,
      library: BUNDLED_LIBRARY,
      graph: ACADEMY_SKILL_GRAPH,
    },
    mastery,
    { count: 2, seed: "learner-a" },
  );
  assert.equal(practice.concept, "addition");
  assert.ok(practice.puzzleIds.length > 0);
  assert.equal(practice.requestedCount, 2);
  assert.match(practice.reason, /Addition/);
  const practiceAgain = buildPersonalizedPractice(
    {
      content: LEARNING_CONTENT,
      library: BUNDLED_LIBRARY,
      graph: ACADEMY_SKILL_GRAPH,
    },
    mastery,
    { count: 2, seed: "learner-a" },
  );
  assert.deepEqual(practiceAgain, practice);
  assert.throws(() => buildPersonalizedPractice(
    {
      content: LEARNING_CONTENT,
      library: BUNDLED_LIBRARY,
      graph: ACADEMY_SKILL_GRAPH,
    },
    mastery,
    { count: 0, seed: "bad" },
  ), /positive integer/);

  const analyticsAttempts: SkillAttempt[] = [
    attempt("a1", "addition", {
      lessonId: "lesson-002-complete-an-equation",
      elapsedMs: 10_000,
    }),
    attempt("a2", "addition", {
      lessonId: "lesson-002-complete-an-equation",
      completed: false,
      stars: 0,
      hintsUsed: 2,
      mistakes: 1,
      elapsedMs: 20_000,
      firstAttempt: false,
    }),
    attempt("s1", "shared-number", {
      lessonId: "lesson-003-shared-number",
      stars: 2,
      hintsUsed: 1,
      elapsedMs: 30_000,
    }),
  ];
  const analytics = buildAcademyAnalytics(LEARNING_CONTENT, analyticsAttempts);
  assert.equal(analytics.totalAttempts, 3);
  assert.equal(analytics.totalCompletions, 2);
  const additionAnalytics = analytics.concepts.find((item) => item.concept === "addition");
  assert.equal(additionAnalytics?.attempts, 2);
  assert.equal(additionAnalytics?.completions, 1);
  assert.equal(additionAnalytics?.completionRate, 0.5);
  const lessonAnalytics = analytics.lessons.find(
    (item) => item.lessonId === "lesson-002-complete-an-equation",
  );
  assert.equal(lessonAnalytics?.attempts, 2);
  assert.equal(lessonAnalytics?.completions, 1);
  assert.equal(lessonAnalytics?.averageSolveTimeMs, 10_000);

  const learnerBMastery = calculateMasteryProfile(
    ACADEMY_SKILL_GRAPH,
    [attempt("b-place", "place-number", { stars: 1, hintsUsed: 4, mistakes: 2 })],
    NOW,
  );
  const learnerBCurriculum = buildAdaptiveCurriculum(
    LEARNING_CONTENT,
    ACADEMY_SKILL_GRAPH,
    learnerBMastery,
    NOW,
  );
  const dashboard = buildCoachDashboard([
    {
      learnerId: "learner-b",
      displayName: "Bailey",
      mastery: learnerBMastery,
      curriculum: learnerBCurriculum,
    },
    {
      learnerId: "learner-a",
      displayName: "Alex",
      mastery,
      curriculum,
    },
  ], NOW);
  assert.deepEqual(dashboard.learners.map((learner) => learner.displayName), ["Alex", "Bailey"]);
  assert.equal(dashboard.learners.length, 2);
  assert.ok(dashboard.classAverageMastery >= 0);
  assert.ok(dashboard.conceptsNeedingSupport.some((item) => item.concept === "addition"));
  assert.throws(() => buildCoachDashboard([
    {
      learnerId: "duplicate",
      displayName: "One",
      mastery,
      curriculum,
    },
    {
      learnerId: "duplicate",
      displayName: "Two",
      mastery,
      curriculum,
    },
  ], NOW), /Duplicate learner/);

  console.log("CrossMath Academy tests passed: 42/42");
}

main();
