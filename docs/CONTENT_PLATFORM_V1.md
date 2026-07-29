# CrossMath Content Platform v1

Phase 11 provides a deterministic, UI-independent content lifecycle for CrossMath.

## Capabilities

- Versioned content packs and resources
- Semantic-version validation and engine compatibility checks
- Dependency validation across puzzles, lessons, campaigns, skill graphs, premium policies, localizations, and asset manifests
- Draft → review → published → archived workflows
- Sequential resource schema migrations
- Canonical serialization and integrity sealing
- Deterministic catalog indexing and querying
- Corrupt or tampered content rejection

## Commands

```bash
npm run content:v1:build
npm run content:v1:test
npm run phase11:test
```

## Publishing workflow

1. Author resources as `draft`.
2. Move each resource to `review`.
3. Validate dependencies and compatibility.
4. Publish the pack. Publishing seals the pack and emits deterministic events.
5. Archive published resources when superseded.

The platform contains no React Native or Expo dependencies.
