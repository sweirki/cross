export interface GameplayCompletionInput {
  readonly puzzleId: string;
  readonly lessonId: string | null;
  readonly moves: number;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly elapsedMs: number;
  readonly previousBestMoves: number | null;
}

export interface GameplayReward {
  readonly stars: 1 | 2 | 3;
  readonly xp: number;
  readonly accuracyPercent: number;
  readonly performance: "perfect" | "strong" | "complete";
  readonly personalBest: boolean;
  readonly title: string;
  readonly message: string;
}

export interface GameplayPolishPreferences {
  readonly soundEnabled: boolean;
  readonly hapticsEnabled: boolean;
  readonly reducedMotion: boolean;
}

export type GameplayFeedbackKind =
  | "tile-placed"
  | "tile-removed"
  | "equation-complete"
  | "mistake"
  | "hint"
  | "undo"
  | "redo"
  | "victory";

export interface GameplayFeedback {
  readonly kind: GameplayFeedbackKind;
  readonly announcement: string;
  readonly haptic: "none" | "selection" | "success" | "warning" | "error";
  readonly animation: "none" | "pulse" | "shake" | "celebrate" | "fade";
}
