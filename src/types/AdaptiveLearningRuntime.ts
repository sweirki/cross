export type MasteryBand = "not-started" | "developing" | "proficient" | "mastered";

export interface SkillDefinition {
  readonly id: string;
  readonly title: string;
  readonly prerequisiteIds: readonly string[];
  readonly masteryThreshold?: number;
}

export interface SkillGraphDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly skills: readonly SkillDefinition[];
}

export interface AcademyAttempt {
  readonly id: string;
  readonly skillId: string;
  readonly lessonId?: string;
  readonly completed: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly elapsedMs: number;
  readonly occurredAt: number;
}

export interface SkillMastery {
  readonly skillId: string;
  readonly score: number;
  readonly confidence: number;
  readonly band: MasteryBand;
  readonly attempts: number;
  readonly completions: number;
  readonly lastPracticedAt: number | null;
}

export interface AcademyProfile {
  readonly schemaVersion: 1;
  readonly graphId: string;
  readonly playerId: string;
  readonly attempts: readonly AcademyAttempt[];
  readonly mastery: readonly SkillMastery[];
  readonly revision: number;
}

export interface LessonSkillBinding {
  readonly lessonId: string;
  readonly skillIds: readonly string[];
  readonly optional?: boolean;
}

export interface PracticePuzzleRef {
  readonly puzzleId: string;
  readonly skillIds: readonly string[];
  readonly difficulty: "easy" | "medium" | "hard" | "expert";
}

export type AcademyRecommendation =
  | { readonly type: "lesson"; readonly lessonId: string; readonly skillId: string; readonly reason: string }
  | { readonly type: "practice"; readonly skillId: string; readonly puzzleIds: readonly string[]; readonly reason: string }
  | { readonly type: "review"; readonly skillId: string; readonly puzzleIds: readonly string[]; readonly reason: string }
  | { readonly type: "complete"; readonly reason: string };

export interface SkillAnalytics {
  readonly skillId: string;
  readonly attempts: number;
  readonly completionRate: number;
  readonly averageStars: number;
  readonly averageHints: number;
  readonly averageMistakes: number;
  readonly averageElapsedMs: number;
  readonly firstAttemptSuccessRate: number;
}

export interface AcademyAnalytics {
  readonly totalAttempts: number;
  readonly completedAttempts: number;
  readonly skills: readonly SkillAnalytics[];
}

export type AcademyEvent =
  | { readonly type: "attempt-recorded"; readonly attemptId: string; readonly skillId: string }
  | { readonly type: "skill-band-changed"; readonly skillId: string; readonly from: MasteryBand; readonly to: MasteryBand }
  | { readonly type: "skill-mastered"; readonly skillId: string }
  | { readonly type: "recommendation-created"; readonly recommendationType: AcademyRecommendation["type"] };

export interface AcademyTransition {
  readonly state: AcademyProfile;
  readonly events: readonly AcademyEvent[];
}

export interface CoachLearnerSummary {
  readonly playerId: string;
  readonly averageMastery: number;
  readonly masteredSkills: number;
  readonly supportSkillIds: readonly string[];
  readonly recommendation: AcademyRecommendation;
}

export interface CoachDashboard {
  readonly learnerCount: number;
  readonly classAverageMastery: number;
  readonly learners: readonly CoachLearnerSummary[];
  readonly prioritySupportSkillIds: readonly string[];
}
