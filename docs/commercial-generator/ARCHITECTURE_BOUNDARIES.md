# Commercial Generator Architecture Boundaries

## Frozen production systems

The commercial generator program must preserve these existing contracts unless a separately approved migration is required:

- Arithmetic evaluation and operator rules
- Equation validation
- Unique-solution solver
- Runtime `Puzzle` behavior
- Move, undo, redo, hint, and completion runtime
- Persistence, replay, and save compatibility
- React Native gameplay flow
- Theme, motion, device-feel, and accessibility systems
- Existing build and regression infrastructure

## Systems reused behind adapters

These systems remain authoritative implementation assets but may receive additive interfaces:

- `EquationGraphBuilder`
- `NumberSynthesizer`
- `PuzzleBuilder`
- `PuzzleSolver`
- `DifficultyCertifier`
- `PuzzleFingerprint`
- `IndustrialPuzzleGenerator`
- Topology metrics, ASCII export, and SVG export

## Legacy and research-only paths

The following remain available for comparison, fixtures, and migration tests, but must not drive the new commercial pipeline:

- `TopologySkeletonGenerator`
- Organic topology generation profiles
- `BoardCompositionEngine` as a generator
- `givenModulo` clue selection
- First-valid-candidate acceptance
- Equation-count-based difficulty assumptions

## New stage contracts

The replacement pipeline must enforce this order:

1. Difficulty profile
2. Composition plan
3. Structural dependency graph
4. Equation filling
5. Clue plan and realized deduction graph
6. Runtime puzzle adaptation
7. Validation and uniqueness
8. Certification and quality scoring
9. Candidate ranking and acceptance

### Stage invariants

- Composition contains no values or operators.
- Structural dependency contains no arithmetic values.
- Equation filling cannot change approved geometry.
- Clue planning cannot change the solved arithmetic.
- Certification is read-only.
- Every randomized decision derives from a deterministic stage seed.
- Every accepted puzzle retains complete generation provenance.
