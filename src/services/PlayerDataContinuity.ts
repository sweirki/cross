import { contentChecksum } from "./ContentPlatform";
import type {
  ContentAccessDecision,
  ContentEntitlements,
  PlayerLessonRecord,
  PlayerPreferences,
  PlayerPuzzleRecord,
  PlayerSaveV1,
  PlayerSaveV2,
  ReleaseDiagnostics,
  ReleaseDiagnosticsInput,
  SaveBackup,
  SyncConflict,
  SyncMergeResult,
  SyncSnapshot,
} from "../types/PlayerDataContinuity";

const DEFAULT_PREFERENCES: PlayerPreferences = {
  locale: "en-US",
  highContrast: false,
  reducedMotion: false,
  textScale: 1,
};

function assertIsoDate(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO date.`);
  }
}

function clampStars(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.floor(value)));
}

function normalizePreferences(value: Partial<PlayerPreferences> | undefined): PlayerPreferences {
  const scale = value?.textScale ?? DEFAULT_PREFERENCES.textScale;
  return {
    locale: value?.locale?.trim() || DEFAULT_PREFERENCES.locale,
    highContrast: value?.highContrast ?? DEFAULT_PREFERENCES.highContrast,
    reducedMotion: value?.reducedMotion ?? DEFAULT_PREFERENCES.reducedMotion,
    textScale: Math.max(0.8, Math.min(2, Number.isFinite(scale) ? scale : 1)),
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}

function newestDate(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function oldestDate(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function bestPositive(a: number | undefined, b: number | undefined): number | undefined {
  const values = [a, b].filter((value): value is number => value !== undefined && Number.isFinite(value) && value >= 0);
  return values.length === 0 ? undefined : Math.min(...values);
}

export function createPlayerSave(
  profileId: string,
  appVersion: string,
  now: string,
  preferences: Partial<PlayerPreferences> = {},
): PlayerSaveV2 {
  if (!profileId.trim()) throw new Error("Profile ID is required.");
  if (!appVersion.trim()) throw new Error("App version is required.");
  assertIsoDate(now, "now");
  return {
    schemaVersion: 2,
    profileId,
    revision: 0,
    appVersion,
    createdAt: now,
    updatedAt: now,
    puzzles: [],
    lessons: [],
    preferences: normalizePreferences(preferences),
  };
}

export function validatePlayerSave(save: PlayerSaveV2): readonly string[] {
  const issues: string[] = [];
  if (save.schemaVersion !== 2) issues.push("Unsupported save schema.");
  if (!save.profileId.trim()) issues.push("Profile ID is required.");
  if (!Number.isInteger(save.revision) || save.revision < 0) issues.push("Revision must be a non-negative integer.");
  if (Number.isNaN(Date.parse(save.createdAt))) issues.push("createdAt is invalid.");
  if (Number.isNaN(Date.parse(save.updatedAt))) issues.push("updatedAt is invalid.");
  if (Date.parse(save.updatedAt) < Date.parse(save.createdAt)) issues.push("updatedAt cannot precede createdAt.");
  const puzzleIds = new Set<string>();
  for (const puzzle of save.puzzles) {
    if (!puzzle.puzzleId.trim()) issues.push("Puzzle record has no ID.");
    if (puzzleIds.has(puzzle.puzzleId)) issues.push(`Duplicate puzzle record: ${puzzle.puzzleId}`);
    puzzleIds.add(puzzle.puzzleId);
    if (puzzle.stars < 0 || puzzle.stars > 3) issues.push(`Invalid stars for puzzle: ${puzzle.puzzleId}`);
    if (Number.isNaN(Date.parse(puzzle.updatedAt))) issues.push(`Invalid puzzle timestamp: ${puzzle.puzzleId}`);
  }
  const lessonIds = new Set<string>();
  for (const lesson of save.lessons) {
    if (!lesson.lessonId.trim()) issues.push("Lesson record has no ID.");
    if (lessonIds.has(lesson.lessonId)) issues.push(`Duplicate lesson record: ${lesson.lessonId}`);
    lessonIds.add(lesson.lessonId);
    if (lesson.stars < 0 || lesson.stars > 3) issues.push(`Invalid stars for lesson: ${lesson.lessonId}`);
    if (Number.isNaN(Date.parse(lesson.updatedAt))) issues.push(`Invalid lesson timestamp: ${lesson.lessonId}`);
  }
  return issues;
}

export function migratePlayerSave(input: PlayerSaveV1 | PlayerSaveV2): PlayerSaveV2 {
  if (input.schemaVersion === 2) {
    const migrated: PlayerSaveV2 = {
      ...input,
      puzzles: [...input.puzzles].sort((a, b) => a.puzzleId.localeCompare(b.puzzleId)),
      lessons: [...input.lessons].sort((a, b) => a.lessonId.localeCompare(b.lessonId)),
      preferences: normalizePreferences(input.preferences),
    };
    const issues = validatePlayerSave(migrated);
    if (issues.length > 0) throw new Error(`Invalid save: ${issues.join(" ")}`);
    return migrated;
  }

  if (input.schemaVersion !== 1) throw new Error("Unsupported save schema.");
  assertIsoDate(input.createdAt, "createdAt");
  assertIsoDate(input.updatedAt, "updatedAt");
  const puzzles: PlayerPuzzleRecord[] = uniqueSorted(input.completedPuzzleIds).map((puzzleId) => ({
    puzzleId,
    completed: true,
    stars: 1,
    hintsUsed: 0,
    updatedAt: input.updatedAt,
  }));
  const lessons: PlayerLessonRecord[] = Object.entries(input.lessonStars ?? {})
    .map(([lessonId, stars]) => ({
      lessonId,
      completed: stars > 0,
      stars: clampStars(stars),
      updatedAt: input.updatedAt,
    }))
    .sort((a, b) => a.lessonId.localeCompare(b.lessonId));

  return {
    schemaVersion: 2,
    profileId: input.profileId,
    revision: 0,
    appVersion: input.appVersion,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    puzzles,
    lessons,
    preferences: DEFAULT_PREFERENCES,
  };
}

function mergePuzzle(a: PlayerPuzzleRecord, b: PlayerPuzzleRecord): PlayerPuzzleRecord {
  return {
    puzzleId: a.puzzleId,
    completed: a.completed || b.completed,
    stars: Math.max(clampStars(a.stars), clampStars(b.stars)),
    bestMoves: bestPositive(a.bestMoves, b.bestMoves),
    bestTimeMs: bestPositive(a.bestTimeMs, b.bestTimeMs),
    hintsUsed: Math.min(Math.max(0, a.hintsUsed), Math.max(0, b.hintsUsed)),
    updatedAt: newestDate(a.updatedAt, b.updatedAt),
  };
}

function mergeLesson(a: PlayerLessonRecord, b: PlayerLessonRecord): PlayerLessonRecord {
  return {
    lessonId: a.lessonId,
    completed: a.completed || b.completed,
    stars: Math.max(clampStars(a.stars), clampStars(b.stars)),
    updatedAt: newestDate(a.updatedAt, b.updatedAt),
  };
}

export function mergeSyncSnapshots(snapshots: readonly SyncSnapshot[]): SyncMergeResult {
  if (snapshots.length === 0) throw new Error("At least one sync snapshot is required.");
  const profileId = snapshots[0]!.save.profileId;
  if (snapshots.some((snapshot) => snapshot.save.profileId !== profileId)) {
    throw new Error("Cannot merge snapshots from different profiles.");
  }
  for (const snapshot of snapshots) {
    const issues = validatePlayerSave(snapshot.save);
    if (issues.length > 0) throw new Error(`Invalid snapshot from ${snapshot.deviceId}: ${issues.join(" ")}`);
  }

  const ordered = [...snapshots].sort((a, b) =>
    Date.parse(a.save.updatedAt) - Date.parse(b.save.updatedAt) || a.deviceId.localeCompare(b.deviceId));
  const newest = ordered[ordered.length - 1]!;
  const puzzleMap = new Map<string, PlayerPuzzleRecord>();
  const lessonMap = new Map<string, PlayerLessonRecord>();
  const conflicts: SyncConflict[] = [];

  for (const snapshot of ordered) {
    for (const record of snapshot.save.puzzles) {
      const existing = puzzleMap.get(record.puzzleId);
      if (existing) {
        puzzleMap.set(record.puzzleId, mergePuzzle(existing, record));
        conflicts.push({ kind: "puzzle", id: record.puzzleId, resolution: "merged" });
      } else puzzleMap.set(record.puzzleId, record);
    }
    for (const record of snapshot.save.lessons) {
      const existing = lessonMap.get(record.lessonId);
      if (existing) {
        lessonMap.set(record.lessonId, mergeLesson(existing, record));
        conflicts.push({ kind: "lesson", id: record.lessonId, resolution: "merged" });
      } else lessonMap.set(record.lessonId, record);
    }
  }

  if (ordered.some((snapshot) =>
    JSON.stringify(snapshot.save.preferences) !== JSON.stringify(newest.save.preferences))) {
    conflicts.push({ kind: "preferences", id: "preferences", resolution: "newest" });
  }

  return {
    save: {
      schemaVersion: 2,
      profileId,
      revision: Math.max(...ordered.map((snapshot) => snapshot.save.revision)) + 1,
      appVersion: newest.save.appVersion,
      createdAt: ordered.map((snapshot) => snapshot.save.createdAt).reduce(oldestDate),
      updatedAt: newest.save.updatedAt,
      puzzles: [...puzzleMap.values()].sort((a, b) => a.puzzleId.localeCompare(b.puzzleId)),
      lessons: [...lessonMap.values()].sort((a, b) => a.lessonId.localeCompare(b.lessonId)),
      preferences: newest.save.preferences,
    },
    conflicts,
    sourceDevices: uniqueSorted(ordered.map((snapshot) => snapshot.deviceId)),
  };
}

function backupPayload(save: PlayerSaveV2): Omit<SaveBackup, "checksum"> {
  return {
    format: "crossmath-player-backup",
    formatVersion: 1,
    exportedAt: save.updatedAt,
    save,
  };
}

export function exportPlayerBackup(save: PlayerSaveV2, exportedAt: string): string {
  const issues = validatePlayerSave(save);
  if (issues.length > 0) throw new Error(`Cannot export invalid save: ${issues.join(" ")}`);
  assertIsoDate(exportedAt, "exportedAt");
  const payload = { ...backupPayload(save), exportedAt };
  const backup: SaveBackup = { ...payload, checksum: contentChecksum(payload) };
  return JSON.stringify(backup);
}

export function importPlayerBackup(serialized: string): PlayerSaveV2 {
  let parsed: SaveBackup;
  try {
    parsed = JSON.parse(serialized) as SaveBackup;
  } catch {
    throw new Error("Backup is not valid JSON.");
  }
  if (parsed.format !== "crossmath-player-backup" || parsed.formatVersion !== 1) {
    throw new Error("Unsupported backup format.");
  }
  const { checksum, ...payload } = parsed;
  if (contentChecksum(payload) !== checksum) throw new Error("Backup checksum verification failed.");
  const save = migratePlayerSave(parsed.save);
  const issues = validatePlayerSave(save);
  if (issues.length > 0) throw new Error(`Backup contains an invalid save: ${issues.join(" ")}`);
  return save;
}

export function decideContentAccess(
  packId: string,
  freePackIds: readonly string[],
  entitlements: ContentEntitlements,
  now: string,
): ContentAccessDecision {
  assertIsoDate(now, "now");
  if (freePackIds.includes(packId)) return { allowed: true, reason: "free" };
  const expired = entitlements.expiresAt !== undefined && Date.parse(entitlements.expiresAt) <= Date.parse(now);
  if (expired) return { allowed: false, reason: "expired" };
  if (entitlements.grantedPackIds.includes(packId)) return { allowed: true, reason: "granted" };
  if (entitlements.premium) return { allowed: true, reason: "premium" };
  return { allowed: false, reason: "not-entitled" };
}

export function generateReleaseDiagnostics(
  input: ReleaseDiagnosticsInput,
  generatedAt: string,
): ReleaseDiagnostics {
  assertIsoDate(generatedAt, "generatedAt");
  const issues: ReleaseDiagnostics["issues"][number][] = [];
  const saveIssues = validatePlayerSave(input.save);
  if (saveIssues.length > 0) {
    issues.push({ severity: "error", code: "INVALID_SAVE", message: saveIssues.join(" ") });
  }
  if (!input.contentCompatible) {
    issues.push({ severity: "error", code: "INCOMPATIBLE_CONTENT", message: "Installed content is incompatible with this runtime." });
  }
  if (input.installedPackIds.length === 0) {
    issues.push({ severity: "warning", code: "NO_CONTENT_PACKS", message: "No content packs are installed." });
  }
  if (!input.contentVersion) {
    issues.push({ severity: "warning", code: "UNKNOWN_CONTENT_VERSION", message: "The installed content version is unknown." });
  }
  if (input.save.appVersion !== input.appVersion) {
    issues.push({ severity: "warning", code: "SAVE_APP_VERSION_MISMATCH", message: "The save was last written by a different app version." });
  }
  return {
    healthy: !issues.some((issue) => issue.severity === "error"),
    generatedAt,
    summary: {
      appVersion: input.appVersion,
      runtimeVersion: input.runtimeVersion,
      contentVersion: input.contentVersion,
      saveSchemaVersion: input.save.schemaVersion,
      installedPacks: uniqueSorted(input.installedPackIds).length,
      saveRevision: input.save.revision,
    },
    issues,
  };
}
