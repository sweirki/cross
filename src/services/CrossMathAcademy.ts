import type { ConceptId, LearningContent, LessonProfile } from "../types/LearningContent";
import type {
  AcademyAnalytics,
  AcademyContext,
  AcademyRecommendation,
  AdaptiveCurriculum,
  CoachDashboard,
  ConceptAnalytics,
  LearnerSummary,
  LessonAnalytics,
  MasteryBand,
  MasteryProfile,
  PersonalizedPracticePlan,
  PersonalizedPracticeRequest,
  SkillAttempt,
  SkillDefinition,
  SkillGraph,
  SkillMastery,
} from "../types/CrossMathAcademy";
import { buildPracticeSet } from "./PracticeGenerator";

const DAY_MS = 86_400_000;

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
}

function parseTimestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${label} must be a valid timestamp.`);
  return parsed;
}

export function validateSkillGraph(graph: SkillGraph): SkillGraph {
  if (graph.schemaVersion !== 1 || graph.skills.length === 0) {
    throw new Error("Skill graph metadata is invalid.");
  }
  const byId = new Map<ConceptId, SkillDefinition>();
  for (const skill of graph.skills) {
    if (byId.has(skill.id)) throw new Error(`Duplicate skill: ${skill.id}.`);
    if (skill.title.trim().length === 0 || skill.description.trim().length === 0) {
      throw new Error(`Skill ${skill.id} requires a title and description.`);
    }
    if (skill.practiceThreshold < 0 || skill.masteryThreshold > 100 ||
        skill.practiceThreshold >= skill.masteryThreshold) {
      throw new Error(`Skill ${skill.id} has invalid mastery thresholds.`);
    }
    if (new Set(skill.prerequisites).size !== skill.prerequisites.length) {
      throw new Error(`Skill ${skill.id} has duplicate prerequisites.`);
    }
    byId.set(skill.id, skill);
  }
  for (const skill of graph.skills) {
    for (const prerequisite of skill.prerequisites) {
      if (prerequisite === skill.id) throw new Error(`Skill ${skill.id} cannot require itself.`);
      if (!byId.has(prerequisite)) {
        throw new Error(`Skill ${skill.id} references unknown prerequisite ${prerequisite}.`);
      }
    }
  }

  const visiting = new Set<ConceptId>();
  const visited = new Set<ConceptId>();
  function visit(id: ConceptId): void {
    if (visiting.has(id)) throw new Error(`Skill graph contains a cycle at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of byId.get(id)!.prerequisites) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  }
  for (const skill of graph.skills) visit(skill.id);
  return graph;
}

export function topologicalSkills(graph: SkillGraph): readonly SkillDefinition[] {
  validateSkillGraph(graph);
  const byId = new Map(graph.skills.map((skill) => [skill.id, skill] as const));
  const visited = new Set<ConceptId>();
  const result: SkillDefinition[] = [];
  function visit(skill: SkillDefinition): void {
    if (visited.has(skill.id)) return;
    for (const prerequisite of skill.prerequisites) visit(byId.get(prerequisite)!);
    visited.add(skill.id);
    result.push(skill);
  }
  for (const skill of graph.skills) visit(skill);
  return result;
}

export function validateSkillAttempts(attempts: readonly SkillAttempt[]): readonly SkillAttempt[] {
  const ids = new Set<string>();
  for (const attempt of attempts) {
    if (attempt.id.trim().length === 0 || attempt.puzzleId.trim().length === 0) {
      throw new Error("Attempt identifiers are required.");
    }
    if (ids.has(attempt.id)) throw new Error(`Duplicate attempt: ${attempt.id}.`);
    ids.add(attempt.id);
    if (!Number.isInteger(attempt.stars) || attempt.stars < 0 || attempt.stars > 3) {
      throw new Error(`Attempt ${attempt.id} has invalid stars.`);
    }
    assertFiniteNonNegative(attempt.hintsUsed, "Hints used");
    assertFiniteNonNegative(attempt.mistakes, "Mistakes");
    assertFiniteNonNegative(attempt.elapsedMs, "Elapsed time");
    parseTimestamp(attempt.completedAt, "Attempt completion time");
  }
  return attempts;
}

function performanceScore(attempt: SkillAttempt): number {
  if (!attempt.completed) return 0;
  const score = 50 + attempt.stars * 16 -
    Math.min(25, attempt.hintsUsed * 5) -
    Math.min(20, attempt.mistakes * 4);
  return Math.max(0, Math.min(100, score));
}

function masteryBand(score: number, skill: SkillDefinition, attempts: number): MasteryBand {
  if (attempts === 0) return "not-started";
  if (score >= skill.masteryThreshold) return "mastered";
  if (score >= skill.practiceThreshold) return "proficient";
  return "developing";
}

export function calculateMasteryProfile(
  graph: SkillGraph,
  attempts: readonly SkillAttempt[],
  generatedAt: string,
): MasteryProfile {
  validateSkillGraph(graph);
  validateSkillAttempts(attempts);
  parseTimestamp(generatedAt, "Mastery generation time");

  const skills: SkillMastery[] = topologicalSkills(graph).map((skill) => {
    const relevant = attempts
      .filter((attempt) => attempt.concept === skill.id)
      .sort((left, right) =>
        parseTimestamp(left.completedAt, "Attempt completion time") -
        parseTimestamp(right.completedAt, "Attempt completion time") ||
        left.id.localeCompare(right.id));
    const recent = relevant.slice(-5);
    const completed = relevant.filter((attempt) => attempt.completed);
    const weightedTotal = recent.reduce(
      (sum, attempt, index) => sum + performanceScore(attempt) * (index + 1),
      0,
    );
    const weight = recent.reduce((sum, _attempt, index) => sum + index + 1, 0);
    const recentScore = weight === 0 ? 0 : Math.round(weightedTotal / weight);
    const confidence = Math.min(1, relevant.length / 5);
    const score = Math.round(recentScore * (0.7 + confidence * 0.3));
    const lastPracticedAt = relevant.length === 0
      ? null
      : relevant[relevant.length - 1]!.completedAt;
    return {
      concept: skill.id,
      score,
      band: masteryBand(score, skill, relevant.length),
      attempts: relevant.length,
      completedAttempts: completed.length,
      recentScore,
      confidence,
      lastPracticedAt,
    };
  });
  return {
    generatedAt,
    skills,
    overallScore: skills.length === 0
      ? 0
      : Math.round(skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length),
  };
}

function lessonForConcept(
  content: LearningContent,
  concept: ConceptId,
): LessonProfile | undefined {
  return [...content.lessons]
    .filter((lesson) => lesson.concept === concept)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))[0];
}

export function buildAdaptiveCurriculum(
  content: LearningContent,
  graph: SkillGraph,
  mastery: MasteryProfile,
  now: string,
): AdaptiveCurriculum {
  validateSkillGraph(graph);
  const nowMs = parseTimestamp(now, "Curriculum time");
  const skillById = new Map(graph.skills.map((skill) => [skill.id, skill] as const));
  const masteryById = new Map(mastery.skills.map((skill) => [skill.concept, skill] as const));
  const recommendations: AcademyRecommendation[] = [];
  const blockedLessonIds: string[] = [];
  const optionalLessonIds: string[] = [];

  for (const skill of topologicalSkills(graph)) {
    const state = masteryById.get(skill.id);
    if (state === undefined) throw new Error(`Mastery profile is missing ${skill.id}.`);
    const prerequisitesReady = skill.prerequisites.every((id) => {
      const prerequisiteState = masteryById.get(id);
      const prerequisiteSkill = skillById.get(id)!;
      return prerequisiteState !== undefined &&
        prerequisiteState.score >= prerequisiteSkill.practiceThreshold;
    });
    const lesson = lessonForConcept(content, skill.id);
    if (!prerequisitesReady) {
      if (lesson !== undefined) blockedLessonIds.push(lesson.id);
      continue;
    }
    if (state.attempts === 0) {
      recommendations.push({
        kind: "lesson",
        concept: skill.id,
        lessonId: lesson?.id ?? null,
        reason: `Start ${skill.title} to build this skill.`,
        priority: 100 - recommendations.length,
      });
      continue;
    }
    if (state.score < skill.practiceThreshold) {
      recommendations.push({
        kind: "practice",
        concept: skill.id,
        lessonId: lesson?.id ?? null,
        reason: `Practice ${skill.title}; current mastery is ${state.score}%.`,
        priority: 90 - state.score,
      });
      continue;
    }
    if (state.score < skill.masteryThreshold) {
      recommendations.push({
        kind: "practice",
        concept: skill.id,
        lessonId: lesson?.id ?? null,
        reason: `Strengthen ${skill.title} to reach mastery.`,
        priority: 60 - state.score / 2,
      });
      continue;
    }
    if (lesson !== undefined) optionalLessonIds.push(lesson.id);
    if (state.lastPracticedAt !== null &&
        nowMs - parseTimestamp(state.lastPracticedAt, "Last practiced time") >= 30 * DAY_MS) {
      recommendations.push({
        kind: "review",
        concept: skill.id,
        lessonId: lesson?.id ?? null,
        reason: `Review ${skill.title} to keep the skill fresh.`,
        priority: 30,
      });
    }
  }

  recommendations.sort((left, right) =>
    right.priority - left.priority ||
    (left.concept ?? "").localeCompare(right.concept ?? ""));
  if (recommendations.length === 0) {
    recommendations.push({
      kind: "complete",
      concept: null,
      lessonId: null,
      reason: "All available skills are currently mastered.",
      priority: 0,
    });
  }
  return {
    recommendations,
    blockedLessonIds: [...new Set(blockedLessonIds)].sort(),
    optionalLessonIds: [...new Set(optionalLessonIds)].sort(),
  };
}

export function buildPersonalizedPractice(
  context: AcademyContext,
  mastery: MasteryProfile,
  request: PersonalizedPracticeRequest,
): PersonalizedPracticePlan {
  if (!Number.isInteger(request.count) || request.count <= 0) {
    throw new Error("Practice count must be a positive integer.");
  }
  const adaptive = buildAdaptiveCurriculum(
    context.content,
    context.graph,
    mastery,
    mastery.generatedAt,
  );
  const target = adaptive.recommendations.find(
    (item) => item.kind === "practice" || item.kind === "review",
  ) ?? adaptive.recommendations.find((item) => item.kind === "lesson");
  if (target?.concept === null || target === undefined) {
    return {
      concept: null,
      puzzleIds: [],
      requestedCount: request.count,
      exhausted: true,
      reason: "No practice is currently required.",
    };
  }
  const practice = buildPracticeSet(context.content, context.library, {
    concept: target.concept,
    count: request.count,
    seed: request.seed,
    ...(request.excludePuzzleIds === undefined
      ? {}
      : { excludePuzzleIds: request.excludePuzzleIds }),
  });
  return {
    concept: target.concept,
    puzzleIds: practice.puzzleIds,
    requestedCount: request.count,
    exhausted: practice.exhausted,
    reason: target.reason,
  };
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 :
    Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export function buildAcademyAnalytics(
  content: LearningContent,
  attempts: readonly SkillAttempt[],
): AcademyAnalytics {
  validateSkillAttempts(attempts);
  const lessons: LessonAnalytics[] = [...content.lessons]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((lesson) => {
      const relevant = attempts.filter((attempt) => attempt.lessonId === lesson.id);
      const completed = relevant.filter((attempt) => attempt.completed);
      const firstAttempts = relevant.filter((attempt) => attempt.firstAttempt);
      return {
        lessonId: lesson.id,
        attempts: relevant.length,
        completions: completed.length,
        firstAttemptSuccessRate: firstAttempts.length === 0 ? 0 :
          average(firstAttempts.map((attempt) => attempt.completed ? 1 : 0)),
        averageHintsUsed: average(relevant.map((attempt) => attempt.hintsUsed)),
        averageMistakes: average(relevant.map((attempt) => attempt.mistakes)),
        averageSolveTimeMs: completed.length === 0
          ? null
          : Math.round(average(completed.map((attempt) => attempt.elapsedMs))),
      };
    });

  const conceptIds = [...new Set([
    ...content.lessons.map((lesson) => lesson.concept),
    ...attempts.map((attempt) => attempt.concept),
  ])].sort();
  const concepts: ConceptAnalytics[] = conceptIds.map((concept) => {
    const relevant = attempts.filter((attempt) => attempt.concept === concept);
    const completed = relevant.filter((attempt) => attempt.completed);
    return {
      concept,
      attempts: relevant.length,
      completions: completed.length,
      completionRate: relevant.length === 0 ? 0 : average([completed.length / relevant.length]),
      averageStars: average(relevant.map((attempt) => attempt.stars)),
      averageHintsUsed: average(relevant.map((attempt) => attempt.hintsUsed)),
    };
  });
  return {
    lessons,
    concepts,
    totalAttempts: attempts.length,
    totalCompletions: attempts.filter((attempt) => attempt.completed).length,
  };
}

export function buildCoachDashboard(
  learners: readonly {
    readonly learnerId: string;
    readonly displayName: string;
    readonly mastery: MasteryProfile;
    readonly curriculum: AdaptiveCurriculum;
  }[],
  generatedAt: string,
): CoachDashboard {
  parseTimestamp(generatedAt, "Dashboard generation time");
  const ids = new Set<string>();
  const summaries: LearnerSummary[] = learners.map((learner) => {
    if (learner.learnerId.trim().length === 0 || learner.displayName.trim().length === 0) {
      throw new Error("Learner identity is required.");
    }
    if (ids.has(learner.learnerId)) throw new Error(`Duplicate learner: ${learner.learnerId}.`);
    ids.add(learner.learnerId);
    const recommendation = learner.curriculum.recommendations[0];
    if (recommendation === undefined) throw new Error("Learner curriculum has no recommendation.");
    return {
      learnerId: learner.learnerId,
      displayName: learner.displayName,
      mastery: learner.mastery,
      recommendation,
      conceptsNeedingSupport: learner.mastery.skills
        .filter((skill) => skill.band === "developing")
        .map((skill) => skill.concept)
        .sort(),
    };
  }).sort((left, right) => left.displayName.localeCompare(right.displayName) ||
    left.learnerId.localeCompare(right.learnerId));

  const supportCounts = new Map<ConceptId, number>();
  for (const learner of summaries) {
    for (const concept of learner.conceptsNeedingSupport) {
      supportCounts.set(concept, (supportCounts.get(concept) ?? 0) + 1);
    }
  }
  return {
    generatedAt,
    learners: summaries,
    classAverageMastery: summaries.length === 0 ? 0 :
      Math.round(summaries.reduce((sum, learner) => sum + learner.mastery.overallScore, 0) /
        summaries.length),
    conceptsNeedingSupport: [...supportCounts.entries()]
      .map(([concept, learnerCount]) => ({ concept, learnerCount }))
      .sort((left, right) => right.learnerCount - left.learnerCount ||
        left.concept.localeCompare(right.concept)),
  };
}
