# Cross Persistence & Save Format

Version: 1.0
Status: Draft

## Goals

Persistence must be deterministic, forward-compatible, and independent of UI.

## Persisted Data

- campaign progress
- completed puzzles
- active puzzle state
- undo/redo history
- hint usage
- settings
- statistics
- save schema version

## Rules

- Every save includes a schema version.
- Puzzle identity uses stable fingerprints.
- Replay history is append-only.
- Future migrations must preserve prior saves when possible.
