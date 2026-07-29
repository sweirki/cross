import type { DifficultyTier } from "./Difficulty";
import type { Puzzle } from "./Puzzle";

export interface PuzzleProgress {
  readonly puzzleId: string;
  readonly completed: boolean;
  readonly attempts: number;
  readonly bestTimeMs: number | null;
  readonly bestMoves: number | null;
  readonly stars: 0 | 1 | 2 | 3;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly updatedAt: string;
}

export interface PlayStatistics {
  readonly puzzleId: string;
  readonly startedAt: string;
  readonly elapsedMs: number;
  readonly moves: number;
  readonly mistakes: number;
  readonly undoCount: number;
  readonly hintCount: number;
  readonly completed: boolean;
}

export interface PuzzleCatalogEntry {
  readonly puzzle: Puzzle;
  readonly difficulty: DifficultyTier;
  readonly completed: boolean;
  readonly locked: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly bestTimeMs: number | null;
}

export interface DailyChallenge {
  readonly date: string;
  readonly puzzleId: string;
  readonly puzzle: Puzzle;
}

export interface CampaignLevel {
  readonly id: string;
  readonly puzzleId: string;
  readonly unlockAfterLevelId?: string;
}

export interface CampaignChapter {
  readonly id: string;
  readonly title: string;
  readonly levels: readonly CampaignLevel[];
}

export interface Campaign {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly chapters: readonly CampaignChapter[];
}

export interface CampaignLevelState {
  readonly chapterId: string;
  readonly level: CampaignLevel;
  readonly puzzle: Puzzle;
  readonly locked: boolean;
  readonly completed: boolean;
}

export interface LogicalHint {
  readonly cellId: string;
  readonly value: number;
  readonly tileId: string;
  readonly equationIds: readonly string[];
  readonly message: string;
}
