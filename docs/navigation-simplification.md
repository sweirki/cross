# Navigation Simplification

This refactor reduces the primary player journey to:

1. Home
2. Start or resume a puzzle
3. Solve on the game board
4. Return home

## Home screen

The primary actions are now:

- Resume puzzle, when a saved puzzle exists
- Start puzzle
- Daily puzzle

Difficulty is selected directly on the home screen. Statistics, Learn, Profile, and Settings remain available as secondary destinations rather than competing with the main play flow.

## Added routes

- `/settings`
- `/stats`

Campaign, Academy, Studio, Profile, and lesson routes remain in the project for compatibility, but they are no longer presented as equal-priority home actions.

## Runtime fix

`PlayScreen` now unwraps application-level `game-event` envelopes before passing events to `useGameplayMotion`. This fixes the startup crash caused by sending application events to a hook that expects gameplay runtime events.

The motion cue batch function also ignores null or undefined entries defensively.

## Local verification

```powershell
npm install
npm run web
```

Then verify:

1. Home opens without an exception.
2. Start puzzle opens the board in one tap.
3. Daily puzzle opens the board in one tap.
4. Resume opens the saved puzzle.
5. Settings changes appearance.
6. Statistics displays progress.
7. Tile selection, placement, undo, hint, reset, and puzzle completion still work.
