export interface PlayerPuzzleRecord {
  readonly puzzleId: string;
  readonly completed: boolean;
  readonly stars: number;
  readonly bestMoves?: number;
  readonly bestTimeMs?: number;
  readonly hintsUsed: number;
  readonly updatedAt: string;
}

export interface PlayerLessonRecord {
  readonly lessonId: string;
  readonly completed: boolean;
  readonly stars: number;
  readonly updatedAt: string;
}

export interface PlayerPreferences {
  readonly locale: string;
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly textScale: number;
}

export interface PlayerSaveV2 {
  readonly schemaVersion: 2;
  readonly profileId: string;
  readonly revision: number;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly puzzles: readonly PlayerPuzzleRecord[];
  readonly lessons: readonly PlayerLessonRecord[];
  readonly preferences: PlayerPreferences;
}

export interface PlayerSaveV1 {
  readonly schemaVersion: 1;
  readonly profileId: string;
  readonly appVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedPuzzleIds: readonly string[];
  readonly lessonStars?: Readonly<Record<string, number>>;
}

export interface SaveBackup {
  readonly format: "crossmath-player-backup";
  readonly formatVersion: 1;
  readonly exportedAt: string;
  readonly checksum: string;
  readonly save: PlayerSaveV2;
}

export interface SyncSnapshot {
  readonly deviceId: string;
  readonly save: PlayerSaveV2;
}

export interface SyncConflict {
  readonly kind: "puzzle" | "lesson" | "preferences";
  readonly id: string;
  readonly resolution: "merged" | "newest";
}

export interface SyncMergeResult {
  readonly save: PlayerSaveV2;
  readonly conflicts: readonly SyncConflict[];
  readonly sourceDevices: readonly string[];
}

export interface ContentEntitlements {
  readonly premium: boolean;
  readonly grantedPackIds: readonly string[];
  readonly expiresAt?: string;
}

export interface ContentAccessDecision {
  readonly allowed: boolean;
  readonly reason: "free" | "premium" | "granted" | "expired" | "not-entitled";
}

export interface ReleaseDiagnosticsInput {
  readonly appVersion: string;
  readonly runtimeVersion: string;
  readonly contentVersion?: string;
  readonly contentCompatible: boolean;
  readonly save: PlayerSaveV2;
  readonly installedPackIds: readonly string[];
}

export interface ReleaseDiagnostics {
  readonly healthy: boolean;
  readonly generatedAt: string;
  readonly summary: {
    readonly appVersion: string;
    readonly runtimeVersion: string;
    readonly contentVersion?: string;
    readonly saveSchemaVersion: number;
    readonly installedPacks: number;
    readonly saveRevision: number;
  };
  readonly issues: readonly {
    readonly severity: "error" | "warning";
    readonly code: string;
    readonly message: string;
  }[];
}
