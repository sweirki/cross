import type {
  IndustrialGenerationManifest,
  IndustrialPuzzleRecord,
} from "../types/IndustrialGeneration";
import type { DifficultyTier } from "../types/Difficulty";
import type { Puzzle } from "../types/Puzzle";
import { validatePuzzle } from "../game/validation/PuzzleValidation";

export interface PuzzleLibrary {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly puzzles: readonly Puzzle[];
  readonly manifest?: IndustrialGenerationManifest;
}

export interface IndustrialLibraryInput {
  readonly id: string;
  readonly records: readonly IndustrialPuzzleRecord[];
  readonly manifest?: IndustrialGenerationManifest;
}

export function createPuzzleLibrary(input: IndustrialLibraryInput): PuzzleLibrary {
  const puzzles = [...input.records]
    .sort((left, right) => left.puzzle.id.localeCompare(right.puzzle.id))
    .map((record) => record.puzzle);
  return validatePuzzleLibrary({
    schemaVersion: 1,
    id: input.id,
    puzzles,
    ...(input.manifest === undefined ? {} : { manifest: input.manifest }),
  });
}

export function validatePuzzleLibrary(value: PuzzleLibrary): PuzzleLibrary {
  if (value.schemaVersion !== 1 || value.id.trim().length === 0) {
    throw new Error("Puzzle library metadata is invalid.");
  }
  const ids = new Set<string>();
  for (const puzzle of value.puzzles) {
    if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle ID: ${puzzle.id}.`);
    ids.add(puzzle.id);
    const result = validatePuzzle(puzzle);
    if (!result.valid) {
      throw new Error(`Invalid puzzle ${puzzle.id}: ${JSON.stringify(result.issues)}`);
    }
  }
  return value;
}

export function parsePuzzleLibrary(json: string): PuzzleLibrary {
  return validatePuzzleLibrary(JSON.parse(json) as PuzzleLibrary);
}

export function selectPuzzle(
  library: PuzzleLibrary,
  options: {
    readonly id?: string;
    readonly difficulty?: DifficultyTier;
    readonly index?: number;
  } = {},
): Puzzle {
  const candidates = options.difficulty === undefined
    ? library.puzzles
    : library.puzzles.filter((puzzle) => puzzle.difficulty === options.difficulty);
  const puzzle = options.id === undefined
    ? candidates[options.index ?? 0]
    : candidates.find((candidate) => candidate.id === options.id);
  if (puzzle === undefined) throw new Error("No puzzle matches the requested selection.");
  return puzzle;
}
