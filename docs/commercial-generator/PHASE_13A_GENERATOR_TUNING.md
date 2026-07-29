# Phase 13A — Generator Tuning

## Completed

- Added immutable production tuning profiles v2 for every difficulty.
- Moved overall-score weights and density targets out of `QualityScorer`.
- Tightened difficulty-specific quality floors.
- Added deterministic corpus analysis for score distributions, acceptance rates, composition families, dependency profiles, and rejection reasons.
- Added a sharded 100,000-candidate corpus runner.
- Preserved deterministic seeds and legacy fallback behavior.

## Existing measured corpus

The production cutover artifacts contain 12,525 generated candidates. Those measurements showed:
- easy and medium generation throughput is acceptable;
- hard and expert synthesis remain the dominant throughput risk;
- accepted easy content is concentrated in a small number of composition families;
- first-pass acceptance limits can hide underlying hard-gate behavior, so tuning reports now separate dispositions and rejection reasons.

## Locked profile version

`production-<difficulty>/v2`

Profile changes now require a version increment and regression update.

## 100,000-candidate run

Build first:

```powershell
npm run generation:contracts:build
```

Run 100 deterministic shards in parallel or sequentially:

```powershell
0..99 | ForEach-Object {
  node .\tools\run-tuning-corpus.cjs 100000 $_ 100
}
```

Outputs are written to `artifacts/tuning-v2`.

## Validation

- Tuning tests: 31/31
- Unified certification: 312/312
- Industrial generation v2: 65/65
- Generator cutover: 8/8
- TypeScript build: passed
