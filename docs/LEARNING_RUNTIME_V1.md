# CrossMath Learning Runtime v1

Phase 8 is a platform-independent learning layer built on the Phase 7 game runtime.

## Public entry point

```ts
import { CrossMathLearningRuntime } from "./src/learning/v1";
```

The runtime provides lesson creation, objective observation, restart, canonical persistence,
campaign unlocking, mastery thresholds, and campaign completion events.

## Commands

```bash
npm run learning:v1:build
npm run learning:v1:test
```

The module has no React Native, Expo, storage, clock, network, or UI dependencies. Time enters
through deterministic Phase 7 runtime state.
