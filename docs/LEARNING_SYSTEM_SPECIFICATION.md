# CrossMath Learning System

## Purpose

The learning system controls what the player learns and when. It is data-driven and independent of React Native presentation and puzzle generation.

## Runtime flow

Learning campaign -> lesson profile -> topology template -> validated puzzle ID -> Puzzle JSON -> GameSession -> UI

## Progression rules

1. Lessons have a stable order.
2. Every lesson references one topology template and one or more validated puzzles.
3. A lesson concept must be declared by its template.
4. Equation count and intersection count may stay level or increase; they may not regress.
5. The next lesson unlocks only when the previous lesson is complete and reaches its mastery-star requirement.

## Initial path

1. Place Your First Number: one equation, one hidden tile.
2. Complete an Equation: one equation, two hidden tiles.
3. One Number, Two Equations: two equations and one shared number intersection.
4. Your First Connected Board: seven equations, six intersections, mixed operators.

## Separation of concerns

Templates describe shape and educational intent. Puzzles contain concrete operators, numbers, givens, and the number bank. Campaigns order lessons. The game engine receives only Puzzle JSON.
