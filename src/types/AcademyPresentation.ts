import type { ConceptId } from "./LearningContent";
import type {
  AcademyRecommendation,
  CoachDashboard,
  MasteryBand,
  MasteryProfile,
  SkillGraph,
} from "./CrossMathAcademy";

export interface AcademySkillCard {
  readonly concept: ConceptId;
  readonly title: string;
  readonly description: string;
  readonly score: number;
  readonly band: MasteryBand;
  readonly attempts: number;
  readonly unlocked: boolean;
  readonly prerequisiteIds: readonly ConceptId[];
  readonly level: number;
}

export interface AcademyProgressSummary {
  readonly overallScore: number;
  readonly masteredCount: number;
  readonly proficientCount: number;
  readonly developingCount: number;
  readonly notStartedCount: number;
  readonly totalSkills: number;
}

export interface AcademyActivityCard {
  readonly kind: AcademyRecommendation["kind"];
  readonly title: string;
  readonly message: string;
  readonly actionLabel: string;
  readonly concept: ConceptId | null;
  readonly lessonId: string | null;
}

export interface LearnerAcademyDashboard {
  readonly generatedAt: string;
  readonly summary: AcademyProgressSummary;
  readonly nextActivity: AcademyActivityCard;
  readonly skills: readonly AcademySkillCard[];
}

export interface CoachLearnerCard {
  readonly learnerId: string;
  readonly displayName: string;
  readonly overallScore: number;
  readonly masteredSkills: number;
  readonly supportConcepts: readonly ConceptId[];
  readonly nextAction: string;
}

export interface CoachDashboardPresentation {
  readonly generatedAt: string;
  readonly classAverageMastery: number;
  readonly learnerCount: number;
  readonly learners: readonly CoachLearnerCard[];
  readonly priorityConcepts: CoachDashboard["conceptsNeedingSupport"];
}
