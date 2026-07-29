import type { DifficultyTier } from "./Difficulty";
import type { ConceptId } from "./LearningContent";

export type HintLevel = 1 | 2 | 3 | 4 | 5;

export interface AdaptiveHint {
  readonly level: HintLevel;
  readonly kind: "focus-equation" | "explain-concept" | "focus-cell" | "show-candidates" | "reveal-value";
  readonly message: string;
  readonly cellId: string | null;
  readonly equationIds: readonly string[];
  readonly candidateValues: readonly number[];
  readonly revealedValue: number | null;
}

export interface PracticeRequest {
  readonly concept: ConceptId;
  readonly count: number;
  readonly seed: string;
  readonly excludePuzzleIds?: readonly string[];
}

export interface PracticeSet {
  readonly concept: ConceptId;
  readonly puzzleIds: readonly string[];
  readonly requestedCount: number;
  readonly exhausted: boolean;
}

export interface DailyChallengePolicy {
  readonly namespace: string;
  readonly difficultyByWeekday?: Readonly<Partial<Record<number, DifficultyTier>>>;
}

export interface PlayerAttemptSummary {
  readonly puzzleId: string;
  readonly concept?: ConceptId;
  readonly completedAt: string;
  readonly elapsedMs: number;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly stars: 0 | 1 | 2 | 3;
}

export interface PlayerProfileStatistics {
  readonly puzzlesCompleted: number;
  readonly perfectSolves: number;
  readonly totalHintsUsed: number;
  readonly averageSolveTimeMs: number | null;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly masteredConcepts: readonly ConceptId[];
  readonly conceptCompletionCounts: Readonly<Partial<Record<ConceptId, number>>>;
}

export interface AccessibilityPreferences {
  readonly textScale: number;
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly screenReaderOptimized: boolean;
}

export interface GameplayFeedback {
  readonly kind: "equation-completed" | "intersection-satisfied" | "puzzle-completed" | "invalid-placement";
  readonly equationId?: string;
  readonly cellId?: string;
  readonly motion: "none" | "subtle" | "full";
  readonly announcement: string;
}
