import { strict as assert } from "node:assert";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import {
  buildLessonStates,
  countTemplateIntersections,
  selectLessonPuzzle,
  validateLearningContent,
} from "../../src/services/LearningContentRuntime";
import type { PuzzleProgress } from "../../src/types/RuntimeContent";

function progress(puzzleId: string, stars: 0 | 1 | 2 | 3): PuzzleProgress {
  return {
    puzzleId,
    completed: true,
    attempts: 1,
    bestTimeMs: 1000,
    bestMoves: 1,
    stars,
    hintsUsed: 0,
    mistakes: 0,
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
}

function main(): void {
  assert.equal(validateLearningContent(LEARNING_CONTENT, BUNDLED_LIBRARY), LEARNING_CONTENT);
  assert.equal(LEARNING_CONTENT.templates.length, 3);
  assert.equal(LEARNING_CONTENT.lessons.length, 4);

  const single = LEARNING_CONTENT.templates[0]!;
  const crossing = LEARNING_CONTENT.templates[1]!;
  const connected = LEARNING_CONTENT.templates[2]!;
  assert.equal(countTemplateIntersections(single), 0);
  assert.equal(countTemplateIntersections(crossing), 1);
  assert.equal(countTemplateIntersections(connected), 6);

  const initial = buildLessonStates(LEARNING_CONTENT, BUNDLED_LIBRARY);
  assert.equal(initial[0]?.locked, false);
  assert.equal(initial[1]?.locked, true);

  const firstPuzzleId = LEARNING_CONTENT.lessons[0]!.puzzleIds[0]!;
  const afterFirst = buildLessonStates(LEARNING_CONTENT, BUNDLED_LIBRARY, {
    [firstPuzzleId]: progress(firstPuzzleId, 1),
  });
  assert.equal(afterFirst[0]?.completed, true);
  assert.equal(afterFirst[1]?.locked, false);
  assert.equal(afterFirst[2]?.locked, true);

  const selected = selectLessonPuzzle(LEARNING_CONTENT.lessons[0]!, BUNDLED_LIBRARY);
  assert.equal(selected.id, "learn-001-place-number");
  assert.equal(selected.equations.length, 1);

  assert.throws(() => validateLearningContent({
    ...LEARNING_CONTENT,
    lessons: [{ ...LEARNING_CONTENT.lessons[0]!, templateId: "missing" }],
  }, BUNDLED_LIBRARY));

  console.log("Learning content: 12/12 PASS");
}
main();
