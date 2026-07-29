# Milestone 4.1 — Visual Refresh

## Purpose

This milestone modernizes the gameplay presentation while preserving the deterministic engine, solver, topology generation, persistence, replay, and runtime contracts.

The visual direction is inspired by polished mobile arithmetic-crossword games: soft paper surfaces, pastel semantic tiles, restrained elevation, compact HUD information, generous whitespace, and a tactile number tray. The implementation is original and does not copy branding or proprietary artwork.

## Delivered

### Design system

`src/ui/visual-refresh` introduces dependency-free visual primitives:

- light, dark, and high-contrast palettes;
- semantic board, HUD, tray, tile, feedback, and shadow colors;
- phone, tablet, and wide responsive layout specifications;
- deterministic board cell fitting;
- reusable tile-state recipes;
- motion timing and scale tokens.

### Modern board

`PuzzleBoard` now provides:

- a raised paper-like board surface;
- rounded semantic number, operator, and result cells;
- theme-aware light, dark, and high-contrast presentation;
- responsive cell sizing and spacing;
- stronger selected, correct, and incorrect states;
- subtle elevation and press feedback;
- retained accessibility labels and behavior.

### HUD

`GameHud` consolidates:

- puzzle mode and title;
- move count;
- hint count;
- elapsed time;
- back, undo, and redo controls;
- compact accessible presentation.

### Number tray

`NumberBank` is now presented as a raised tray with:

- minimum mobile-friendly touch targets;
- rounded tiles;
- semantic selection treatment;
- used-tile fading;
- responsive spacing;
- preserved deterministic selection behavior.

### Motion polish

The refresh uses the existing gameplay motion layer and adds visual motion tokens for press, selection, snap, solved pulse, and score update timing. Reduced-motion behavior remains governed by the existing motion system.

### Theme refinement

All gameplay surfaces resolve through the existing theme provider and support:

- light mode;
- dark mode;
- high contrast;
- responsive type and layout.

## Architectural boundary

This milestone intentionally does not alter:

- puzzle generation;
- arithmetic evaluation;
- solver behavior;
- topology;
- save schemas;
- replay;
- validation;
- gameplay event semantics.

## Verification

Dedicated commands:

```powershell
npm run visual-refresh:m41:build
npm run visual-refresh:m41:test
npm run visual-refresh:m41:regression
```

The regression command runs the verified topology diversity regression chain before the visual refresh tests.

## Manual review checklist

1. Open a practice puzzle on a narrow phone.
2. Confirm the HUD remains readable and controls meet touch-target expectations.
3. Select, place, remove, undo, redo, hint, and reset tiles.
4. Confirm selected, correct, and incorrect states remain visually distinct.
5. Rotate to landscape and inspect board fitting.
6. Test a tablet or web-width viewport.
7. Switch between light, dark, and high-contrast modes.
8. Enable reduced motion and verify gameplay remains understandable.
9. Complete a puzzle and inspect solved feedback and overlays.
