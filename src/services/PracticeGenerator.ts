import type { LearningContent } from "../types/LearningContent";
import type { PracticeRequest, PracticeSet } from "../types/PremiumGameplay";
import type { PuzzleLibrary } from "./PuzzleLibrary";

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function buildPracticeSet(
  content: LearningContent,
  library: PuzzleLibrary,
  request: PracticeRequest,
): PracticeSet {
  if (!Number.isInteger(request.count) || request.count <= 0) {
    throw new Error("Practice count must be a positive integer.");
  }
  const allowed = new Set(
    content.lessons
      .filter((lesson) => lesson.concept === request.concept)
      .flatMap((lesson) => lesson.puzzleIds),
  );
  const excluded = new Set(request.excludePuzzleIds ?? []);
  const candidates = library.puzzles
    .filter((puzzle) => allowed.has(puzzle.id) && !excluded.has(puzzle.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (candidates.length === 0) {
    return { concept: request.concept, puzzleIds: [], requestedCount: request.count, exhausted: true };
  }

  const offset = hash(`${request.concept}:${request.seed}`) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const chosen = rotated.slice(0, request.count).map((puzzle) => puzzle.id);
  return {
    concept: request.concept,
    puzzleIds: chosen,
    requestedCount: request.count,
    exhausted: chosen.length < request.count,
  };
}
