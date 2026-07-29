# CrossMath Studio

CrossMath Studio is the internal content-authoring and quality-assurance layer. It is intentionally separate from the player runtime.

## Included in this checkpoint

- Immutable topology draft operations
- Structural template analysis
- Renderer-independent template previews
- Lesson preview assembly
- Campaign validation and lesson reordering
- Puzzle inspection
- Automated library QA
- Generation metric summaries
- A `/studio` Expo Router screen for inspecting templates and QA results

## Topology analysis

Each template receives deterministic metrics:

- equation count
- intersection count
- connected component count
- graph depth
- maximum and average equation degree
- occupied cell count
- board utilization
- estimated structural complexity

The complexity score is an authoring aid, not a replacement for solver-backed difficulty certification.

## Puzzle inspection

The inspector reports:

- schema validation
- independent unique-solution verification
- certified difficulty
- exact, structural, topology, and solution fingerprints
- hidden-cell count
- shared-number count

## Automated QA

The QA report checks:

- invalid puzzles
- non-unique puzzles
- exact duplicates
- repeated topologies
- requested/certified difficulty mismatches
- missing lesson templates
- missing lesson puzzles
- disconnected multi-equation templates

Warnings do not fail the report. Errors do.

## Studio route

Open `/studio` in the Expo app. The gear button on the learning screen links to this internal route.

The current route is an inspection dashboard. Authoring operations are available through `CrossMathStudio.ts` and can be connected to interactive editor controls in the next checkpoint.
