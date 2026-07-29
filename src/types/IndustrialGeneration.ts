
import type { DifficultyCertification } from "./DifficultyCertification";
import type { DifficultyTier } from "./Difficulty";
import type { Puzzle } from "./Puzzle";

export interface PuzzleFingerprints {
  readonly exact: string;
  readonly structural: string;
  readonly topology: string;
  readonly solution: string;
}

export interface IndustrialPuzzleRecord {
  readonly puzzle: Puzzle;
  readonly certification: DifficultyCertification;
  readonly fingerprints: PuzzleFingerprints;
  readonly attemptIndex: number;
}

export interface IndustrialGenerationCheckpoint {
  readonly version: 1;
  readonly rootSeed: string;
  readonly nextAttemptIndex: number;
  readonly accepted: number;
  readonly rejectedDuplicates: number;
  readonly rejectedInvalid: number;
  readonly exactFingerprints: readonly string[];
  readonly structuralFingerprints: readonly string[];
}

export interface IndustrialGenerationManifest {
  readonly schemaVersion: 1;
  readonly rootSeed: string;
  readonly requestedCount: number;
  readonly generatedCount: number;
  readonly attempts: number;
  readonly rejectedDuplicates: number;
  readonly rejectedInvalid: number;
  readonly chunks: readonly {
    readonly index: number;
    readonly firstPuzzleId: string;
    readonly lastPuzzleId: string;
    readonly count: number;
  }[];
  readonly difficultyDistribution: Readonly<Record<DifficultyTier, number>>;
}

export interface IndustrialGenerationResult {
  readonly records: readonly IndustrialPuzzleRecord[];
  readonly chunks: readonly (readonly IndustrialPuzzleRecord[])[];
  readonly checkpoint: IndustrialGenerationCheckpoint;
  readonly manifest: IndustrialGenerationManifest;
}

export interface IndustrialGenerationRequest {
  readonly rootSeed: string;
  readonly count: number;
  readonly chunkSize: number;
  readonly maximumAttempts: number;
  readonly checkpoint?: IndustrialGenerationCheckpoint;
  readonly rejectStructuralDuplicates?: boolean;
}

export type IndustrialCandidateFactory = (
  attemptIndex: number,
  attemptSeed: number,
) => Puzzle | undefined;
