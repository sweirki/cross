import type { DifficultyTier } from "../types/Difficulty";
import type { PuzzleCatalogEntry, PuzzleProgress } from "../types/RuntimeContent";
import type { PuzzleLibrary } from "./PuzzleLibrary";

export function buildPuzzleCatalog(
  library: PuzzleLibrary,
  progress: Readonly<Record<string, PuzzleProgress>> = {},
): readonly PuzzleCatalogEntry[] {
  const order: Readonly<Record<DifficultyTier, number>> = {
    easy: 0, medium: 1, hard: 2, expert: 3,
  };
  return [...library.puzzles]
    .sort((a, b) => order[a.difficulty] - order[b.difficulty] || a.id.localeCompare(b.id))
    .map((puzzle, index, puzzles) => {
      const state = progress[puzzle.id];
      const previous = index === 0 ? undefined : progress[puzzles[index - 1]!.id];
      return {
        puzzle,
        difficulty: puzzle.difficulty,
        completed: state?.completed ?? false,
        locked: index > 0 && previous?.completed !== true,
        stars: state?.stars ?? 0,
        bestTimeMs: state?.bestTimeMs ?? null,
      };
    });
}
