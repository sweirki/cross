# CrossMath Studio v1 — Phase 12

CrossMath Studio is the deterministic, UI-independent authoring runtime layered on the Phase 11 Content Platform.

## Capabilities

- Create and restore authoring projects.
- Add, update, remove, duplicate, and select content resources.
- Preserve bounded undo/redo history.
- Validate engine compatibility, dependency graphs, and publishing readiness.
- Batch-generate resources through an injected deterministic generator.
- Simulate generation and aggregate acceptance, difficulty, and solver-node metrics.
- Prepare draft resources for review and publish reviewed content packs.
- Build searchable content catalogs through the Content Platform.
- Export projects using canonical JSON.

## Commands

```bash
npm run studio:v1:build
npm run studio:v1:test
npm run phase12:test
```

The runtime has no React Native dependency. A visual Studio application can consume the contracts without duplicating authoring or publishing rules.
