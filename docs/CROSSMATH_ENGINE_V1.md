# CrossMath Engine v1.0

`src/engine` is the platform-independent engine boundary. It has no React,
React Native, Expo, storage, networking, or UI imports.

## Public API

```ts
import { CrossMathEngine } from "./src/engine";

const engine = new CrossMathEngine();

const generated = engine.generate({
  seed: 20260728,
  difficulty: "easy",
  equationCount: 2,
});

const verification = engine.verify(generated.puzzle);
const solved = engine.solve(generated.puzzle);
const certification = engine.certify(generated.puzzle);
const fingerprints = engine.fingerprint(generated.puzzle);
```

## Generation pipeline

1. Validate generation options.
2. Derive attempt seeds from the requested seed.
3. Generate a connected topology skeleton.
4. Assign operators deterministically.
5. Build the equation graph.
6. Synthesize valid integer assignments.
7. Remove clues only when uniqueness is preserved.
8. Validate the puzzle.
9. Prove uniqueness.
10. Certify difficulty and compute fingerprints.

No call uses `Math.random`, timestamps, UUIDs, or platform services.

## Library generation

```ts
const library = engine.exportLibrary({
  rootSeed: "release-1",
  count: 1000,
  difficulty: "medium",
  chunkSize: 100,
});
```

The industrial exporter rejects invalid and duplicate puzzles, emits certified
records, and returns a resumable checkpoint plus a deterministic manifest.

## Commands

```bash
npm run engine:v1:build
npm run engine:v1:test
```
