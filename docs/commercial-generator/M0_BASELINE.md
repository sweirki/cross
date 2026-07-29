# Commercial Generator Milestone 0 — Baseline

## Scope

This milestone establishes a trustworthy regression baseline before the commercial generation architecture changes. It does not change puzzle generation behavior.

## Repository state inspected

The extracted source archive contains the application and lockfile, but not `node_modules` and not Git metadata. The project declares Expo 57, React Native 0.86, React 19.2, TypeScript 6.0, and Node type definitions in `package.json`.

## Validation performed

### Passing

- `npm run composition:test`
  - TypeScript build passed.
  - 90/90 commercial board-composition assertions passed.
- `npm run gameplay-motion:m242:test`
  - TypeScript build passed after correcting nullable cue handling in the test.
  - 35/35 gameplay-motion assertions passed.

### Blocked by missing installed dependencies

- `npm run engine:test`

The full engine build cannot be certified from this extracted archive because dependencies are not installed. The observed missing modules/configuration are:

- `@types/node`
- `expo/tsconfig.base`
- `@react-native-async-storage/async-storage`

Install from the committed lockfile with `npm ci` in a network-enabled or dependency-cached environment, then rerun the complete regression chain.

## Baseline defect corrected

`tools/tests/gameplay-motion-m242.test.ts` dereferenced the nullable return type of `gameplayMotionCue`. A test-local `requiredGameplayMotionCue` assertion now narrows the result before property access. Production behavior is unchanged.

## Completion gate

Milestone 0 is not complete until all of the following pass from a clean checkout:

1. `npm ci`
2. `npm run engine:test`
3. `npm run commercial:regression`
4. `npx tsc --noEmit`
5. Android application launch and current Home → Puzzle → Completion smoke test
6. Baseline puzzle fingerprints and visual reference exports recorded

No commercial generator implementation may replace the active pipeline before this gate is green.
