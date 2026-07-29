"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveGameplayFeedback = deriveGameplayFeedback;
const AccessibilityRuntime_1 = require("./AccessibilityRuntime");
function deriveGameplayFeedback(previous, current, preferences) {
    if (previous.puzzle.id !== current.puzzle.id)
        throw new Error("Cannot compare different puzzles.");
    const motion = (0, AccessibilityRuntime_1.motionLevel)(preferences);
    const feedback = [];
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
