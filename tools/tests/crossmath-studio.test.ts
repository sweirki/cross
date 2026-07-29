import { strict as assert } from "node:assert";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { LEARNING_CONTENT } from "../../src/data/learningContent";
import {
  addEquationToDraft,
  analyzeTopologyTemplate,
  buildCampaignDocument,
  createStudioTemplateDocument,
  createTemplateFromStudioDraft,
  inspectPuzzle,
  moveEquationInDraft,
  previewLesson,
  removeEquationFromDraft,
  reorderLessonInCampaign,
  runStudioQa,
  summarizeGenerationMetrics,
} from "../../src/services/CrossMathStudio";

function main(): void {
  const single = LEARNING_CONTENT.templates[0]!;
  const singleAnalysis = analyzeTopologyTemplate(single);
  assert.equal(singleAnalysis.equationCount, 1);
  assert.equal(singleAnalysis.intersectionCount, 0);
  assert.equal(singleAnalysis.connectedComponents, 1);
  assert.equal(singleAnalysis.graphDepth, 0);
  assert.equal(singleAnalysis.occupiedCellCount, 5);

  const crossing = LEARNING_CONTENT.templates[1]!;
  const crossingAnalysis = analyzeTopologyTemplate(crossing);
  assert.equal(crossingAnalysis.equationCount, 2);
  assert.equal(crossingAnalysis.intersectionCount, 1);
  assert.equal(crossingAnalysis.connectedComponents, 1);
  assert.equal(crossingAnalysis.graphDepth, 1);
  assert.equal(crossingAnalysis.maximumEquationDegree, 1);

  const document = createStudioTemplateDocument(crossing);
  assert.equal(document.preview.cells.filter((cell) => cell.shared).length, 1);
  assert.equal(document.analysis.templateId, crossing.id);

  const baseDraft = {
    id: "studio-template",
    title: "Studio Template",
    width: 5,
    height: 5,
    equations: [
      { id: "horizontal", orientation: "horizontal" as const, start: { row: 0, column: 0 } },
    ],
  };
  const withVertical = addEquationToDraft(baseDraft, {
    id: "vertical",
    orientation: "vertical",
    start: { row: 0, column: 4 },
  });
  assert.equal(withVertical.equations.length, 2);
  assert.equal(baseDraft.equations.length, 1);

  const moved = moveEquationInDraft(withVertical, "vertical", { row: 0, column: 2 });
  assert.deepEqual(moved.equations[1]?.start, { row: 0, column: 2 });
  const removed = removeEquationFromDraft(moved, "vertical");
  assert.equal(removed.equations.length, 1);
  assert.throws(() => removeEquationFromDraft(removed, "missing"));

  const authored = createTemplateFromStudioDraft(withVertical, {
    concepts: ["addition", "shared-number"],
    allowedOperators: ["add"],
    minimumGivens: 2,
    recommendedDifficulty: "easy",
  });
  assert.equal(authored.analysis.intersectionCount, 1);

  const lessonPreview = previewLesson(
    LEARNING_CONTENT.lessons[0]!,
    LEARNING_CONTENT,
    BUNDLED_LIBRARY,
  );
  assert.equal(lessonPreview.puzzles.length, 1);
  assert.equal(lessonPreview.template.analysis.equationCount, 1);

  const campaignDraft = {
    id: LEARNING_CONTENT.campaign.id,
    title: LEARNING_CONTENT.campaign.title,
    chapters: LEARNING_CONTENT.campaign.chapters,
  };
  const campaign = buildCampaignDocument(campaignDraft, LEARNING_CONTENT.lessons);
  assert.equal(campaign.lessonCount, LEARNING_CONTENT.lessons.length);

  const lessonId = LEARNING_CONTENT.campaign.chapters[0]!.lessonIds[0]!;
  const targetChapter = LEARNING_CONTENT.campaign.chapters[1]!;
  const reordered = reorderLessonInCampaign(
    campaignDraft,
    lessonId,
    targetChapter.id,
    0,
  );
  assert.equal(reordered.chapters[1]?.lessonIds[0], lessonId);
  assert.equal(
    reordered.chapters.flatMap((chapter) => chapter.lessonIds)
      .filter((id) => id === lessonId).length,
    1,
  );

  const inspection = inspectPuzzle(BUNDLED_LIBRARY.puzzles[0]!);
  assert.equal(inspection.valid, true);
  assert.equal(inspection.uniqueSolution?.unique, true);
  assert.ok(inspection.fingerprints.exact.startsWith("exact-v1-"));

  const qa = runStudioQa(LEARNING_CONTENT, BUNDLED_LIBRARY);
  assert.equal(qa.summary.puzzleCount, BUNDLED_LIBRARY.puzzles.length);
  assert.equal(qa.summary.templateCount, LEARNING_CONTENT.templates.length);
  assert.equal(qa.summary.invalidPuzzleCount, 0);
  assert.equal(qa.summary.nonUniquePuzzleCount, 0);

  const metrics = summarizeGenerationMetrics({
    attempted: 10,
    accepted: 7,
    rejected: 3,
    acceptedDifficulties: ["easy", "easy", "medium", "hard", "hard", "expert", "expert"],
  });
  assert.equal(metrics.acceptanceRate, 0.7);
  assert.equal(metrics.duplicateRate, 0.3);
  assert.equal(metrics.difficultyDistribution.hard, 2);
  assert.throws(() => summarizeGenerationMetrics({
    attempted: 3,
    accepted: 2,
    rejected: 2,
    acceptedDifficulties: ["easy", "medium"],
  }));

  console.log("CrossMath Studio: 24/24 PASS");
}

main();
