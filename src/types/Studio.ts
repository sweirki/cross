import type { DifficultyTier } from "./Difficulty";
import type {
  LearningCampaign,
  LearningChapter,
  LearningTopologyTemplate,
  TemplateEquation,
  TemplatePreview,
} from "./LearningContent";
import type { Puzzle } from "./Puzzle";
import type { PuzzleFingerprints } from "./IndustrialGeneration";
import type { DifficultyCertification } from "./DifficultyCertification";
import type { UniqueSolutionVerification } from "./Solver";

export interface StudioTemplateDraft {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly equations: readonly TemplateEquation[];
}

export interface StudioTemplateAnalysis {
  readonly templateId: string;
  readonly equationCount: number;
  readonly intersectionCount: number;
  readonly connectedComponents: number;
  readonly graphDepth: number;
  readonly maximumEquationDegree: number;
  readonly averageEquationDegree: number;
  readonly occupiedCellCount: number;
  readonly boardUtilization: number;
  readonly estimatedComplexity: number;
}

export interface StudioTemplateDocument {
  readonly template: LearningTopologyTemplate;
  readonly preview: TemplatePreview;
  readonly analysis: StudioTemplateAnalysis;
}

export interface StudioCampaignDraft {
  readonly id: string;
  readonly title: string;
  readonly chapters: readonly LearningChapter[];
}

export interface PuzzleInspection {
  readonly puzzleId: string;
  readonly valid: boolean;
  readonly validationMessages: readonly string[];
  readonly uniqueSolution: UniqueSolutionVerification | null;
  readonly difficulty: DifficultyCertification | null;
  readonly fingerprints: PuzzleFingerprints;
  readonly hiddenCellCount: number;
  readonly sharedNumberCount: number;
}

export interface StudioQaIssue {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly puzzleId?: string;
  readonly lessonId?: string;
  readonly templateId?: string;
}

export interface StudioQaSummary {
  readonly puzzleCount: number;
  readonly templateCount: number;
  readonly lessonCount: number;
  readonly invalidPuzzleCount: number;
  readonly nonUniquePuzzleCount: number;
  readonly duplicateExactCount: number;
  readonly duplicateTopologyCount: number;
  readonly difficultyMismatchCount: number;
}

export interface StudioQaReport {
  readonly valid: boolean;
  readonly summary: StudioQaSummary;
  readonly issues: readonly StudioQaIssue[];
}

export interface StudioLessonPreview {
  readonly lessonId: string;
  readonly title: string;
  readonly instruction: string;
  readonly concept: string;
  readonly template: StudioTemplateDocument;
  readonly puzzles: readonly Puzzle[];
}

export interface StudioGenerationMetrics {
  readonly attempted: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly duplicateRate: number;
  readonly acceptanceRate: number;
  readonly difficultyDistribution: Readonly<Record<DifficultyTier, number>>;
}

export interface StudioCampaignDocument {
  readonly campaign: LearningCampaign;
  readonly lessonCount: number;
}
