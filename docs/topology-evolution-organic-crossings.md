# Topology Evolution — Organic Crossings

## Purpose

This milestone evolves CrossMath board generation from compact endpoint-linked
layouts toward irregular crossword-style arithmetic graphs.

It does not change the canonical equation contract:

`number operator number equals number`

It also does not change puzzle serialization, solving, validation, runtime
state, replay, persistence, motion, device services, or visual themes.

## Architecture

The existing `BoardTopology` remains the source of truth. The change is
confined to deterministic skeleton generation and structural analysis.

### Generation profiles

`GenerateTopologySkeletonRequest.profile` supports:

- `classic`: original seeded candidate selection.
- `organic`: deterministic search that prioritizes intersections involving the
  middle number of one or both equations.

Direct calls to `generateTopologySkeleton` retain `classic` as the default for
backward compatibility.

`CrossMathEngine.generate` uses `organic` by default for newly generated
puzzles. Callers that need the previous layout family can pass:

```ts
topologyProfile: "classic"
```

Existing serialized puzzles are unaffected.

### Organic search

The organic profile:

1. Enumerates legal perpendicular equation placements.
2. Allows intersections only on number cells.
3. Prevents more than two equations from sharing a number.
4. First searches for a complete layout with no endpoint-to-endpoint crossing.
5. Prioritizes middle-to-middle crossings.
6. Uses deterministic seed-derived tie-breaking.
7. Falls back to legal endpoint crossings only when the requested dimensions
   and equation count make a fully middle-connected layout impossible.

The search is bounded and fails explicitly when no legal layout can be built.

### Structural analysis

`analyzeTopologyShape` reports:

- equation count
- intersection count
- middle-connected intersections
- endpoint-only intersections
- branching equations
- occupied bounds
- occupied-cell density
- per-intersection equation roles

These metrics are deterministic and intended for future content balancing and
catalog quality gates.

## Files

- `src/game/board/TopologySkeletonGenerator.ts`
- `src/game/board/TopologyShapeAnalyzer.ts`
- `src/game/board/index.ts`
- `src/engine/api/EngineContracts.ts`
- `src/engine/api/CrossMathEngine.ts`
- `tools/tests/topology-evolution.test.ts`
- `tsconfig.topology-evolution.json`

## Verification

```bash
npm install
npm run topology:evolution:build
npm run topology:evolution:test
npm run topology:evolution:regression
```

Expected dedicated result:

```text
68/68 topology-evolution assertions passed.
```

## Device and visual verification

Generate at least one easy, medium, hard, and expert puzzle and verify:

1. Equations visibly cross through middle number cells.
2. Branches extend from different parts of equations.
3. Board cells remain selectable and readable.
4. Number-bank placement still works.
5. Completion, replay, hints, motion, haptics, and accessibility remain intact.
6. Existing saved puzzles still load.
7. A puzzle generated with `topologyProfile: "classic"` still renders.

Do not advance until the dedicated build, dedicated tests, full regression
chain, and device checks pass locally.
