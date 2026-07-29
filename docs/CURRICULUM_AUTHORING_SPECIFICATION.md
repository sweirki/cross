# Curriculum and Template Authoring

## Purpose

The curriculum layer decides what the player should learn next. It does not solve puzzles and it does not render React Native components.

## Authoring flow

1. Create an `AuthoredTemplateDraft`.
2. Compile it with `authorTopologyTemplate`.
3. Inspect it with `buildTemplatePreview`.
4. Add the validated template to learning content.
5. Reference the template from one or more lessons.
6. Place lessons into campaign chapters.
7. Build the player curriculum from persisted puzzle progress.

## Template rules

A template contains equation geometry and educational metadata only. It does not contain number values.

Every equation occupies five contiguous cells:

`number operator number equals number`

Horizontal and vertical equations may intersect only on number cells. Symbol intersections are invalid.

## Curriculum selection

`buildCurriculum` returns each campaign lesson as `locked`, `available`, or `completed`.

A lesson is mastered only when one of its puzzles is completed with at least its configured mastery-star threshold. The next lesson stays locked until the previous lesson is mastered.

`recommendNextLesson` returns a deterministic recommendation:

- `continue` for a newly available lesson
- `practice` when more mastery is needed
- `complete` when the campaign has been mastered

## Preview data

`buildTemplatePreview` creates a renderer-independent list of cells. A future authoring screen can render this model without knowing generation or solver internals.
