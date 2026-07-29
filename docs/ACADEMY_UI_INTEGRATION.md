# Academy UI Integration

This checkpoint connects the CrossMath Academy runtime to player-facing presentation models and a React Native route.

## Route

`/academy` displays:

- overall mastery,
- mastered skill count,
- the adaptive next activity,
- prerequisite-aware skill cards,
- locked and unlocked states,
- mastery progress for every concept.

The gameplay screen exposes the Academy through the target icon in its top bar.

## Presentation boundary

`AcademyPresentation` converts domain models into UI-ready immutable view models. The screen does not calculate mastery, inspect attempts, or reason about prerequisites.

```text
Skill attempts
    -> Academy runtime
    -> Mastery and adaptive curriculum
    -> Academy presentation
    -> React Native screen
```

This keeps the learner and future coach interfaces independent from scoring internals.

## Accessibility

Skill cards expose semantic mastery and lock-state labels. Navigation and calls to action use button roles, and progress is communicated with text in addition to visual bars.
