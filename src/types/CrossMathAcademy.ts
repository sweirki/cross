import type { ConceptId, LearningContent, LessonProfile } from "./LearningContent";
import type { PuzzleLibrary } from "../services/PuzzleLibrary";

export interface SkillDefinition {
  readonly id: ConceptId;
  readonly title: string;
  readonly description: string;
  readonly prerequisites: readonly ConceptId[];
  readonly masteryThreshold: number;
  readonly practiceThreshold: number;
}

export interface SkillGraph {
  readonly schemaVersion: 1;
  readonly skills: readonly SkillDefinition[];
}

export interface SkillAttempt {
  readonly id: string;
  readonly puzzleId: string;
  readonly lessonId?: string;
  readonly concept: ConceptId;
  readonly completed: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly elapsedMs: number;
  readonly completedAt: string;
  readonly firstAttempt: boolean;
}

export type MasteryBand = "not-started" | "developing" | "proficient" | "mastered";

export interface SkillMastery {
  readonly concept: ConceptId;
  readonly score: number;
  readonly band: MasteryBand;
  readonly attempts: number;
  readonly completedAttempts: number;
  readonly recentScore: number;
  readonly confidence: number;
  readonly lastPracticedAt: string | null;
}

export interface MasteryProfile {
  readonly generatedAt: string;
  readonly skills: readonly SkillMastery[];
  readonly overallScore: number;
}

export type AcademyRecommendationKind =
  | "lesson"
  | "practice"
  | "review"
  | "complete";

export interface AcademyRecommendation {
  readonly kind: AcademyRecommendationKind;
  readonly concept: ConceptId | null;
  readonly lessonId: string | null;
  readonly reason: string;
  readonly priority: number;
}

export interface AdaptiveCurriculum {
  readonly recommendations: readonly AcademyRecommendation[];
  readonly blockedLessonIds: readonly string[];
  readonly optionalLessonIds: readonly string[];
}

export interface PersonalizedPracticeRequest {
  readonly count: number;
  readonly seed: string;
  readonly excludePuzzleIds?: readonly string[];
}

export interface PersonalizedPracticePlan {
  readonly concept: ConceptId | null;
  readonly puzzleIds: readonly string[];
  readonly requestedCount: number;
  readonly exhausted: boolean;
  readonly reason: string;
}

export interface LessonAnalytics {
  readonly lessonId: string;
  readonly attempts: number;
  readonly completions: number;
  readonly firstAttemptSuccessRate: number;
  readonly averageHintsUsed: number;
  readonly averageMistakes: number;
  readonly averageSolveTimeMs: number | null;
}

export interface ConceptAnalytics {
  readonly concept: ConceptId;
  readonly attempts: number;
  readonly completions: number;
  readonly completionRate: number;
  readonly averageStars: number;
  readonly averageHintsUsed: number;
}

export interface AcademyAnalytics {
  readonly lessons: readonly LessonAnalytics[];
  readonly concepts: readonly ConceptAnalytics[];
  readonly totalAttempts: number;
  readonly totalCompletions: number;
}

export interface LearnerSummary {
  readonly learnerId: string;
  readonly displayName: string;
  readonly mastery: MasteryProfile;
  readonly recommendation: AcademyRecommendation;
  readonly conceptsNeedingSupport: readonly ConceptId[];
}

export interface CoachDashboard {
  readonly generatedAt: string;
  readonly learners: readonly LearnerSummary[];
  readonly classAverageMastery: number;
  readonly conceptsNeedingSupport: readonly {
    readonly concept: ConceptId;
    readonly learnerCount: number;
  }[];
}

export interface AcademyContext {
  readonly content: LearningContent;
  readonly library: PuzzleLibrary;
  readonly graph: SkillGraph;
}
