import type { PuzzleProgress } from "../types/RuntimeContent";
import type {
  AuthoredTemplateDraft,
  CurriculumLessonNode,
  CurriculumRecommendation,
  LearningContent,
  LearningTopologyTemplate,
  LessonProfile,
  TemplatePreview,
  TemplatePreviewCell,
} from "../types/LearningContent";
import { countTemplateIntersections } from "./LearningContentRuntime";

function key(row: number, column: number): string {
  return `${row}:${column}`;
}

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} must be a non-empty kebab-case identifier.`);
  }
}

export function authorTopologyTemplate(
  draft: AuthoredTemplateDraft,
): LearningTopologyTemplate {
  assertIdentifier(draft.id, "Template id");
  if (draft.title.trim().length === 0) throw new Error("Template title is required.");
  if (!Number.isInteger(draft.width) || !Number.isInteger(draft.height) ||
      draft.width < 1 || draft.height < 1) {
    throw new Error("Template dimensions must be positive integers.");
  }
  if (draft.equations.length === 0) throw new Error("A template needs at least one equation.");
  if (draft.concepts.length === 0) throw new Error("A template needs at least one concept.");
  if (draft.allowedOperators.length === 0) {
    throw new Error("A template needs at least one allowed operator.");
  }
  if (!Number.isInteger(draft.minimumGivens) || draft.minimumGivens < 0) {
    throw new Error("minimumGivens must be a non-negative integer.");
  }

  const equationIds = new Set<string>();
  for (const equation of draft.equations) {
    assertIdentifier(equation.id, "Equation id");
    if (equationIds.has(equation.id)) {
      throw new Error(`Duplicate equation id: ${equation.id}.`);
    }
    equationIds.add(equation.id);
    if (!Number.isInteger(equation.start.row) ||
        !Number.isInteger(equation.start.column) ||
        equation.start.row < 0 ||
        equation.start.column < 0) {
      throw new Error(`Equation ${equation.id} has an invalid start position.`);
    }
    const endRow = equation.start.row + (equation.orientation === "vertical" ? 4 : 0);
    const endColumn = equation.start.column + (equation.orientation === "horizontal" ? 4 : 0);
    if (endRow >= draft.height || endColumn >= draft.width) {
      throw new Error(`Equation ${equation.id} falls outside the template bounds.`);
    }
  }

  const template: LearningTopologyTemplate = {
    schemaVersion: 1,
    id: draft.id,
    title: draft.title.trim(),
    width: draft.width,
    height: draft.height,
    equations: [...draft.equations],
    concepts: [...new Set(draft.concepts)],
    allowedOperators: [...new Set(draft.allowedOperators)],
    minimumGivens: draft.minimumGivens,
    recommendedDifficulty: draft.recommendedDifficulty,
  };

  buildTemplatePreview(template);
  return template;
}

export function buildTemplatePreview(
  template: LearningTopologyTemplate,
): TemplatePreview {
  const cells = new Map<string, {
    row: number;
    column: number;
    kind: TemplatePreviewCell["kind"];
    equationIds: string[];
  }>();

  for (const equation of template.equations) {
    for (let offset = 0; offset < 5; offset += 1) {
      const row = equation.start.row +
        (equation.orientation === "vertical" ? offset : 0);
      const column = equation.start.column +
        (equation.orientation === "horizontal" ? offset : 0);
      if (row < 0 || column < 0 || row >= template.height || column >= template.width) {
        throw new Error(`Equation ${equation.id} falls outside template ${template.id}.`);
      }
      const kind: TemplatePreviewCell["kind"] =
        offset === 1 ? "operator" : offset === 3 ? "equals" : "number";
      const cellKey = key(row, column);
      const existing = cells.get(cellKey);
      if (existing !== undefined) {
        if (existing.kind !== "number" || kind !== "number") {
          throw new Error(
            `Template ${template.id} has an illegal symbol intersection at ${cellKey}.`,
          );
        }
        existing.equationIds.push(equation.id);
      } else {
        cells.set(cellKey, { row, column, kind, equationIds: [equation.id] });
      }
    }
  }

  const previewCells: TemplatePreviewCell[] = [...cells.values()]
    .sort((a, b) => a.row - b.row || a.column - b.column)
    .map((cell) => ({
      row: cell.row,
      column: cell.column,
      kind: cell.kind,
      equationIds: [...cell.equationIds].sort(),
      shared: cell.equationIds.length > 1,
    }));

  return {
    templateId: template.id,
    width: template.width,
    height: template.height,
    equationCount: template.equations.length,
    intersectionCount: previewCells.filter((cell) => cell.shared).length,
    cells: previewCells,
  };
}

function progressFor(
  lesson: LessonProfile,
  progress: ReadonlyMap<string, PuzzleProgress>,
): { completed: boolean; stars: 0 | 1 | 2 | 3 } {
  let stars: 0 | 1 | 2 | 3 = 0;
  let completed = false;
  for (const puzzleId of lesson.puzzleIds) {
    const item = progress.get(puzzleId);
    if (item?.completed === true) completed = true;
    if (item !== undefined && item.stars > stars) stars = item.stars;
  }
  return { completed, stars };
}

export function buildCurriculum(
  content: LearningContent,
  progressItems: readonly PuzzleProgress[],
): readonly CurriculumLessonNode[] {
  const progress = new Map(progressItems.map((item) => [item.puzzleId, item] as const));
  const templates = new Map(content.templates.map((template) => [template.id, template] as const));
  const lessons = new Map(content.lessons.map((lesson) => [lesson.id, lesson] as const));
  const result: CurriculumLessonNode[] = [];
  let previousMastered = true;

  for (const chapter of content.campaign.chapters) {
    for (const lessonId of chapter.lessonIds) {
      const lesson = lessons.get(lessonId);
      if (lesson === undefined) throw new Error(`Campaign references unknown lesson ${lessonId}.`);
      const template = templates.get(lesson.templateId);
      if (template === undefined) throw new Error(`Lesson ${lesson.id} has no template.`);
      const current = progressFor(lesson, progress);
      const mastered = current.completed && current.stars >= lesson.masteryStars;
      result.push({
        chapterId: chapter.id,
        lesson,
        template,
        status: mastered ? "completed" : previousMastered ? "available" : "locked",
        earnedStars: current.stars,
      });
      previousMastered = previousMastered && mastered;
    }
  }
  return result;
}

export function recommendNextLesson(
  curriculum: readonly CurriculumLessonNode[],
): CurriculumRecommendation {
  const available = curriculum.find((node) => node.status === "available");
  if (available !== undefined) {
    return {
      kind: available.earnedStars > 0 ? "practice" : "continue",
      lessonId: available.lesson.id,
      reason: available.earnedStars > 0
        ? `Practice ${available.lesson.title} to reach ${available.lesson.masteryStars} star mastery.`
        : `Continue with ${available.lesson.title}.`,
    };
  }
  const incomplete = curriculum.find((node) => node.status !== "completed");
  if (incomplete !== undefined) {
    return {
      kind: "practice",
      lessonId: incomplete.lesson.id,
      reason: `Strengthen ${incomplete.lesson.title} before continuing.`,
    };
  }
  return {
    kind: "complete",
    lessonId: null,
    reason: "The current learning campaign is complete.",
  };
}

export function serializeTemplate(
  template: LearningTopologyTemplate,
): string {
  return JSON.stringify(template, null, 2);
}

export function parseAuthoredTemplate(serialized: string): LearningTopologyTemplate {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("Template JSON is invalid.");
  }
  if (typeof value !== "object" || value === null) {
    throw new Error("Template JSON must contain an object.");
  }
  const candidate = value as Partial<LearningTopologyTemplate>;
  if (candidate.schemaVersion !== 1) {
    throw new Error("Unsupported template schema version.");
  }
  return authorTopologyTemplate({
    id: candidate.id ?? "",
    title: candidate.title ?? "",
    width: candidate.width ?? 0,
    height: candidate.height ?? 0,
    equations: candidate.equations ?? [],
    concepts: candidate.concepts ?? [],
    allowedOperators: candidate.allowedOperators ?? [],
    minimumGivens: candidate.minimumGivens ?? -1,
    recommendedDifficulty: candidate.recommendedDifficulty ?? "easy",
  });
}

export function templateStructuralSummary(
  template: LearningTopologyTemplate,
): string {
  const intersections = countTemplateIntersections(template);
  return `${template.equations.length} equation${template.equations.length === 1 ? "" : "s"}, ` +
    `${intersections} intersection${intersections === 1 ? "" : "s"}`;
}
