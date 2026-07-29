
import { strict as assert } from "node:assert";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import {
  buildGameView,
  createGameSession,
  placeTile,
} from "../../src/game/engine";
import {
  buildGuidedLessonState,
  lessonProgressLabel,
  validateLessonGuidance,
} from "../../src/services/GuidedLessonRuntime";
import { selectLessonPuzzle } from "../../src/services/LearningContentRuntime";

function main(): void {
  const lesson = LEARNING_CONTENT.lessons[0]!;
  const puzzle = selectLessonPuzzle(lesson, BUNDLED_LIBRARY);
  const initialSession = createGameSession(puzzle);
  const initialView = buildGameView(puzzle, initialSession);

  assert.equal(validateLessonGuidance(lesson), lesson);

  const start = buildGuidedLessonState(lesson, puzzle, initialView);
  assert.equal(start.activeStep?.id, "l1-select");
  assert.equal(start.activeStepIndex, 0);
  assert.equal(start.totalSteps, 3);
  assert.equal(lessonProgressLabel(start), "Step 1 of 3");

  const selected = buildGuidedLessonState(lesson, puzzle, initialView, "l1-tile-5");
  assert.equal(selected.activeStep?.id, "l1-place");
  assert.deepEqual(selected.completedStepIds, ["l1-select"]);

  const completedSession = placeTile(puzzle, initialSession, "l1-c", "l1-tile-5");
  const completed = buildGuidedLessonState(
    lesson,
    puzzle,
    buildGameView(puzzle, completedSession),
  );
  assert.equal(completed.puzzleCompleted, true);
  assert.equal(completed.activeStep, null);
  assert.equal(completed.completedStepIds.length, 3);
  assert.equal(lessonProgressLabel(completed), "Lesson complete");

  const sharedLesson = LEARNING_CONTENT.lessons[2]!;
  const sharedPuzzle = selectLessonPuzzle(sharedLesson, BUNDLED_LIBRARY);
  let sharedSession = createGameSession(sharedPuzzle);
  sharedSession = placeTile(sharedPuzzle, sharedSession, "l3-shared", "l3-tile-5");
  const sharedState = buildGuidedLessonState(
    sharedLesson,
    sharedPuzzle,
    buildGameView(sharedPuzzle, sharedSession),
  );
  assert.equal(sharedState.completedStepIds.includes("l3-shared"), true);

  assert.throws(() => validateLessonGuidance({
    ...lesson,
    guidance: [{ ...lesson.guidance[0]!, id: "" }],
  }));
  assert.throws(() => buildGuidedLessonState(
    lesson,
    sharedPuzzle,
    buildGameView(sharedPuzzle, createGameSession(sharedPuzzle)),
  ));

  console.log("Guided lessons: 14/14 PASS");
}

main();
