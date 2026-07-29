import { strict as assert } from "node:assert";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import { LESSON_ONE_PUZZLE } from "../../src/data/tutorialPuzzles";
import { buildGameView, createGameSession, placeTile } from "../../src/game/engine";
import { buildAdaptiveHint } from "../../src/services/AdaptiveHintRuntime";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  motionLevel,
  normalizeAccessibilityPreferences,
  numberCellAccessibilityLabel,
} from "../../src/services/AccessibilityRuntime";
import { deriveGameplayFeedback } from "../../src/services/GameplayFeedbackRuntime";
import { buildPracticeSet } from "../../src/services/PracticeGenerator";
import { selectDailyChallengeWithPolicy } from "../../src/services/PremiumDailyChallenge";
import { summarizePlayerAttempts } from "../../src/services/PlayerProfileStatistics";
import type { PlayerAttemptSummary } from "../../src/types/PremiumGameplay";

function main(): void {
  const session = createGameSession(LESSON_ONE_PUZZLE);
  const hint1 = buildAdaptiveHint(LESSON_ONE_PUZZLE, session, 1);
  const hint2 = buildAdaptiveHint(LESSON_ONE_PUZZLE, session, 2);
  const hint3 = buildAdaptiveHint(LESSON_ONE_PUZZLE, session, 3);
  const hint4 = buildAdaptiveHint(LESSON_ONE_PUZZLE, session, 4);
  const hint5 = buildAdaptiveHint(LESSON_ONE_PUZZLE, session, 5);
  assert.equal(hint1?.kind, "focus-equation");
  assert.equal(hint2?.kind, "explain-concept");
  assert.equal(hint3?.kind, "focus-cell");
  assert.equal(hint4?.kind, "show-candidates");
  assert.ok((hint4?.candidateValues.length ?? 0) > 0);
  assert.equal(hint5?.kind, "reveal-value");
  assert.equal(hint5?.revealedValue, 5);

  const practiceA = buildPracticeSet(LEARNING_CONTENT, BUNDLED_LIBRARY, {
    concept: "addition", count: 2, seed: "alpha",
  });
  const practiceB = buildPracticeSet(LEARNING_CONTENT, BUNDLED_LIBRARY, {
    concept: "addition", count: 2, seed: "alpha",
  });
  assert.deepEqual(practiceA, practiceB);
  assert.ok(practiceA.puzzleIds.length > 0);
  assert.equal(practiceA.requestedCount, 2);
  assert.throws(() => buildPracticeSet(LEARNING_CONTENT, BUNDLED_LIBRARY, {
    concept: "addition", count: 0, seed: "bad",
  }));

  const dailyA = selectDailyChallengeWithPolicy(BUNDLED_LIBRARY, "2026-07-28", {
    namespace: "premium",
    difficultyByWeekday: { 2: "easy" },
  });
  const dailyB = selectDailyChallengeWithPolicy(BUNDLED_LIBRARY, "2026-07-28", {
    namespace: "premium",
    difficultyByWeekday: { 2: "easy" },
  });
  assert.equal(dailyA.puzzleId, dailyB.puzzleId);
  assert.equal(dailyA.puzzle.difficulty, "easy");

  const attempts: readonly PlayerAttemptSummary[] = [
    { puzzleId: "p1", concept: "addition", completedAt: "2026-07-26T10:00:00Z", elapsedMs: 10000, hintsUsed: 0, mistakes: 0, stars: 3 },
    { puzzleId: "p2", concept: "addition", completedAt: "2026-07-27T10:00:00Z", elapsedMs: 20000, hintsUsed: 1, mistakes: 0, stars: 2 },
    { puzzleId: "p3", concept: "addition", completedAt: "2026-07-28T10:00:00Z", elapsedMs: 30000, hintsUsed: 0, mistakes: 0, stars: 3 },
  ];
  const summary = summarizePlayerAttempts(attempts);
  assert.equal(summary.puzzlesCompleted, 3);
  assert.equal(summary.perfectSolves, 2);
  assert.equal(summary.totalHintsUsed, 1);
  assert.equal(summary.averageSolveTimeMs, 20000);
  assert.equal(summary.currentStreak, 3);
  assert.equal(summary.bestStreak, 3);
  assert.deepEqual(summary.masteredConcepts, ["addition"]);
  assert.throws(() => summarizePlayerAttempts(attempts, 0));

  const accessible = normalizeAccessibilityPreferences({
    textScale: 1.4, highContrast: true, reducedMotion: true,
  });
  assert.equal(accessible.textScale, 1.4);
  assert.equal(accessible.highContrast, true);
  assert.equal(motionLevel(accessible), "subtle");
  assert.equal(motionLevel({ ...accessible, screenReaderOptimized: true }), "none");
  assert.equal(motionLevel(DEFAULT_ACCESSIBILITY_PREFERENCES), "full");
  assert.match(numberCellAccessibilityLabel(null, 0, 1, true), /shared by multiple equations/);
  assert.throws(() => normalizeAccessibilityPreferences({ textScale: 3 }));

  const before = buildGameView(LESSON_ONE_PUZZLE, session);
  const target = LESSON_ONE_PUZZLE.cells.find((cell) => cell.kind === "number" && cell.editable);
  const tile = LESSON_ONE_PUZZLE.numberBank.find((candidate) => candidate.value === 5);
  assert.ok(target && tile);
  const completed = placeTile(LESSON_ONE_PUZZLE, session, target!.id, tile!.id);
  const after = buildGameView(LESSON_ONE_PUZZLE, completed);
  const feedback = deriveGameplayFeedback(before, after, accessible);
  assert.ok(feedback.some((event) => event.kind === "equation-completed"));
  assert.ok(feedback.some((event) => event.kind === "puzzle-completed"));
  assert.ok(feedback.every((event) => event.motion === "subtle"));
  assert.throws(() => deriveGameplayFeedback(before, { ...after, puzzle: BUNDLED_LIBRARY.puzzles[1]! }, accessible));

  console.log("Premium gameplay: 33/33 PASS");
}
main();
