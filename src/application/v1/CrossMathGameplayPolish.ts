import type {
  GameplayCompletionInput,
  GameplayFeedback,
  GameplayFeedbackKind,
  GameplayPolishPreferences,
  GameplayReward,
} from "./GameplayPolishTypes";

const DEFAULT_PREFERENCES: GameplayPolishPreferences = {
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
};

function requireCount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
}

export class CrossMathGameplayPolish {
  public defaultPreferences(): GameplayPolishPreferences {
    return DEFAULT_PREFERENCES;
  }

  public reward(input: GameplayCompletionInput): GameplayReward {
    requireCount(input.moves, "Moves");
    requireCount(input.hintsUsed, "Hints");
    requireCount(input.mistakes, "Mistakes");
    if (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0) throw new Error("Elapsed time is invalid.");

    const stars: 1 | 2 | 3 =
      input.hintsUsed === 0 && input.mistakes === 0 ? 3 :
      input.hintsUsed <= 1 && input.mistakes <= 1 ? 2 : 1;
    const accuracyPercent = input.moves === 0
      ? 100
      : Math.max(0, Math.round(((input.moves - input.mistakes) / input.moves) * 100));
    const speedBonus = input.elapsedMs <= 60_000 ? 20 : input.elapsedMs <= 180_000 ? 10 : 0;
    const xp = 50 + stars * 25 + speedBonus + (input.hintsUsed === 0 ? 15 : 0);
    const personalBest = input.previousBestMoves === null || input.moves < input.previousBestMoves;
    const performance = stars === 3 ? "perfect" : stars === 2 ? "strong" : "complete";
    return {
      stars,
      xp,
      accuracyPercent,
      performance,
      personalBest,
      title: stars === 3 ? "Perfect solve!" : stars === 2 ? "Great work!" : "Puzzle complete!",
      message: stars === 3
        ? "Every equation is correct. Outstanding precision."
        : stars === 2
          ? "A strong solution. Replay for all three stars."
          : "Progress saved. Keep practicing to improve your score.",
    };
  }

  public feedback(kind: GameplayFeedbackKind, reducedMotion = false): GameplayFeedback {
    const table: Record<GameplayFeedbackKind, Omit<GameplayFeedback, "kind">> = {
      "tile-placed": { announcement: "Number placed.", haptic: "selection", animation: "pulse" },
      "tile-removed": { announcement: "Number returned to the bank.", haptic: "selection", animation: "fade" },
      "equation-complete": { announcement: "Equation complete.", haptic: "success", animation: "pulse" },
      mistake: { announcement: "That equation is not correct yet.", haptic: "error", animation: "shake" },
      hint: { announcement: "Hint revealed.", haptic: "warning", animation: "fade" },
      undo: { announcement: "Move undone.", haptic: "selection", animation: "fade" },
      redo: { announcement: "Move restored.", haptic: "selection", animation: "fade" },
      victory: { announcement: "Puzzle complete.", haptic: "success", animation: "celebrate" },
    };
    const value = table[kind];
    return { kind, ...value, animation: reducedMotion ? "none" : value.animation };
  }

  public mergePreferences(
    current: GameplayPolishPreferences,
    patch: Partial<GameplayPolishPreferences>,
  ): GameplayPolishPreferences {
    return {
      soundEnabled: patch.soundEnabled ?? current.soundEnabled,
      hapticsEnabled: patch.hapticsEnabled ?? current.hapticsEnabled,
      reducedMotion: patch.reducedMotion ?? current.reducedMotion,
    };
  }

  public formatElapsed(elapsedMs: number): string {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("Elapsed time is invalid.");
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
}

export const gameplayPolish = new CrossMathGameplayPolish();
