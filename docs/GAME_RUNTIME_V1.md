# CrossMath Game Runtime v1

Platform-independent Phase 7 runtime layered on `Puzzle` JSON.

## API

```ts
const runtime = new CrossMathGameRuntime();
let transition = runtime.create(puzzle);
transition = runtime.dispatch(puzzle, transition.state, {
  type: "select-tile",
  tileId: "tile-1",
});
transition = runtime.dispatch(puzzle, transition.state, {
  type: "place-selected",
  cellId: "cell-1",
});
```

Each dispatch returns immutable state, a derived game view, and semantic events.

## Guarantees

- No UI, storage, clock, or network dependency.
- Explicit elapsed-time actions keep replay deterministic.
- Canonical persistence serialization.
- Validated restoration.
- Bounded undo/redo through the existing history engine.
- Events for placement, mistakes, equation completion, hints, and puzzle completion.
