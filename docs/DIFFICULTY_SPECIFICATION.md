# Cross Difficulty Certification Specification

Version: 1.0
Status: Draft

## Purpose

Difficulty is derived from logical proof complexity rather than board size,
operator count, or numeric magnitude.

## Certification Inputs

- Solver proof
- Proof dependency graph
- Search trace
- Topology metrics
- Equation metrics
- Clue metrics

## Core Metrics

- Proof depth
- Proof width
- Deduction count
- Technique diversity
- Branching factor
- Information gain
- Constraint density
- Search requirement

## Output

The certification engine produces:

- certified difficulty tier
- metric vector
- deterministic fingerprint
- certification diagnostics

Generator requests are advisory.
Certification is authoritative.
