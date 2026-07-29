# Cross Solver Specification

Version: 1.0
Status: Draft

## 1. Purpose

The solver is a proof-producing constraint engine.

It must not merely return a completed board. It must explain how the board was solved, prove whether the solution is unique, identify ambiguity, and expose the reasoning structure used for difficulty certification and hints.

## 2. Solver Responsibilities

The solver must:

1. validate the supplied puzzle state;
2. build domains for every unresolved number node;
3. propagate equation constraints;
4. record every deduction;
5. track dependencies between deductions;
6. detect contradictions;
7. detect stalled logical solving;
8. enumerate solutions only when uniqueness verification requires it;
9. return a deterministic proof artifact;
10. produce machine-readable diagnostics.

## 3. Solver Modes

### Logical Mode

Uses only registered deduction techniques.

This mode is used for:

- player hints;
- proof construction;
- logical difficulty analysis;
- campaign certification.

Logical mode must never silently guess.

### Uniqueness Mode

May use deterministic search after logical propagation stalls.

This mode is used only to determine:

- no solution;
- exactly one solution;
- multiple solutions.

Search decisions must be recorded separately from logical deductions.

### Verification Mode

Checks a proposed completed assignment against:

- node domains;
- equation arithmetic;
- number-bank multiplicity;
- given values;
- topology constraints.

## 4. Canonical Solver Input

The solver consumes a normalized puzzle state containing:

- board topology;
- equation definitions;
- visible givens;
- hidden number nodes;
- number-bank tile identities;
- allowed value domain;
- arithmetic policy.

The solver must not depend on React Native components, screen state, gestures, animation state, or persistent storage.

## 5. Domains

Every unresolved number node owns a finite domain of candidate values.

Domains are derived from:

- the arithmetic policy;
- visible givens;
- number-bank tile multiplicity;
- intersecting equations;
- already assigned values.

A domain reduction is a first-class solver event.

## 6. Deduction Techniques

The first engine version recognizes these technique families:

1. given assignment;
2. single remaining tile;
3. single remaining value in a node domain;
4. equation completion from two known values;
5. equation candidate elimination;
6. intersection propagation;
7. tile multiplicity elimination;
8. contradiction elimination;
9. forced assignment after propagation.

Each technique must have:

- a stable identifier;
- explicit premises;
- affected nodes;
- before and after domains;
- a deterministic explanation payload.

## 7. Proof Graph

The proof is a directed acyclic graph.

A proof node represents one deduction.

Edges point from prerequisite deductions to deductions that depend on them.

The proof graph must preserve:

- deduction order;
- dependency depth;
- parallel deductions;
- technique identity;
- affected node IDs;
- evidence;
- resulting assignments or domain reductions.

The same puzzle and solver configuration must always produce the same canonical proof.

## 8. Search Trace

Search is not part of the logical proof.

When uniqueness mode branches, the solver records:

- selected node;
- ordered candidate values;
- branch depth;
- contradictions;
- discovered solutions;
- termination reason.

The branch order must be deterministic.

## 9. Solution Classification

A solve attempt returns exactly one of:

- `solved-logically`
- `solved-with-search`
- `unsatisfiable`
- `multiple-solutions`
- `stalled`
- `invalid-input`
- `resource-limit`

A puzzle may be accepted for production only when certification policy approves both its solution classification and proof characteristics.

## 10. Uniqueness Certificate

A uniqueness certificate must state:

- the canonical solution;
- the number of solutions found up to the configured limit;
- whether search was required;
- the deterministic search trace fingerprint;
- the solver version;
- the puzzle fingerprint.

Production certification requires exactly one valid solution.

## 11. Determinism

Determinism is mandatory.

Given identical:

- normalized puzzle;
- solver version;
- technique registry;
- arithmetic policy;
- limits;

the solver must produce identical:

- deductions;
- dependency edges;
- branch choices;
- diagnostics;
- fingerprints.

## 12. Resource Limits

Solver limits must be explicit and reported:

- maximum deductions;
- maximum propagation rounds;
- maximum search nodes;
- maximum search depth;
- maximum solutions;
- optional time budget.

A resource-limit result must never be reported as uniqueness.

## 13. Hint Contract

Hints are derived from the logical proof.

A hint may reveal:

- the next relevant node;
- the applicable technique;
- the supporting equations;
- the narrowed candidate set;
- the final value only at the strongest hint level.

Hints must never invent reasoning that is absent from the proof.

## 14. Acceptance Rule

A production puzzle is not solver-certified unless:

1. input validation passes;
2. at least one solution exists;
3. exactly one solution is proven;
4. the canonical solution satisfies all equations;
5. number-bank multiplicity is respected;
6. required logical-proof policy passes;
7. no resource limit was reached;
8. proof and uniqueness fingerprints are stored.
