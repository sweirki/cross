# Organic Layout Quality — Topology QA

## Purpose

This milestone adds a deterministic analysis, scoring, visualization, and batch
reporting layer around the verified organic topology generator.

It does **not** alter puzzle generation, arithmetic synthesis, solving,
difficulty certification, runtime state, persistence, replay, motion, device
feedback, or themes. The generator remains the source of topology candidates;
this layer measures and exports those candidates.

## Quality metrics

`analyzeOrganicTopology` derives:

- middle-intersection ratio
- endpoint-only intersection ratio
- average equation degree
- branching-equation ratio
- dead-end count and ratio
- occupied bounds and normalized aspect ratio
- occupied-cell density
- horizontal and vertical silhouette symmetry
- irregularity
- deterministic per-equation connectivity

All metrics are computed only from the canonical `BoardTopology`.

## Quality score

`scoreOrganicTopology` produces a score from 0 to 100 using six independently
reported components:

| Component | Maximum |
| --- | ---: |
| Middle crossings | 30 |
| Branching | 20 |
| Density | 15 |
| Bounding shape | 15 |
| Asymmetry | 10 |
| Dead-end balance | 10 |

Grades are `excellent`, `good`, `acceptable`, or `weak`. The component values
remain visible so tuning never becomes an opaque single-number decision.

## Quality gates

Two immutable threshold profiles are included:

- `exploratory`: suitable for inspection and generator experiments
- `production`: stricter content acceptance thresholds

`evaluateTopologyQualityGate` returns every failed metric in stable order.

The quality gate is not wired into puzzle generation in this milestone. That is
intentional: measurement must be verified before it is allowed to reject or
reroll production content.

## Visualization and export

### ASCII

`renderTopologyAscii` creates a compact terminal preview using the occupied
bounding box. Number labels may be supplied by a caller; otherwise number cells
use `□`.

### SVG

`renderTopologySvg` creates a deterministic standalone SVG with accessible image
semantics. Number labels are escaped before inclusion.

### JSON

`exportTopologyQualityJson` emits the versioned schema:

```text
crossmath.topology-quality/v1
```

The export includes canonical topology data, derived metrics, and the quality
score.

## Batch report command

Generate a deterministic report and ranked previews:

```bash
npm run topology:quality:report -- \
  --count 1000 \
  --profile organic \
  --equations 6 \
  --width 13 \
  --height 13 \
  --seed 100000 \
  --previews 20 \
  --output topology-quality-report
```

Generated files:

- `report.json`: every sample plus aggregate metrics
- `previews.txt`: ranked ASCII previews
- `NN-seed-SEED.svg`: SVG previews for the highest-scoring samples

Defaults analyze 250 organic layouts with 6 equations on a 13×13 board.

For difficulty-specific analysis, run the command once for each board geometry
and equation-count policy currently used by that difficulty. The current
skeleton generator does not itself accept a difficulty label, so this tool does
not invent one.

## Files

- `src/game/topology/analysis/OrganicTopologyMetrics.ts`
- `src/game/topology/analysis/OrganicTopologyReport.ts`
- `src/game/topology/scoring/TopologyQualityScore.ts`
- `src/game/topology/export/AsciiTopologyRenderer.ts`
- `src/game/topology/export/SvgTopologyRenderer.ts`
- `src/game/topology/export/TopologyJsonExporter.ts`
- `src/game/topology/tuning/TopologyQualityProfiles.ts`
- `src/game/topology/index.ts`
- `tools/topology-quality-report.ts`
- `tools/tests/organic-layout-quality.test.ts`
- `tsconfig.topology-quality.json`

## Verification

```bash
npm install
npm run topology:quality:build
npm run topology:quality:test
npm run topology:quality:report -- --count 100 --previews 8
npm run topology:quality:regression
```

Expected dedicated result:

```text
79/79 organic-layout-quality assertions passed.
```

## Manual review

Open `previews.txt` and the generated SVG files, then review:

1. Middle-number crossings are visually obvious.
2. Branches emerge from different equations rather than forming a single chain.
3. Silhouettes are irregular without becoming excessively sparse.
4. Number cells remain legible at the intended device size.
5. Worst-scoring boards are genuinely less desirable than best-scoring boards.
6. Threshold failures match human judgment before production gating is enabled.

Do not wire quality rejection into industrial generation until representative
samples for every difficulty have been reviewed and the thresholds have been
tuned against those samples.
