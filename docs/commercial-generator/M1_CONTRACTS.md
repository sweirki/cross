# Milestone 1 — Commercial Generation Contracts

Status: Complete

## Added

- Versioned generation schemas and schema validation.
- Immutable contracts for requests, seeds, clusters, compositions, dependencies,
  equation fills, clues, candidates, certificates, and Puzzle DNA.
- Canonical deterministic serialization.
- Domain-separated root, candidate, and stage seed derivation.
- Seed replay verification.
- Commercial generation feature flags.

## Compatibility

- The commercial generation pipeline remains disabled by default.
- No legacy generator, runtime, solver, or puzzle-format code was changed.

## Verification

- `generation:contracts:test`: 14/14 assertions passed.
- Existing commercial composition suite: 90/90 assertions passed.
