# CrossMath Player Board Specification

## Visual model

The game board is a sparse rectangular coordinate space. Only cells that belong
to an equation are rendered. Empty coordinates remain transparent, allowing
free-form CrossMath silhouettes.

Every equation is exactly five cells:

```text
number operator number equals number
```

Equations may be horizontal or vertical. Intersections are legal only where two
equations reference the same number-cell ID.

## Cell presentation

- Hidden number cells use the warm editable-cell surface.
- Given number cells use the green fixed-number surface.
- Operators and equals signs use the warm fixed-symbol surface.
- Correct completed equations receive green feedback.
- Incorrect completed equations receive red feedback.
- Incomplete equations remain neutral.

## Interaction

The player selects a number-bank tile and then selects an editable number cell.
Selecting an occupied cell without a bank tile returns its tile to the bank.
Operators and equals signs are never interactive.

## Architecture boundary

```text
Generator / downloaded content / campaign / daily challenge
                         |
                         v
                  canonical Puzzle JSON
                         |
                         v
                     GameSession
                         |
                         v
                  CrossMath renderer
```

The React Native components never import generator modules.
