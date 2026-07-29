import { strict as assert } from "node:assert";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import {
  authorTopologyTemplate,
  buildCurriculum,
  buildTemplatePreview,
  parseAuthoredTemplate,
  recommendNextLesson,
  serializeTemplate,
  templateStructuralSummary,
} from "../../src/services/CurriculumAuthoring";

function main(): void {
  const first = LEARNING_CONTENT.templates[0]!;
  const preview = buildTemplatePreview(first);
  assert.equal(preview.equationCount, 1);
  assert.equal(preview.intersectionCount, 0);
  assert.equal(preview.cells.length, 5);
  assert.deepEqual(preview.cells.map((cell) => cell.kind),
    ["number", "operator", "number", "equals", "number"]);

  const crossing = LEARNING_CONTENT.templates[1]!;
  const crossingPreview = buildTemplatePreview(crossing);
  assert.equal(crossingPreview.equationCount, 2);
  assert.equal(crossingPreview.intersectionCount, 1);
  assert.equal(crossingPreview.cells.filter((cell) => cell.shared).length, 1);

  const authored = authorTopologyTemplate({
    id: "template-test-cross",
    title: " Test Cross ",
    width: 5,
    height: 5,
    equations: [
      { id: "horizontal-1", orientation: "horizontal", start: { row: 0, column: 0 } },
      { id: "vertical-1", orientation: "vertical", start: { row: 0, column: 2 } },
    ],
    concepts: ["addition", "shared-number", "addition"],
    allowedOperators: ["add", "add"],
    minimumGivens: 2,
    recommendedDifficulty: "easy",
  });
  assert.equal(authored.title, "Test Cross");
  assert.deepEqual(authored.concepts, ["addition", "shared-number"]);
  assert.deepEqual(authored.allowedOperators, ["add"]);

  const restored = parseAuthoredTemplate(serializeTemplate(authored));
  assert.deepEqual(restored, authored);
  assert.equal(templateStructuralSummary(crossing), "2 equations, 1 intersection");

  assert.throws(() => authorTopologyTemplate({
    ...authored,
    id: "Not Valid",
  }));
  assert.throws(() => authorTopologyTemplate({
    ...authored,
    equations: [
      { id: "horizontal-1", orientation: "horizontal", start: { row: 0, column: 0 } },
      { id: "vertical-1", orientation: "vertical", start: { row: 0, column: 1 } },
    ],
  }));
  assert.throws(() => parseAuthoredTemplate("{"));

  const initial = buildCurriculum(LEARNING_CONTENT, []);
  assert.equal(initial[0]?.status, "available");
  assert.equal(initial[1]?.status, "locked");
  assert.equal(recommendNextLesson(initial).lessonId, "lesson-001-place-a-number");

  const firstComplete = buildCurriculum(LEARNING_CONTENT, [{
    puzzleId: "learn-001-place-number",
    completed: true,
    attempts: 1,
    bestTimeMs: 1000,
    bestMoves: 1,
    stars: 1,
    hintsUsed: 0,
    mistakes: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }]);
  assert.equal(firstComplete[0]?.status, "completed");
  assert.equal(firstComplete[1]?.status, "available");
  assert.equal(recommendNextLesson(firstComplete).lessonId,
    "lesson-002-complete-an-equation");

  const allComplete = buildCurriculum(LEARNING_CONTENT,
    LEARNING_CONTENT.lessons.flatMap((lesson) =>
      lesson.puzzleIds.map((puzzleId) => ({
        puzzleId,
        completed: true,
        attempts: 1,
        bestTimeMs: 1000,
        bestMoves: 1,
        stars: 3 as const,
        hintsUsed: 0,
        mistakes: 0,
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
    ),
  );
  assert.equal(recommendNextLesson(allComplete).kind, "complete");

  console.log("Curriculum authoring: 18/18 PASS");
}

main();
