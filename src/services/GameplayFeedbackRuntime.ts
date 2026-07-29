import type { AccessibilityPreferences, GameplayFeedback } from "../types/PremiumGameplay";
import type { GameView } from "../types/Game";
import { motionLevel } from "./AccessibilityRuntime";

export function deriveGameplayFeedback(
  previous: GameView,
  current: GameView,
  preferences: AccessibilityPreferences,
): readonly GameplayFeedback[] {
  if (previous.puzzle.id !== current.puzzle.id) throw new Error("Cannot compare different puzzles.");
  const motion = motionLevel(preferences);
  const feedback: GameplayFeedback[] = [];
  const previousStates = new Map(previous.equations.map((item) => [item.equationId, item.state]));
  for (const equation of current.equations) {
    if (equation.state === "correct" && previousStates.get(equation.equationId) !== "correct") {
      feedback.push({
        kind: "equation-completed",
        equationId: equation.equationId,
        motion,
        announcement: `Equation ${equation.equationId} completed.`,
      });
    }
  }
  if (current.session.completed && !previous.session.completed) {
    feedback.push({ kind: "puzzle-completed", motion, announcement: "Puzzle completed." });
  }
  return feedback;
}
