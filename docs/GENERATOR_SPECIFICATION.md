# Cross Generator Specification

Version: 1.0
Status: Draft

## 1. Purpose

The generator creates deterministic candidate puzzles from explicit topology, mathematics, and quality policies.

The generator does not certify its own output.

Its responsibility is to construct candidates and preserve complete provenance so the solver, difficulty engine, certification engine, and production pipeline can independently evaluate them.

## 2. Core Principle

Generation and certification are separate systems.

A generated candidate is not production-ready merely because:

- all equations are mathematically valid;
- the topology is connected;
- a completed assignment exists;
- the board appears visually plausible.

Only the certification system may accept a candidate into a production library.

## 3. Deterministic Inputs

Every generation request must include:

- generator version;
- root seed;
- topology policy;
- mathematics policy;
- clue policy;
- number-bank policy;
- target difficulty;
- resource limits.

Identical inputs must produce identical:

- random stream decisions;
- topology choices;
- operator assignments;
- number assignments;
- clue masks;
- number-bank ordering;
- candidate fingerprints;
- rejection diagnostics.

## 4. Generation Pipeline

The canonical pipeline is:

```text
generation request
    -> seeded random source
    -> topology skeleton selection
    -> equation path construction
    -> intersection graph validation
    -> operator assignment
    -> numeric solution synthesis
    -> visible clue selection
    -> hidden-node selection
    -> number-bank construction
    -> candidate normalization
    -> structural validation
    -> solver evaluation
    -> difficulty analysis
    -> certification
```

The generator owns the stages through candidate normalization.

Later stages are external consumers.

## 5. Topology Construction

Topology construction must:

1. obey the topology grammar;
2. produce one connected equation graph;
3. include at least one genuine horizontal/vertical intersection;
4. respect board bounds;
5. avoid illegal node overlap;
6. respect target size and density ranges;
7. preserve deterministic ordering.

The topology builder must not depend on numeric values.

## 6. Operator Assignment

Operators are assigned only after a valid topology exists.

Operator policy may constrain:

- allowed operators;
- minimum and maximum operator counts;
- operator diversity;
- division frequency;
- subtraction frequency;
- repeated-operator limits;
- orientation balance.

Operator assignment must remain independent from clue removal.

## 7. Numeric Solution Synthesis

The numeric synthesizer assigns one canonical value to every number node.

It must:

- satisfy every equation exactly;
- obey number range policy;
- obey integer-only policy when enabled;
- reject division by zero;
- reject forbidden negative or fractional intermediate results;
- preserve shared values at intersections;
- respect duplicate-value policy;
- terminate within explicit limits.

The synthesizer creates a completed solution board, not a playable puzzle.

## 8. Clue Selection

Clue selection converts a solved board into a candidate puzzle.

A clue policy may constrain:

- visible number count;
- hidden number count;
- visible result count;
- hidden result count;
- minimum clues per equation;
- maximum clues per equation;
- intersection clue preference;
- symmetry preference;
- target hidden ratio.

Clue selection must not assume that uniqueness or logical solvability will follow.

Those properties are verified later.

## 9. Number Bank Construction

Every hidden number node produces exactly one number-bank tile.

Each tile has:

- stable tile identity;
- numeric value;
- source node identity retained in private generation metadata;
- deterministic display order.

Production puzzle data must not expose source-node identity to gameplay code.

Duplicate values are represented by distinct tile identities.

## 10. Candidate Normalization

Before a candidate leaves the generator, it must be normalized.

Normalization includes:

- stable node ordering;
- stable equation ordering;
- stable tile ordering;
- canonical coordinate serialization;
- canonical policy identifiers;
- canonical metadata ordering;
- structural fingerprint calculation;
- solution fingerprint calculation.

## 11. Candidate Fingerprints

The generator must produce separate fingerprints for:

### Exact Fingerprint

Includes:

- topology;
- operators;
- canonical solution;
- clue mask;
- number-bank multiplicity.

### Structural Fingerprint

Includes:

- normalized topology;
- equation orientations;
- intersection pattern;
- operator pattern;
- clue pattern;

while excluding numeric values.

### Solution Fingerprint

Includes only the canonical node-value assignment in normalized node order.

These fingerprints support regression tests and duplicate detection.

## 12. Generation Outcome

Each generation attempt returns one of:

- candidate-created;
- topology-failed;
- operator-assignment-failed;
- numeric-synthesis-failed;
- clue-selection-failed;
- normalization-failed;
- resource-limit;
- invalid-request.

Failure is a normal, structured outcome.

## 13. Rejection Diagnostics

Every failed generation attempt must report:

- stage;
- stable diagnostic code;
- root seed;
- derived attempt seed;
- policy identifiers;
- consumed attempt count;
- resource usage;
- human-readable explanation.

Diagnostics must be suitable for aggregate yield analysis.

## 14. Resource Limits

Generator limits must be explicit:

- topology attempts;
- placement attempts;
- operator attempts;
- numeric synthesis attempts;
- backtracking nodes;
- clue-mask attempts;
- optional time budget.

A limit failure must never be reported as mathematical impossibility.

## 15. Provenance

Every candidate must retain:

- generator version;
- root seed;
- attempt index;
- derived attempt seed;
- policy identifiers;
- topology fingerprint;
- exact fingerprint;
- structural fingerprint;
- solution fingerprint;
- creation timestamp for operational metadata only.

Timestamps must not affect determinism or fingerprints.

## 16. External Evaluation

The generator must submit the normalized candidate to external systems.

The generator must not:

- alter solver results;
- rewrite difficulty metrics;
- suppress certification failures;
- retry by silently changing policy;
- classify a candidate as production-ready.

## 17. Acceptance Boundary

The generator's strongest successful result is:

`candidate-created`

The final production acceptance decision belongs exclusively to the certification engine.
