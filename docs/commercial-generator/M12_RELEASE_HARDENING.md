# Milestone 12 — Performance, QA, and Release Candidate Hardening

## Implemented

- Versioned performance budgets and percentile evaluation.
- Catalog integrity validation, including certification, IDs, and fingerprint checks.
- Campaign integrity validation, including catalog references, unlock chains, IDs, and fingerprints.
- Deterministic release-candidate certification.
- Mandatory gates for save migration, replay determinism, offline readiness, accessibility, privacy, crash audit, performance, Android, and iOS builds.
- `not-run` release checks correctly block release certification.
- Regression tests for passing, failing, corrupted, and incomplete release candidates.

## Validation

- Release hardening: 20/20
- Unified certification: 312/312
- Industrial Generation v2: 65/65
- Puzzle Studio v2: 56/56
- Certified content pipeline: 15/15
- Hint AI and telemetry: 61/61
- TypeScript generation build: passed

## Environment limitations

Android and iOS release builds, physical-device profiling, store assets, localization review, and an end-to-end crash audit cannot be truthfully certified from this source-only environment. The release gate represents these as `not-run`, which blocks a release candidate until those checks are completed in the supported build/device environment.
