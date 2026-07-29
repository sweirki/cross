# Board Composition Engine

The commercial puzzle catalog is now generated from board compositions rather than a single connected graph.

## Model

A composition contains:

- a board canvas,
- two or more independently placed crossword clusters,
- three or more equations per cluster,
- exact arithmetic values,
- and a clue-density profile.

Each cluster is internally connected through shared number cells. Separate clusters remain visually independent, matching the structure shown in the supplied reference screenshots.

## Safety rules

The engine rejects a composition before rendering when it contains:

- an equation outside the board,
- an equation not shaped as `number operator number equals number`,
- a symbol-to-symbol overlap,
- conflicting values at an intersection,
- invalid arithmetic,
- a disconnected equation inside a cluster,
- or a cluster with fewer than three equations.

## Difficulty compositions

- Easy: 2 clusters, 6 equations
- Medium: 3 clusters, 9 equations
- Hard: 3 dense clusters, 12 equations
- Expert: 3 dense clusters, 12 equations with sparse clues and larger values

The clusters are intentionally separate, but each cluster is a real mini-crossword rather than a loose chain.
