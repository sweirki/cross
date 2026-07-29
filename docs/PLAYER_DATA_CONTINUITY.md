# Player Data Continuity

This checkpoint adds production-facing data continuity around the existing CrossMath runtime.

## Save schema

`PlayerSaveV2` stores puzzle mastery, lesson mastery, accessibility preferences, app version, revision, and timestamps. `migratePlayerSave` upgrades the earlier completed-ID save format into the versioned schema.

## Backups

Backups are deterministic JSON envelopes with a SHA-256 checksum. Import rejects malformed, unsupported, or modified backups.

## Sync

`mergeSyncSnapshots` merges snapshots from the same profile. Puzzle and lesson mastery use monotonic merge rules: completion and stars cannot regress, while best move and time metrics keep the lower result. Preferences use the newest snapshot. The merged revision is one greater than the highest source revision.

## Content access

`decideContentAccess` provides an entitlement boundary without coupling the engine to a payment provider. Free packs, explicit grants, premium access, and expiration are evaluated in a deterministic order.

## Diagnostics

`generateReleaseDiagnostics` produces a support-safe health report containing only versions, save schema metadata, pack totals, and actionable issue codes.
