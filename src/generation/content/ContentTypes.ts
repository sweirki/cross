
import type { DifficultyTier } from "../../types/Difficulty";
import type { Puzzle } from "../../types/Puzzle";
import type { CandidateCertificate, PuzzleDNA } from "../contracts/GenerationContracts";
import type { QualityScorecard } from "../certification/CertificationTypes";

export interface CertifiedPuzzleRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly puzzle: Puzzle;
  readonly certificate: CandidateCertificate;
  readonly dna: PuzzleDNA;
  readonly scorecard: QualityScorecard;
  readonly tags: readonly string[];
  readonly estimatedSolveSeconds: number;
}

export interface CertifiedPuzzleCatalog {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly generatorVersion: string;
  readonly createdFromSeed: string;
  readonly puzzles: readonly CertifiedPuzzleRecord[];
  readonly fingerprint: string;
}

export interface CampaignLevelV2 {
  readonly id: string;
  readonly puzzleId: string;
  readonly difficulty: DifficultyTier;
  readonly unlockAfterLevelId?: string;
}

export interface CampaignChapterV2 {
  readonly id: string;
  readonly title: string;
  readonly levels: readonly CampaignLevelV2[];
}

export interface CertifiedCampaign {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly catalogId: string;
  readonly chapters: readonly CampaignChapterV2[];
  readonly fingerprint: string;
}

export interface LegacyCampaign {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly chapters: readonly {
    readonly id: string;
    readonly title: string;
    readonly levels: readonly {
      readonly id: string;
      readonly puzzleId: string;
      readonly unlockAfterLevelId?: string;
    }[];
  }[];
}
