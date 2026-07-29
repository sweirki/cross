import type {
  AcademyActivityCard,
  AcademyProgressSummary,
  AcademySkillCard,
  CoachDashboardPresentation,
  LearnerAcademyDashboard,
} from "../types/AcademyPresentation";
import type {
  AcademyRecommendation,
  AdaptiveCurriculum,
  CoachDashboard,
  MasteryProfile,
  SkillGraph,
} from "../types/CrossMathAcademy";
import { topologicalSkills, validateSkillGraph } from "./CrossMathAcademy";

function skillLevels(graph: SkillGraph): ReadonlyMap<string, number> {
  const levels = new Map<string, number>();
  for (const skill of topologicalSkills(graph)) {
    const level = skill.prerequisites.length === 0
      ? 0
      : 1 + Math.max(...skill.prerequisites.map((id) => levels.get(id) ?? 0));
    levels.set(skill.id, level);
  }
  return levels;
}

export function buildAcademyProgressSummary(mastery: MasteryProfile): AcademyProgressSummary {
  const count = (band: string) => mastery.skills.filter((skill) => skill.band === band).length;
  return {
    overallScore: mastery.overallScore,
    masteredCount: count("mastered"),
    proficientCount: count("proficient"),
    developingCount: count("developing"),
    notStartedCount: count("not-started"),
    totalSkills: mastery.skills.length,
  };
}

export function presentAcademyRecommendation(
  recommendation: AcademyRecommendation,
): AcademyActivityCard {
  const titles = {
    lesson: "Continue learning",
    practice: "Strengthen this skill",
    review: "Quick review",
    complete: "Academy complete",
  } as const;
  const actions = {
    lesson: "Start lesson",
    practice: "Practice now",
    review: "Review skill",
    complete: "View mastery",
  } as const;
  return {
    kind: recommendation.kind,
    title: titles[recommendation.kind],
    message: recommendation.reason,
    actionLabel: actions[recommendation.kind],
    concept: recommendation.concept,
    lessonId: recommendation.lessonId,
  };
}

export function buildLearnerAcademyDashboard(
  graph: SkillGraph,
  mastery: MasteryProfile,
  curriculum: AdaptiveCurriculum,
): LearnerAcademyDashboard {
  validateSkillGraph(graph);
  const masteryByConcept = new Map(mastery.skills.map((skill) => [skill.concept, skill] as const));
  const levels = skillLevels(graph);
  const skills: AcademySkillCard[] = topologicalSkills(graph).map((skill) => {
    const state = masteryByConcept.get(skill.id);
    if (state === undefined) throw new Error(`Mastery profile is missing ${skill.id}.`);
    const unlocked = skill.prerequisites.every((id) => {
      const prerequisite = masteryByConcept.get(id);
      const definition = graph.skills.find((candidate) => candidate.id === id);
      return prerequisite !== undefined && definition !== undefined &&
        prerequisite.score >= definition.practiceThreshold;
    });
    return {
      concept: skill.id,
      title: skill.title,
      description: skill.description,
      score: state.score,
      band: state.band,
      attempts: state.attempts,
      unlocked,
      prerequisiteIds: skill.prerequisites,
      level: levels.get(skill.id) ?? 0,
    };
  });
  const recommendation = curriculum.recommendations[0];
  if (recommendation === undefined) throw new Error("Academy curriculum has no recommendation.");
  return {
    generatedAt: mastery.generatedAt,
    summary: buildAcademyProgressSummary(mastery),
    nextActivity: presentAcademyRecommendation(recommendation),
    skills,
  };
}

export function buildCoachDashboardPresentation(
  dashboard: CoachDashboard,
): CoachDashboardPresentation {
  return {
    generatedAt: dashboard.generatedAt,
    classAverageMastery: dashboard.classAverageMastery,
    learnerCount: dashboard.learners.length,
    learners: dashboard.learners.map((learner) => ({
      learnerId: learner.learnerId,
      displayName: learner.displayName,
      overallScore: learner.mastery.overallScore,
      masteredSkills: learner.mastery.skills.filter((skill) => skill.band === "mastered").length,
      supportConcepts: learner.conceptsNeedingSupport,
      nextAction: learner.recommendation.reason,
    })),
    priorityConcepts: [...dashboard.conceptsNeedingSupport]
      .sort((left, right) => right.learnerCount - left.learnerCount ||
        left.concept.localeCompare(right.concept)),
  };
}
