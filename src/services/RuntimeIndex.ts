import type { DifficultyTier } from "../types/Difficulty";
import type { Puzzle } from "../types/Puzzle";
import type { PuzzleLibrary } from "./PuzzleLibrary";

export interface RuntimePuzzleIndex {
  readonly byId: ReadonlyMap<string, Puzzle>;
  readonly byDifficulty: ReadonlyMap<DifficultyTier, readonly Puzzle[]>;
}

export function createRuntimePuzzleIndex(library: PuzzleLibrary): RuntimePuzzleIndex {
  const byId = new Map<string, Puzzle>();
  const mutable = new Map<DifficultyTier, Puzzle[]>([
    ["easy", []], ["medium", []], ["hard", []], ["expert", []],
  ]);
  for (const puzzle of library.puzzles) {
    byId.set(puzzle.id, puzzle);
    mutable.get(puzzle.difficulty)!.push(puzzle);
  }
  const byDifficulty = new Map<DifficultyTier, readonly Puzzle[]>();
  for (const [tier, puzzles] of mutable) {
    byDifficulty.set(tier, puzzles.sort((a, b) => a.id.localeCompare(b.id)));
  }
  return { byId, byDifficulty };
}
