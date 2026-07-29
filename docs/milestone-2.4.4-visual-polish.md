# Milestone 2.4.4 — Visual Polish

## Architecture

This milestone introduces a deterministic presentation design system. It does not change the engine, runtime, replay, serialization, progression, motion cues, or device-feel event production.

The root `ThemeProvider` owns only presentation preferences and platform appearance. Pure modules resolve semantic colors, layout metrics, and component recipes independently of React Native.

## Included

- Semantic light, dark, and high-contrast palettes
- Persisted `system`, `light`, and `dark` preference
- Responsive type preference
- Spacing, typography, radius, sizing, opacity, and elevation tokens
- Compact, medium, and expanded layout metrics
- Shared button, card, and focus-ring recipes
- Safe fallback for malformed or unavailable preference storage

## Verification

```bash
npm run visual-polish:m244:build
npm run visual-polish:m244:test
npm run milestone2.4.4:test
```

## Device verification

1. Launch in light mode and confirm the app starts with no provider error.
2. Launch in dark mode and confirm system appearance changes are observed.
3. Toggle system appearance while the app is open.
4. Verify 320–599 px layouts classify as compact.
5. Verify tablet layouts at 600 px or wider classify as medium or expanded.
6. Increase OS font scale and confirm the resolved scale caps at 1.5 without clipping critical controls.
7. Confirm interactive controls retain at least a 44-point target.
8. Enable high contrast through a temporary settings harness and inspect text, borders, and focus indicators.
9. Restart after changing preferences and confirm persistence.
10. Re-run gameplay, motion, and device-feel smoke checks; no gameplay behavior should change.

## Scope boundary

The milestone establishes the canonical visual system and root integration. Existing screens remain backward compatible and can migrate incrementally to recipes without a broad rewrite.
