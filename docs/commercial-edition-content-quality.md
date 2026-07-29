# Commercial Edition Content Quality

This increment makes the four Home-screen difficulty choices select genuinely different puzzle content.

## Difficulty profiles

| Tier | Equations | Operators | Connected components | Clue density |
|---|---:|---|---:|---|
| Easy | 1 | +, − | 1 | High |
| Medium | 5 | +, −, × | 1 | Moderate |
| Hard | 7 | +, −, ×, ÷ | 1 | Low |
| Expert | 10 | +, −, ×, ÷ | 1 | Very low |

Every puzzle is one connected equation network with internal crossings, balanced whitespace, and progressively larger boards.

## Player flow

Home difficulty chips now select only the new commercial puzzle catalog. Daily puzzles also use this catalog. Existing tutorial and campaign puzzles remain available for learning content.

## Verification

```powershell
npm install
npm run commercial:build
npm run commercial:test
npm run web
```

The dedicated suite validates arithmetic correctness, puzzle validity, equation counts, operator coverage, and single-network connectivity.


## Expert topology correction

The Expert puzzle is no longer accepted merely because all equations belong to one connected component.
It now uses a compact two-tier lattice:

- five horizontal equations,
- five vertical equations,
- repeated number-cell intersections,
- a dense shared solving core,
- no separate islands,
- and no long chain of independent three-equation clusters.

The regression test also checks shared-intersection density and rejects layouts with too many dangling equations.
