# Premium Gameplay Runtime

This checkpoint adds deterministic, UI-independent services for the premium player loop.

## Adaptive hints

`buildAdaptiveHint` exposes five progressive levels: equation focus, concept explanation,
cell focus, candidate values, and a final single-value reveal. Hints reuse the verified
logical hint path rather than reading embedded solution metadata directly.

## Practice

`buildPracticeSet` maps lesson concepts to eligible library puzzles and returns a stable,
seeded order. It reports exhaustion when the current library cannot satisfy the requested
practice count.

## Daily challenge

`selectDailyChallengeWithPolicy` supports a deterministic namespace and optional
day-of-week difficulty rotation, with a safe fallback when the library has no puzzle in
the requested tier.

## Player statistics

`summarizePlayerAttempts` calculates completion totals, perfect solves, hint usage,
average solve time, consecutive-day streaks, and concept mastery.

## Accessibility and feedback

Accessibility preferences are normalized at the service boundary. Motion is reduced or
removed consistently, board cells receive semantic labels, and gameplay transitions emit
announcements for completed equations and puzzles.

These services do not depend on React Native and can be reused by the mobile app, Studio,
tests, and future web surfaces.
