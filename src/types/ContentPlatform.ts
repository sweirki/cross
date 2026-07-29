import type { DifficultyTier } from "./Difficulty";
import type { Puzzle } from "./Puzzle";

export type ContentPackKind = "tutorial" | "beginner" | "intermediate" | "advanced" | "expert" | "mixed";

export interface ContentPackIndex {
  readonly byDifficulty: Readonly<Record<DifficultyTier, readonly string[]>>;
  readonly byConcept: Readonly<Record<string, readonly string[]>>;
  readonly byTemplate: Readonly<Record<string, readonly string[]>>;
  readonly byLesson: Readonly<Record<string, readonly string[]>>;
}

export interface CompiledContentPack {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly kind: ContentPackKind;
  readonly checksum: string;
  readonly puzzles: readonly Puzzle[];
  readonly index: ContentPackIndex;
}

export interface ContentReleaseManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly minimumRuntimeVersion: string;
  readonly generatedAt: string;
  readonly packIds: readonly string[];
  readonly puzzleCount: number;
  readonly checksum: string;
}

export interface ContentRelease {
  readonly manifest: ContentReleaseManifest;
  readonly packs: readonly CompiledContentPack[];
}

export interface PuzzleClassification {
  readonly puzzleId: string;
  readonly concepts?: readonly string[];
  readonly templateId?: string;
  readonly lessonIds?: readonly string[];
}

export interface CompilePackInput {
  readonly id: string;
  readonly version: string;
  readonly kind: ContentPackKind;
  readonly puzzles: readonly Puzzle[];
  readonly classifications?: readonly PuzzleClassification[];
}

export interface ContentQuery {
  readonly packId?: string;
  readonly puzzleId?: string;
  readonly difficulty?: DifficultyTier;
  readonly concept?: string;
  readonly templateId?: string;
  readonly lessonId?: string;
}

export interface ContentQaReport {
  readonly valid: boolean;
  readonly generatedAt: string;
  readonly totals: {
    readonly packs: number;
    readonly puzzles: number;
    readonly uniquePuzzles: number;
    readonly duplicatePuzzleIds: number;
    readonly checksumFailures: number;
  };
  readonly difficulty: Readonly<Record<DifficultyTier, number>>;
  readonly issues: readonly { readonly severity: "error" | "warning"; readonly code: string; readonly message: string }[];
}

export interface MessageCatalog {
  readonly locale: string;
  readonly messages: Readonly<Record<string, string>>;
}

export interface PublishedContentRelease {
  readonly release: ContentRelease;
  readonly qa: ContentQaReport;
  readonly serializedManifest: string;
  readonly serializedPacks: Readonly<Record<string, string>>;
}
