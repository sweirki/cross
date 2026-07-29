# Milestone 2.4.2 — Gameplay Motion

## Architecture

Gameplay motion is a presentation concern layered above the deterministic game runtime.

- The runtime remains the only owner of game state and emits semantic `RuntimeEvent` values.
- `useGameplayMotion` maps runtime events to immutable `GameplayMotionCue` values.
- Pure cue planning in `src/ui/motion/gameplay.ts` is independent of React Native and is covered by dedicated tests.
- `GameplayAnimatedView` renders board and tile-bank motion using React Native `Animated`.
- `GameplayCelebration` renders a deterministic, decorative victory celebration.
- Motion preferences from Milestone 2.4.1 control duration and suppression.
- No animation callback dispatches gameplay actions.

## Event mapping

| Runtime event | Motion |
| --- | --- |
| tile-selected | pop |
| tile-placed | pop |
| tile-removed | fade |
| equation-completed | glow |
| mistake-recorded | shake |
| puzzle-completed | confetti |
| session-reset | board fade |

Reduced motion suppresses pop, shake, and confetti while retaining fade/glow. Disabled animations produce zero-duration, disabled cues.

## Verification

```bash
npm run gameplay-motion:m242:build
npm run gameplay-motion:m242:test
npm run milestone2.4.2:test
```

Expected dedicated result:

```text
35/35 milestone-2.4.2 gameplay-motion tests passed.
```

## Device verification

1. Select and place tiles; confirm tile-bank and board emphasis.
2. Complete an equation; confirm a restrained glow/pop.
3. Make an invalid equation; confirm board shake.
4. Reset; confirm board transition.
5. Complete a puzzle; confirm celebration appears behind overlays and does not intercept input.
6. Enable system Reduce Motion; confirm shake, pop, and confetti are removed.
7. Disable animations; confirm gameplay remains fully operable with no visible transition.
8. Exercise undo, redo, hint, replay, and persistence restore; confirm behavior is unchanged.

The user's local build, full regression run, and physical-device/simulator checks are the final verification.
