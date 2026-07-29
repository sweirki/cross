# Guided Lesson Experience

The learning campaign teaches one concept at a time. Each lesson owns an ordered
set of guidance steps. A step declares:

- the instruction shown to the player;
- the UI region to emphasize;
- an objective completion criterion.

The runtime derives the active step from immutable puzzle and game state. It does
not store a separate mutable tutorial cursor, so undo, restore, and replay remain
deterministic.

Supported completion criteria are:

- selecting a number tile;
- placing any tile;
- filling a shared intersection;
- completing a minimum number of equations;
- completing the puzzle.

Every lesson must end with `complete-puzzle`. Guidance is content data, while
`GuidedLessonRuntime` evaluates it. React Native components only render the
resulting `GuidedLessonState`.

Current progression:

1. Select and place one result tile.
2. Complete an equation with two missing values.
3. Fill a shared number and satisfy two crossing equations.
4. Follow a dependency chain through a connected seven-equation board.
