import type { DifficultyTier } from "../../types/Difficulty";
import type { DifficultyCertification } from "../../types/DifficultyCertification";
import type {
  IndustrialGenerationCheckpoint,
  IndustrialGenerationResult,
  PuzzleFingerprints,
} from "../../types/IndustrialGeneration";
import type { Puzzle } from "../../types/Puzzle";
import type {
  PuzzleSolverOptions,
  PuzzleSolverResult,
  UniqueSolutionVerification,
} from "../../types/Solver";
import type {
  ArithmeticOperator,
  BoardTopology,
} from "../../types/Topology";
import type { TopologyGenerationProfile } from "../../game/board/TopologySkeletonGenerator";

export interface GeneratePuzzleOptions {
  readonly seed: number;
  readonly difficulty: DifficultyTier;
  readonly id?: string;
  readonly width?: number;
  readonly height?: number;
  readonly equationCount?: number;
  readonly hiddenCellCount?: number;
  readonly operators?: readonly ArithmeticOperator[];
  readonly requireDistinctValues?: boolean;
  readonly maximumAttempts?: number;
  readonly topologyProfile?: TopologyGenerationProfile;
}

export interface GeneratedPuzzle {
  readonly puzzle: Puzzle;
  readonly topology: BoardTopology;
  readonly certification: DifficultyCertification;
  readonly fingerprints: PuzzleFingerprints;
  readonly generationSeed: number;
  readonly attempts: number;
}

export interface VerifyPuzzleResult {
  readonly valid: boolean;
  readonly unique: boolean;
  readonly issues: readonly string[];
  readonly verification: UniqueSolutionVerification | null;
}

export interface ExportLibraryOptions
  extends Omit<GeneratePuzzleOptions, "seed" | "id"> {
  readonly rootSeed: string;
  readonly count: number;
  readonly chunkSize?: number;
  readonly maximumAttempts?: number;
  readonly checkpoint?: IndustrialGenerationCheckpoint;
  readonly rejectStructuralDuplicates?: boolean;
  readonly idPrefix?: string;
}

export interface CrossMathEngineApi {
  generate(options: GeneratePuzzleOptions): GeneratedPuzzle;
  solve(puzzle: Puzzle, options?: PuzzleSolverOptions): PuzzleSolverResult;
  verify(puzzle: Puzzle): VerifyPuzzleResult;
  certify(puzzle: Puzzle): DifficultyCertification;
  fingerprint(puzzle: Puzzle): PuzzleFingerprints;
  exportLibrary(options: ExportLibraryOptions): IndustrialGenerationResult;
}
