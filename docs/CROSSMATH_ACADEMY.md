# CrossMath Academy

CrossMath Academy adds adaptive educational intelligence above the existing
lesson, practice, solver, and content systems.

## Skill graph

`ACADEMY_SKILL_GRAPH` defines each concept, its prerequisites, and two score
thresholds:

- `practiceThreshold`: the learner can continue but still benefits from practice.
- `masteryThreshold`: the concept is considered mastered.

The graph validator rejects duplicate skills, missing prerequisites,
self-dependencies, invalid thresholds, and cycles. `topologicalSkills` provides a
stable prerequisite-first traversal.

## Mastery model

`calculateMasteryProfile` turns immutable attempt records into a mastery profile.
Scores use the five most recent attempts, weight newer attempts more heavily,
and include a confidence adjustment until five attempts are available. Completed
puzzles reward stars; hints and mistakes reduce the attempt score.

Every skill is classified as:

- `not-started`
- `developing`
- `proficient`
- `mastered`

The calculation is deterministic because the caller supplies `generatedAt`.

## Adaptive curriculum

`buildAdaptiveCurriculum` uses prerequisite readiness and mastery scores to
recommend one of four actions:

- start a lesson
- practice a weak skill
- review a mastered but stale skill
- complete the current academy path

Lessons whose prerequisites are not ready are returned as blocked. Mastered
lessons are marked optional so advanced learners can skip repetitive work.

## Personalized practice

`buildPersonalizedPractice` selects the highest-priority weak or stale concept
and delegates deterministic puzzle selection to the existing practice
generator. It therefore keeps the same content contracts and puzzle JSON used
by the mobile game.

## Analytics and coaching

`buildAcademyAnalytics` aggregates lesson and concept performance without
changing raw attempt records. It includes first-attempt success, completion
rate, average stars, hints, mistakes, and solve time.

`buildCoachDashboard` combines learner mastery and recommendations into a
read-only dashboard model. It reports class-average mastery and concepts that
need support while keeping learner identity separate from puzzle internals.

## Verification

Run:

```bash
npm run academy:test
```

The academy suite covers graph validation, cycles, mastery scoring,
prerequisite gating, deterministic practice, analytics, and coach dashboard
aggregation.
