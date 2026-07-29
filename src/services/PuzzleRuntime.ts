import type { Puzzle } from "../types/Puzzle";
import { validatePuzzle } from "../game/validation/PuzzleValidation";
import {
  parsePuzzleLibrary,
  selectPuzzle,
  type PuzzleLibrary,
} from "./PuzzleLibrary";

export interface PuzzleSource {
  load(): Promise<string | PuzzleLibrary>;
}

export async function loadPuzzleLibrary(source: PuzzleSource): Promise<PuzzleLibrary> {
  const value = await source.load();
  return typeof value === "string" ? parsePuzzleLibrary(value) : parsePuzzleLibrary(JSON.stringify(value));
}

export async function loadPuzzle(
  source: PuzzleSource,
  options: Parameters<typeof selectPuzzle>[1] = {},
): Promise<Puzzle> {
  const puzzle = selectPuzzle(await loadPuzzleLibrary(source), options);
  const validation = validatePuzzle(puzzle);
  if (!validation.valid) throw new Error(`Runtime puzzle validation failed: ${puzzle.id}.`);
  return puzzle;
}

export function inMemoryPuzzleSource(library: PuzzleLibrary): PuzzleSource {
  return { load: async () => library };
}
