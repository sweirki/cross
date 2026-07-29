# Organic Topology Diversity

## Purpose

The organic generator previously produced visually different rotations and
placements that collapsed to the same six-equation graph and the same quality
score. This milestone makes graph-family selection explicit and deterministic.

## Archetypes

The organic profile supports five equation-graph families:

- `chain` — grows from recent leaves and favors elongated silhouettes.
- `fork` — deliberately creates a degree-three branch.
- `hub` — concentrates several equations around an early equation.
- `spread` — maximizes bounding-area growth while retaining internal crossings.
- `cluster` — favors compact, dense middle-to-middle crossings.

Callers may pass `archetype` with the organic profile. When omitted,
`selectOrganicTopologyArchetype(seed)` chooses a family deterministically.

## Invariants

The diversity layer does not change the canonical five-cell equation model.
Every added equation still intersects exactly one existing equation at a number
cell. Organic generation still prioritizes crossings involving at least one
middle number and falls back only when a constrained board cannot satisfy the
preferred search.

The classic profile is unchanged.

## Quality reporting

Batch reports now include:

- score standard deviation;
- number of unique structural metric signatures;
- per-archetype sample counts;
- each sample's selected archetype.

The report command also prints score spread and unique-signature count, and
ASCII preview headers include the archetype.

## Verification

```powershell
npm run topology:diversity:build
npm run topology:diversity:test
npm run topology:diversity:regression
npm run topology:quality:report -- --count 1000 --profile organic --equations 6 --width 13 --height 13 --seed 100000 --previews 20 --output topology-quality-report
```

For the fixed 500-board test corpus, the milestone requires:

- all five families to occur;
- at least five structural metric signatures;
- score standard deviation of at least five points;
- a non-zero score range;
- preserved middle-crossing and endpoint-crossing quality thresholds.

These thresholds are deterministic regression guards rather than claims that
the current weights are final production tuning.
