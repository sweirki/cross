import { strict as assert } from "node:assert";
import { ACADEMY_SKILL_GRAPH } from "../../src/data/academySkillGraph";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import {
  buildAdaptiveCurriculum,
  buildCoachDashboard,
  calculateMasteryProfile,
} from "../../src/services/CrossMathAcademy";
import {
  buildAcademyProgressSummary,
  buildCoachDashboardPresentation,
  buildLearnerAcademyDashboard,
  presentAcademyRecommendation,
} from "../../src/services/AcademyPresentation";
import type { SkillAttempt } from "../../src/types/CrossMathAcademy";

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
    elapsedMs: 12_000,
    completedAt: NOW,
    firstAttempt: true,
    ...overrides,
  };
}

function main(): void {
  const emptyMastery = calculateMasteryProfile(ACADEMY_SKILL_GRAPH, [], NOW);
  const emptyCurriculum = buildAdaptiveCurriculum(
    LEARNING_CONTENT,
    ACADEMY_SKILL_GRAPH,
    emptyMastery,
    NOW,
  );
  const dashboard = buildLearnerAcademyDashboard(
    ACADEMY_SKILL_GRAPH,
    emptyMastery,
    emptyCurriculum,
  );

  assert.equal(dashboard.summary.overallScore, 0);
  assert.equal(dashboard.summary.totalSkills, 8);
  assert.equal(dashboard.summary.notStartedCount, 8);
  assert.equal(dashboard.summary.masteredCount, 0);
  assert.equal(dashboard.nextActivity.kind, "lesson");
  assert.equal(dashboard.nextActivity.concept, "place-number");
  assert.equal(dashboard.nextActivity.actionLabel, "Start lesson");
  assert.equal(dashboard.skills.length, 8);
  assert.equal(dashboard.skills[0]?.concept, "place-number");
  assert.equal(dashboard.skills[0]?.unlocked, true);
  assert.equal(dashboard.skills[0]?.level, 0);
  assert.equal(dashboard.skills.find((skill) => skill.concept === "addition")?.unlocked, false);
  assert.equal(dashboard.skills.find((skill) => skill.concept === "division")?.level, 3);

  const practiced = [
    attempt("place-1", "place-number"),
    attempt("place-2", "place-number"),
    attempt("addition-1", "addition", { stars: 2, hintsUsed: 1 }),
  ];
  const mastery = calculateMasteryProfile(ACADEMY_SKILL_GRAPH, practiced, NOW);
  const curriculum = buildAdaptiveCurriculum(
    LEARNING_CONTENT,
    ACADEMY_SKILL_GRAPH,
    mastery,
    NOW,
  );
  const practicedDashboard = buildLearnerAcademyDashboard(
    ACADEMY_SKILL_GRAPH,
    mastery,
    curriculum,
  );
  assert.equal(
    practicedDashboard.skills.find((skill) => skill.concept === "addition")?.unlocked,
    true,
  );
  assert.ok(practicedDashboard.summary.overallScore > 0);
  assert.equal(
    practicedDashboard.summary.masteredCount +
      practicedDashboard.summary.proficientCount +
      practicedDashboard.summary.developingCount +
      practicedDashboard.summary.notStartedCount,
    practicedDashboard.summary.totalSkills,
  );

  const practiceCard = presentAcademyRecommendation({
    kind: "practice",
    concept: "addition",
    lessonId: "lesson-002-complete-an-equation",
    reason: "Practice Addition.",
    priority: 90,
  });
  assert.equal(practiceCard.title, "Strengthen this skill");
  assert.equal(practiceCard.actionLabel, "Practice now");
  assert.equal(practiceCard.message, "Practice Addition.");

  const summary = buildAcademyProgressSummary(mastery);
  assert.equal(summary.totalSkills, ACADEMY_SKILL_GRAPH.skills.length);
  assert.equal(summary.overallScore, mastery.overallScore);

  const coach = buildCoachDashboard([
    {
      learnerId: "learner-b",
      displayName: "Bailey",
      mastery: emptyMastery,
      curriculum: emptyCurriculum,
    },
    {
      learnerId: "learner-a",
      displayName: "Alex",
      mastery,
      curriculum,
    },
  ], NOW);
  const coachView = buildCoachDashboardPresentation(coach);
  assert.equal(coachView.learnerCount, 2);
  assert.equal(coachView.learners[0]?.displayName, "Alex");
  assert.equal(coachView.learners[1]?.displayName, "Bailey");
  assert.equal(coachView.classAverageMastery, coach.classAverageMastery);
  assert.equal(coachView.learners[0]?.overallScore, mastery.overallScore);
  assert.ok(coachView.learners[1]?.nextAction.length > 0);
  assert.deepEqual(
    [...coachView.priorityConcepts],
    [...coachView.priorityConcepts].sort((left, right) =>
      right.learnerCount - left.learnerCount || left.concept.localeCompare(right.concept)),
  );

  assert.throws(
    () => buildLearnerAcademyDashboard(
      ACADEMY_SKILL_GRAPH,
      { ...emptyMastery, skills: emptyMastery.skills.slice(1) },
      emptyCurriculum,
    ),
    /missing place-number/,
  );

  console.log("academy-presentation.test.ts: 29 assertions passed");
}

main();
