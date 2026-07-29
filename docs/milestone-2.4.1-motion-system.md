# Milestone 2.4.1 — Motion System

## Architecture

`src/ui/motion` is the single application-level motion API. Pure preference,
token, animation, transition, and persistence modules remain independent of
React. `MotionProvider` adapts system reduced-motion state and AsyncStorage for
the presentation layer.

The provider is composed above existing application providers and does not own
or mutate gameplay state.

## Determinism

Preference serialization uses a fixed field order. Animation resolution is a
pure function of persisted preferences and the supplied system accessibility
state. Reduced motion disables spatial and celebratory effects while retaining
non-spatial fades and glow.

## Verification

```sh
npm run motion:m241:test
npm run milestone2.4.1:test
npx tsc --noEmit
```

Device checks:

1. Toggle the OS reduced-motion setting and confirm the resolved level changes.
2. Set full-motion override and confirm it ignores the OS reduction setting.
3. Disable animations and confirm resolved animations have zero duration.
4. Restart the app and confirm preferences persist.
5. Confirm gameplay state, selection, undo, redo, and completion are unchanged.
