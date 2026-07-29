# Cross Production Pipeline

Version: 1.0
Status: Draft

## Purpose

The production pipeline builds certified puzzle libraries from deterministic generation requests.

## Stages

1. Request
2. Generator
3. Solver
4. Difficulty Certification
5. Quality Certification
6. Duplicate Detection
7. Library Assembly
8. Export
9. Regression Verification

## Rules

- Every accepted puzzle has a unique fingerprint.
- Certification is independent of generation.
- Failed candidates are logged with deterministic diagnostics.
- Library exports are reproducible from the same seeds and policies.
