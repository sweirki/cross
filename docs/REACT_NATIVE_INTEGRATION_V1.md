# Phase 13 — React Native Integration v1

Phase 13 connects the verified CrossMath runtime to the Expo Router application without moving domain logic into React components.

## Architecture

- `CrossMathAppRuntime` is a deterministic, platform-neutral application coordinator.
- `CrossMathAppProvider` owns the coordinator in React Native.
- AsyncStorage persists one canonical application snapshot per player.
- `useIntegratedGameSession` adapts the application runtime to the existing board UI.
- The root Expo layout installs the provider once for every route.
- The existing Home screen now uses `react-native-safe-area-context`.

## Integrated flows

- Cold start and hydration
- New local player creation
- Puzzle start and resume
- Game action dispatch
- Undo/redo support through the existing game runtime
- Route coordination for Home, Play, Academy, Studio, and Profile
- Active-puzzle close
- Recent puzzle tracking
- Canonical persistence
- Corrupt and cross-player save rejection
- Deterministic replay

## Commands

```bash
npm run integration:v1:build
npm run integration:v1:test
npm run phase13:test
npx expo start
```

`phase13:test` runs all Phase 7–13 regression suites.
