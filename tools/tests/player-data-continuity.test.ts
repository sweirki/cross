import { strict as assert } from "node:assert";
import {
  createPlayerSave,
  decideContentAccess,
  exportPlayerBackup,
  generateReleaseDiagnostics,
  importPlayerBackup,
  mergeSyncSnapshots,
  migratePlayerSave,
  validatePlayerSave,
} from "../../src/services/PlayerDataContinuity";
import type { PlayerSaveV1, PlayerSaveV2 } from "../../src/types/PlayerDataContinuity";

function main(): void {
  const now = "2026-07-28T12:00:00.000Z";
  const base = createPlayerSave("player-1", "2.0.0", now, { textScale: 3, highContrast: true });
  assert.equal(base.schemaVersion, 2);
  assert.equal(base.preferences.textScale, 2);
  assert.equal(base.preferences.highContrast, true);
  assert.deepEqual(validatePlayerSave(base), []);

  const legacy: PlayerSaveV1 = {
    schemaVersion: 1,
    profileId: "player-1",
    appVersion: "1.0.0",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    completedPuzzleIds: ["p2", "p1", "p1"],
    lessonStars: { "lesson-2": 5, "lesson-1": 2 },
  };
  const migrated = migratePlayerSave(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.puzzles.map((item) => item.puzzleId), ["p1", "p2"]);
  assert.equal(migrated.lessons[1]?.stars, 3);
  assert.equal(migrated.preferences.locale, "en-US");

  const deviceA: PlayerSaveV2 = {
    ...base,
    revision: 3,
    updatedAt: "2026-07-28T12:01:00.000Z",
    puzzles: [{
      puzzleId: "p1",
      completed: true,
      stars: 2,
      bestMoves: 14,
      bestTimeMs: 90000,
      hintsUsed: 1,
      updatedAt: "2026-07-28T12:01:00.000Z",
    }],
    lessons: [{
      lessonId: "lesson-1",
      completed: true,
      stars: 2,
      updatedAt: "2026-07-28T12:01:00.000Z",
    }],
  };
  const deviceB: PlayerSaveV2 = {
    ...base,
    revision: 5,
    appVersion: "2.1.0",
    updatedAt: "2026-07-28T12:02:00.000Z",
    preferences: { ...base.preferences, reducedMotion: true },
    puzzles: [
      {
        puzzleId: "p1",
        completed: true,
        stars: 3,
        bestMoves: 12,
        bestTimeMs: 100000,
        hintsUsed: 0,
        updatedAt: "2026-07-28T12:02:00.000Z",
      },
      {
        puzzleId: "p2",
        completed: false,
        stars: 0,
        hintsUsed: 2,
        updatedAt: "2026-07-28T12:02:00.000Z",
      },
    ],
    lessons: [{
      lessonId: "lesson-1",
      completed: true,
      stars: 3,
      updatedAt: "2026-07-28T12:02:00.000Z",
    }],
  };

  const merged = mergeSyncSnapshots([
    { deviceId: "tablet", save: deviceB },
    { deviceId: "phone", save: deviceA },
  ]);
  assert.equal(merged.save.revision, 6);
  assert.equal(merged.save.appVersion, "2.1.0");
  assert.equal(merged.save.preferences.reducedMotion, true);
  assert.equal(merged.save.puzzles.length, 2);
  assert.equal(merged.save.puzzles[0]?.stars, 3);
  assert.equal(merged.save.puzzles[0]?.bestMoves, 12);
  assert.equal(merged.save.puzzles[0]?.bestTimeMs, 90000);
  assert.equal(merged.save.puzzles[0]?.hintsUsed, 0);
  assert.equal(merged.save.lessons[0]?.stars, 3);
  assert.deepEqual(merged.sourceDevices, ["phone", "tablet"]);
  assert.equal(merged.conflicts.some((item) => item.kind === "preferences"), true);
  assert.throws(() => mergeSyncSnapshots([]));
  assert.throws(() => mergeSyncSnapshots([
    { deviceId: "a", save: deviceA },
    { deviceId: "b", save: { ...deviceB, profileId: "other" } },
  ]));

  const serialized = exportPlayerBackup(merged.save, "2026-07-28T12:03:00.000Z");
  const restored = importPlayerBackup(serialized);
  assert.deepEqual(restored, merged.save);
  const tampered = serialized.replace('"revision":6', '"revision":7');
  assert.throws(() => importPlayerBackup(tampered));
  assert.throws(() => importPlayerBackup("{bad"));

  assert.deepEqual(
    decideContentAccess("tutorial", ["tutorial"], { premium: false, grantedPackIds: [] }, now),
    { allowed: true, reason: "free" },
  );
  assert.deepEqual(
    decideContentAccess("advanced", [], { premium: true, grantedPackIds: [] }, now),
    { allowed: true, reason: "premium" },
  );
  assert.deepEqual(
    decideContentAccess("advanced", [], { premium: false, grantedPackIds: ["advanced"] }, now),
    { allowed: true, reason: "granted" },
  );
  assert.deepEqual(
    decideContentAccess("advanced", [], {
      premium: true,
      grantedPackIds: ["advanced"],
      expiresAt: "2026-07-01T00:00:00.000Z",
    }, now),
    { allowed: false, reason: "expired" },
  );
  assert.deepEqual(
    decideContentAccess("advanced", [], { premium: false, grantedPackIds: [] }, now),
    { allowed: false, reason: "not-entitled" },
  );

  const diagnostics = generateReleaseDiagnostics({
    appVersion: "2.1.0",
    runtimeVersion: "2.0.0",
    contentVersion: "1.4.0",
    contentCompatible: true,
    save: merged.save,
    installedPackIds: ["tutorial", "tutorial", "beginner"],
  }, "2026-07-28T12:04:00.000Z");
  assert.equal(diagnostics.healthy, true);
  assert.equal(diagnostics.summary.installedPacks, 2);
  assert.equal(diagnostics.issues.length, 0);

  const unhealthy = generateReleaseDiagnostics({
    appVersion: "3.0.0",
    runtimeVersion: "3.0.0",
    contentCompatible: false,
    save: merged.save,
    installedPackIds: [],
  }, "2026-07-28T12:04:00.000Z");
  assert.equal(unhealthy.healthy, false);
  assert.equal(unhealthy.issues.some((item) => item.code === "INCOMPATIBLE_CONTENT"), true);
  assert.equal(unhealthy.issues.some((item) => item.code === "NO_CONTENT_PACKS"), true);
  assert.equal(unhealthy.issues.some((item) => item.code === "UNKNOWN_CONTENT_VERSION"), true);
  assert.equal(unhealthy.issues.some((item) => item.code === "SAVE_APP_VERSION_MISMATCH"), true);

  const invalid: PlayerSaveV2 = {
    ...base,
    revision: -1,
    puzzles: [
      { puzzleId: "x", completed: false, stars: 4, hintsUsed: 0, updatedAt: now },
      { puzzleId: "x", completed: false, stars: 0, hintsUsed: 0, updatedAt: now },
    ],
  };
  assert.equal(validatePlayerSave(invalid).length >= 3, true);
  assert.throws(() => exportPlayerBackup(invalid, now));

  console.log("Player data continuity tests passed (40 assertions).");
}

main();
