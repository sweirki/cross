import { certifyDifficulty } from "../game/difficulty/DifficultyCertifier";
import { fingerprintPuzzle } from "../game/generator/PuzzleFingerprint";
import { solvePuzzle, verifyUniqueSolution } from "../game/solver/PuzzleSolver";
import { validatePuzzle } from "../game/validation/PuzzleValidation";
import type { DifficultyTier } from "../types/Difficulty";
import type {
  LearningCampaign,
  LearningContent,
  LearningTopologyTemplate,
  LessonProfile,
  TemplateEquation,
} from "../types/LearningContent";
import type { Puzzle } from "../types/Puzzle";
import type {
  PuzzleInspection,
  StudioCampaignDocument,
  StudioCampaignDraft,
  StudioGenerationMetrics,
  StudioLessonPreview,
  StudioQaIssue,
  StudioQaReport,
  StudioTemplateAnalysis,
  StudioTemplateDocument,
  StudioTemplateDraft,
} from "../types/Studio";
import {
  authorTopologyTemplate,
  buildTemplatePreview,
} from "./CurriculumAuthoring";
import type { PuzzleLibrary } from "./PuzzleLibrary";

function positionKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function equationNumberPositions(
  equation: TemplateEquation,
): readonly string[] {
  return [0, 2, 4].map((offset) => positionKey(
    equation.start.row + (equation.orientation === "vertical" ? offset : 0),
    equation.start.column + (equation.orientation === "horizontal" ? offset : 0),
  ));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function analyzeTopologyTemplate(
  template: LearningTopologyTemplate,
): StudioTemplateAnalysis {
  const preview = buildTemplatePreview(template);
  const equationIds = template.equations.map((equation) => equation.id);
  const adjacency = new Map<string, Set<string>>(
    equationIds.map((id) => [id, new Set<string>()]),
  );
  const owners = new Map<string, string[]>();

  for (const equation of template.equations) {
    for (const coordinate of equationNumberPositions(equation)) {
      const bucket = owners.get(coordinate) ?? [];
      bucket.push(equation.id);
      owners.set(coordinate, bucket);
    }
  }

  for (const bucket of owners.values()) {
    for (const left of bucket) {
      for (const right of bucket) {
        if (left !== right) adjacency.get(left)?.add(right);
      }
    }
  }

  let components = 0;
  const visited = new Set<string>();
  for (const id of equationIds) {
    if (visited.has(id)) continue;
    components += 1;
    const queue = [id];
    visited.add(id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbour of adjacency.get(current) ?? []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
  }

  let graphDepth = 0;
  for (const start of equationIds) {
    const distance = new Map<string, number>([[start, 0]]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distance.get(current)!;
      graphDepth = Math.max(graphDepth, currentDistance);
      for (const neighbour of adjacency.get(current) ?? []) {
        if (!distance.has(neighbour)) {
          distance.set(neighbour, currentDistance + 1);
          queue.push(neighbour);
        }
      }
    }
  }

  const degrees = equationIds.map((id) => adjacency.get(id)?.size ?? 0);
  const maximumEquationDegree = degrees.length === 0 ? 0 : Math.max(...degrees);
  const averageEquationDegree = degrees.length === 0
    ? 0
    : round(degrees.reduce((sum, value) => sum + value, 0) / degrees.length);
  const boardArea = Math.max(1, template.width * template.height);
  const boardUtilization = round(preview.cells.length / boardArea);
  const estimatedComplexity = Math.max(0, Math.round(
    template.equations.length * 5 +
    preview.intersectionCount * 8 +
    graphDepth * 4 +
    maximumEquationDegree * 3 +
    Math.max(0, components - 1) * 10,
  ));

  return {
    templateId: template.id,
    equationCount: template.equations.length,
    intersectionCount: preview.intersectionCount,
    connectedComponents: components,
    graphDepth,
    maximumEquationDegree,
    averageEquationDegree,
    occupiedCellCount: preview.cells.length,
    boardUtilization,
    estimatedComplexity,
  };
}

export function createStudioTemplateDocument(
  template: LearningTopologyTemplate,
): StudioTemplateDocument {
  return {
    template,
    preview: buildTemplatePreview(template),
    analysis: analyzeTopologyTemplate(template),
  };
}

export function createTemplateFromStudioDraft(
  draft: StudioTemplateDraft,
  source: Pick<
    LearningTopologyTemplate,
    "concepts" | "allowedOperators" | "minimumGivens" | "recommendedDifficulty"
  >,
): StudioTemplateDocument {
  const template = authorTopologyTemplate({
    ...draft,
    concepts: source.concepts,
    allowedOperators: source.allowedOperators,
    minimumGivens: source.minimumGivens,
    recommendedDifficulty: source.recommendedDifficulty,
  });
  return createStudioTemplateDocument(template);
}

export function addEquationToDraft(
  draft: StudioTemplateDraft,
  equation: TemplateEquation,
): StudioTemplateDraft {
  if (draft.equations.some((candidate) => candidate.id === equation.id)) {
    throw new Error(`Duplicate equation id: ${equation.id}.`);
  }
  return { ...draft, equations: [...draft.equations, equation] };
}

export function removeEquationFromDraft(
  draft: StudioTemplateDraft,
  equationId: string,
): StudioTemplateDraft {
  const equations = draft.equations.filter((equation) => equation.id !== equationId);
  if (equations.length === draft.equations.length) {
    throw new Error(`Unknown equation id: ${equationId}.`);
  }
  return { ...draft, equations };
}

export function moveEquationInDraft(
  draft: StudioTemplateDraft,
  equationId: string,
  start: TemplateEquation["start"],
): StudioTemplateDraft {
  let found = false;
  const equations = draft.equations.map((equation) => {
    if (equation.id !== equationId) return equation;
    found = true;
    return { ...equation, start };
  });
  if (!found) throw new Error(`Unknown equation id: ${equationId}.`);
  return { ...draft, equations };
}

export function previewLesson(
  lesson: LessonProfile,
  content: LearningContent,
  library: PuzzleLibrary,
): StudioLessonPreview {
  const template = content.templates.find((candidate) => candidate.id === lesson.templateId);
  if (template === undefined) throw new Error(`Missing template ${lesson.templateId}.`);
  const puzzles = lesson.puzzleIds.map((id) => {
    const puzzle = library.puzzles.find((candidate) => candidate.id === id);
    if (puzzle === undefined) throw new Error(`Missing lesson puzzle ${id}.`);
    return puzzle;
  });
  return {
    lessonId: lesson.id,
    title: lesson.title,
    instruction: lesson.instruction,
    concept: lesson.concept,
    template: createStudioTemplateDocument(template),
    puzzles,
  };
}

export function buildCampaignDocument(
  draft: StudioCampaignDraft,
  knownLessons: readonly LessonProfile[],
): StudioCampaignDocument {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) {
    throw new Error("Campaign id must be kebab-case.");
  }
  if (draft.title.trim().length === 0) throw new Error("Campaign title is required.");
  const known = new Set(knownLessons.map((lesson) => lesson.id));
  const seen = new Set<string>();
  for (const chapter of draft.chapters) {
    if (chapter.id.trim().length === 0 || chapter.title.trim().length === 0) {
      throw new Error("Campaign chapters require ids and titles.");
    }
    for (const lessonId of chapter.lessonIds) {
      if (!known.has(lessonId)) throw new Error(`Unknown lesson ${lessonId}.`);
      if (seen.has(lessonId)) throw new Error(`Lesson ${lessonId} appears more than once.`);
      seen.add(lessonId);
    }
  }
  const campaign: LearningCampaign = {
    schemaVersion: 1,
    id: draft.id,
    title: draft.title.trim(),
    chapters: draft.chapters.map((chapter) => ({
      ...chapter,
      title: chapter.title.trim(),
      description: chapter.description.trim(),
      lessonIds: [...chapter.lessonIds],
    })),
  };
  return { campaign, lessonCount: seen.size };
}

export function reorderLessonInCampaign(
  draft: StudioCampaignDraft,
  lessonId: string,
  targetChapterId: string,
  targetIndex: number,
): StudioCampaignDraft {
  const allLessonIds = draft.chapters.flatMap((chapter) => chapter.lessonIds);
  if (!allLessonIds.includes(lessonId)) throw new Error(`Unknown lesson ${lessonId}.`);
  const target = draft.chapters.find((chapter) => chapter.id === targetChapterId);
  if (target === undefined) throw new Error(`Unknown chapter ${targetChapterId}.`);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > target.lessonIds.length) {
    throw new Error("targetIndex is outside the target chapter.");
  }

  const stripped = draft.chapters.map((chapter) => ({
    ...chapter,
    lessonIds: chapter.lessonIds.filter((id) => id !== lessonId),
  }));
  return {
    ...draft,
    chapters: stripped.map((chapter) => {
      if (chapter.id !== targetChapterId) return chapter;
      const lessonIds = [...chapter.lessonIds];
      lessonIds.splice(Math.min(targetIndex, lessonIds.length), 0, lessonId);
      return { ...chapter, lessonIds };
    }),
  };
}

function sharedNumberCount(puzzle: Puzzle): number {
  const participation = new Map<string, number>();
  for (const equation of puzzle.equations) {
    for (const id of [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]]) {
      participation.set(id, (participation.get(id) ?? 0) + 1);
    }
  }
  return [...participation.values()].filter((count) => count > 1).length;
}

export function inspectPuzzle(puzzle: Puzzle): PuzzleInspection {
  const validation = validatePuzzle(puzzle);
  const fingerprints = fingerprintPuzzle(puzzle);
  let uniqueSolution: PuzzleInspection["uniqueSolution"] = null;
  let difficulty: PuzzleInspection["difficulty"] = null;
  if (validation.valid) {
    try {
      uniqueSolution = verifyUniqueSolution(puzzle);
      if (uniqueSolution.unique) difficulty = certifyDifficulty(puzzle);
    } catch {
      uniqueSolution = null;
      difficulty = null;
    }
  }
  return {
    puzzleId: puzzle.id,
    valid: validation.valid,
    validationMessages: validation.issues.map((item) => item.message),
    uniqueSolution,
    difficulty,
    fingerprints,
    hiddenCellCount: puzzle.cells.filter(
      (cell) => cell.kind === "number" && !cell.given,
    ).length,
    sharedNumberCount: sharedNumberCount(puzzle),
  };
}

function issue(
  severity: StudioQaIssue["severity"],
  code: string,
  message: string,
  context: Partial<StudioQaIssue> = {},
): StudioQaIssue {
  return { severity, code, message, ...context };
}

export function runStudioQa(
  content: LearningContent,
  library: PuzzleLibrary,
): StudioQaReport {
  const issues: StudioQaIssue[] = [];
  const exact = new Map<string, string>();
  const topology = new Map<string, string>();
  let invalidPuzzleCount = 0;
  let nonUniquePuzzleCount = 0;
  let duplicateExactCount = 0;
  let duplicateTopologyCount = 0;
  let difficultyMismatchCount = 0;

  for (const puzzle of library.puzzles) {
    const inspection = inspectPuzzle(puzzle);
    if (!inspection.valid) {
      invalidPuzzleCount += 1;
      issues.push(issue("error", "INVALID_PUZZLE",
        inspection.validationMessages.join("; "), { puzzleId: puzzle.id }));
      continue;
    }
    if (inspection.uniqueSolution?.unique !== true) {
      nonUniquePuzzleCount += 1;
      issues.push(issue("error", "NON_UNIQUE_PUZZLE",
        "Puzzle does not have a proven unique solution.", { puzzleId: puzzle.id }));
    }
    const existingExact = exact.get(inspection.fingerprints.exact);
    if (existingExact !== undefined) {
      duplicateExactCount += 1;
      issues.push(issue("error", "DUPLICATE_EXACT",
        `Puzzle duplicates ${existingExact}.`, { puzzleId: puzzle.id }));
    } else {
      exact.set(inspection.fingerprints.exact, puzzle.id);
    }
    const existingTopology = topology.get(inspection.fingerprints.topology);
    if (existingTopology !== undefined) {
      duplicateTopologyCount += 1;
      issues.push(issue("warning", "DUPLICATE_TOPOLOGY",
        `Puzzle reuses topology from ${existingTopology}.`, { puzzleId: puzzle.id }));
    } else {
      topology.set(inspection.fingerprints.topology, puzzle.id);
    }
    if (inspection.difficulty !== null &&
        inspection.difficulty.certifiedTier !== puzzle.difficulty) {
      difficultyMismatchCount += 1;
      issues.push(issue("warning", "DIFFICULTY_MISMATCH",
        `Requested ${puzzle.difficulty}, certified ${inspection.difficulty.certifiedTier}.`,
        { puzzleId: puzzle.id }));
    }
  }

  const templates = new Map(content.templates.map((item) => [item.id, item] as const));
  const puzzleIds = new Set(library.puzzles.map((item) => item.id));
  for (const lesson of content.lessons) {
    if (!templates.has(lesson.templateId)) {
      issues.push(issue("error", "MISSING_TEMPLATE",
        `Lesson references missing template ${lesson.templateId}.`, { lessonId: lesson.id }));
    }
    for (const puzzleId of lesson.puzzleIds) {
      if (!puzzleIds.has(puzzleId)) {
        issues.push(issue("error", "MISSING_PUZZLE",
          `Lesson references missing puzzle ${puzzleId}.`, { lessonId: lesson.id }));
      }
    }
  }

  for (const template of content.templates) {
    const analysis = analyzeTopologyTemplate(template);
    if (analysis.connectedComponents > 1 && analysis.equationCount > 1) {
      issues.push(issue("warning", "DISCONNECTED_TEMPLATE",
        `Template has ${analysis.connectedComponents} disconnected components.`,
        { templateId: template.id }));
    }
  }

  return {
    valid: issues.every((item) => item.severity !== "error"),
    summary: {
      puzzleCount: library.puzzles.length,
      templateCount: content.templates.length,
      lessonCount: content.lessons.length,
      invalidPuzzleCount,
      nonUniquePuzzleCount,
      duplicateExactCount,
      duplicateTopologyCount,
      difficultyMismatchCount,
    },
    issues,
  };
}

export function summarizeGenerationMetrics(input: {
  readonly attempted: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly acceptedDifficulties: readonly DifficultyTier[];
}): StudioGenerationMetrics {
  if (![input.attempted, input.accepted, input.rejected].every(
    (value) => Number.isInteger(value) && value >= 0,
  )) {
    throw new Error("Generation counters must be non-negative integers.");
  }
  if (input.accepted + input.rejected !== input.attempted) {
    throw new Error("Accepted and rejected counts must equal attempted.");
  }
  if (input.acceptedDifficulties.length !== input.accepted) {
    throw new Error("Difficulty count must match accepted puzzles.");
  }
  const distribution: Record<DifficultyTier, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  };
  for (const tier of input.acceptedDifficulties) distribution[tier] += 1;
  return {
    attempted: input.attempted,
    accepted: input.accepted,
    rejected: input.rejected,
    duplicateRate: round(input.attempted === 0 ? 0 : input.rejected / input.attempted),
    acceptanceRate: round(input.attempted === 0 ? 0 : input.accepted / input.attempted),
    difficultyDistribution: distribution,
  };
}
