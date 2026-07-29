import type { ArithmeticOperator, EquationOrientation, GridPosition } from "./Topology";
import type { DifficultyTier } from "./Difficulty";

export type ConceptId =
  | "place-number"
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "shared-number"
  | "dependency-chain"
  | "mixed-operators";

export interface TemplateEquation {
  readonly id: string;
  readonly orientation: EquationOrientation;
  readonly start: GridPosition;
}

export interface LearningTopologyTemplate {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly equations: readonly TemplateEquation[];
  readonly concepts: readonly ConceptId[];
  readonly allowedOperators: readonly ArithmeticOperator[];
  readonly minimumGivens: number;
  readonly recommendedDifficulty: DifficultyTier;
}

export type GuidanceSpotlight =
  | "lesson"
  | "number-bank"
  | "board"
  | "shared-cell"
  | "equation"
  | "completion";

export type GuidanceCriterion =
  | { readonly type: "select-tile" }
  | { readonly type: "place-any-tile" }
  | { readonly type: "fill-shared-cell" }
  | { readonly type: "correct-equations-at-least"; readonly count: number }
  | { readonly type: "complete-puzzle" };

export interface LessonGuidanceStep {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly spotlight: GuidanceSpotlight;
  readonly completeWhen: GuidanceCriterion;
}

export interface LessonProfile {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly instruction: string;
  readonly concept: ConceptId;
  readonly templateId: string;
  readonly puzzleIds: readonly string[];
  readonly order: number;
  readonly masteryStars: 1 | 2 | 3;
  readonly guidance: readonly LessonGuidanceStep[];
  readonly completionMessage: string;
}

export interface LearningChapter {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lessonIds: readonly string[];
}

export interface LearningCampaign {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly chapters: readonly LearningChapter[];
}

export interface LearningContent {
  readonly templates: readonly LearningTopologyTemplate[];
  readonly lessons: readonly LessonProfile[];
  readonly campaign: LearningCampaign;
}

export interface LessonState {
  readonly lesson: LessonProfile;
  readonly locked: boolean;
  readonly completed: boolean;
  readonly earnedStars: 0 | 1 | 2 | 3;
  readonly puzzleIds: readonly string[];
}


export interface GuidedLessonState {
  readonly lessonId: string;
  readonly activeStep: LessonGuidanceStep | null;
  readonly activeStepIndex: number;
  readonly totalSteps: number;
  readonly completedStepIds: readonly string[];
  readonly puzzleCompleted: boolean;
}

export type CurriculumNodeStatus = "locked" | "available" | "completed";

export interface TemplatePreviewCell {
  readonly row: number;
  readonly column: number;
  readonly kind: "number" | "operator" | "equals";
  readonly equationIds: readonly string[];
  readonly shared: boolean;
}

export interface TemplatePreview {
  readonly templateId: string;
  readonly width: number;
  readonly height: number;
  readonly equationCount: number;
  readonly intersectionCount: number;
  readonly cells: readonly TemplatePreviewCell[];
}

export interface CurriculumLessonNode {
  readonly chapterId: string;
  readonly lesson: LessonProfile;
  readonly template: LearningTopologyTemplate;
  readonly status: CurriculumNodeStatus;
  readonly earnedStars: 0 | 1 | 2 | 3;
}

export interface CurriculumRecommendation {
  readonly kind: "continue" | "practice" | "complete";
  readonly lessonId: string | null;
  readonly reason: string;
}

export interface AuthoredTemplateDraft {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly equations: readonly TemplateEquation[];
  readonly concepts: readonly ConceptId[];
  readonly allowedOperators: readonly ArithmeticOperator[];
  readonly minimumGivens: number;
  readonly recommendedDifficulty: DifficultyTier;
}
