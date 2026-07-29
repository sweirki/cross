# Phase 10 — Premium Gameplay Engine v1

## Scope

The premium runtime composes the verified Phase 7 game runtime with deterministic premium systems. It has no React Native dependency.

## Public API

`CrossMathPremiumRuntime` provides:

- player profile creation and accessibility preferences
- premium session creation and action dispatch
- five-level solver-backed hints
- deterministic practice-set generation
- deterministic daily challenge selection
- attempt recording, stars, statistics, and streaks
- daily completion tracking
- canonical profile/session persistence
- deterministic action replay

## Commands

```bash
npm run premium:v1:build
npm run premium:v1:test
npm run phase10:test
```

`phase10:test` runs the Phase 7, Phase 8, Phase 9, and Phase 10 suites.

## Persistence

Profiles and sessions use schema version 1. Restore operations validate the schema, counters, identifiers, dates, accessibility values, duplicate records, puzzle compatibility, and the embedded game runtime.

## Determinism

No wall-clock reads or random global state are used. Callers provide timestamps, dates, seeds, policies, and ordered actions explicitly.
