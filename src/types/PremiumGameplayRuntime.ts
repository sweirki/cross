
import type { AccessibilityPreferences, AdaptiveHint, DailyChallengePolicy, GameplayFeedback, PlayerAttemptSummary, PlayerProfileStatistics } from "./PremiumGameplay";
import type { ConceptId, LearningContent } from "./LearningContent";
import type { Puzzle } from "./Puzzle";
import type { PuzzleLibrary } from "../services/PuzzleLibrary";
import type { RuntimeAction, RuntimeEvent, RuntimeState, RuntimeTransition } from "./GameRuntime";

export interface PremiumPlayerProfile {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly attempts: readonly PlayerAttemptSummary[];
  readonly accessibility: AccessibilityPreferences;
  readonly completedDailyDates: readonly string[];
  readonly revision: number;
}

export interface PremiumSession {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly puzzleId: string;
  readonly runtime: RuntimeState;
  readonly hintLevel: 0 | 1 | 2 | 3 | 4 | 5;
  readonly startedAt: number;
  readonly revision: number;
}

export type PremiumEvent =
  | { readonly type: "session-started"; readonly puzzleId: string }
  | { readonly type: "hint-presented"; readonly level: 1 | 2 | 3 | 4 | 5; readonly kind: AdaptiveHint["kind"] }
  | { readonly type: "feedback"; readonly feedback: GameplayFeedback }
  | { readonly type: "attempt-recorded"; readonly puzzleId: string; readonly stars: 0 | 1 | 2 | 3 }
  | { readonly type: "daily-completed"; readonly date: string }
  | { readonly type: "accessibility-updated" };

export interface PremiumTransition {
  readonly session: PremiumSession;
  readonly runtime: RuntimeTransition;
  readonly events: readonly PremiumEvent[];
}

export interface HintTransition {
  readonly session: PremiumSession;
  readonly hint: AdaptiveHint | null;
  readonly runtimeEvents: readonly RuntimeEvent[];
  readonly events: readonly PremiumEvent[];
}

export interface PracticeSessionPlan {
  readonly concept: ConceptId;
  readonly puzzleIds: readonly string[];
  readonly requestedCount: number;
  readonly exhausted: boolean;
}

export interface DailyChallengeSelection {
  readonly date: string;
  readonly puzzle: Puzzle;
}

export interface CompleteAttemptInput {
  readonly concept?: ConceptId;
  readonly completedAt: string;
}

export interface PremiumProfileTransition {
  readonly profile: PremiumPlayerProfile;
  readonly events: readonly PremiumEvent[];
}

export interface CrossMathPremiumRuntimeContract {
  createProfile(playerId: string, accessibility?: Partial<AccessibilityPreferences>): PremiumPlayerProfile;
  startSession(profile: PremiumPlayerProfile, puzzle: Puzzle, startedAt: number): PremiumTransition;
  dispatch(puzzle: Puzzle, session: PremiumSession, action: RuntimeAction): PremiumTransition;
  requestHint(puzzle: Puzzle, session: PremiumSession, level?: 1 | 2 | 3 | 4 | 5): HintTransition;
  completeAttempt(profile: PremiumPlayerProfile, session: PremiumSession, input: CompleteAttemptInput): PremiumProfileTransition;
  buildPractice(content: LearningContent, library: PuzzleLibrary, concept: ConceptId, count: number, seed: string, excludePuzzleIds?: readonly string[]): PracticeSessionPlan;
  selectDaily(library: PuzzleLibrary, date: string, policy: DailyChallengePolicy): DailyChallengeSelection;
  markDailyComplete(profile: PremiumPlayerProfile, date: string): PremiumProfileTransition;
  statistics(profile: PremiumPlayerProfile, masteryThreshold?: number): PlayerProfileStatistics;
  updateAccessibility(profile: PremiumPlayerProfile, value: Partial<AccessibilityPreferences>): PremiumProfileTransition;
  serializeProfile(profile: PremiumPlayerProfile): string;
  restoreProfile(serialized: string): PremiumPlayerProfile;
  serializeSession(session: PremiumSession): string;
  restoreSession(puzzle: Puzzle, serialized: string): PremiumSession;
  replay(puzzle: Puzzle, profile: PremiumPlayerProfile, actions: readonly RuntimeAction[], startedAt: number): PremiumTransition;
}
