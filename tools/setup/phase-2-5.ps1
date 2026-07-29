Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\cross

$files = @{
  ".\docs\DEDUCTION_SPECIFICATION.md" = @'
# Cross Deduction Specification

Version: 1.0  
Status: Draft

## 1. Purpose

A certified Cross puzzle must be accompanied by a machine-readable logical proof.

The proof records how each hidden number is deduced from the puzzle state without guessing.

A final solution alone is not sufficient certification.

## 2. Core Rule

Every accepted puzzle must satisfy all of the following:

1. it has exactly one complete solution;
2. every hidden number is reachable through valid deductions;
3. no deduction depends on hidden solution data unavailable to the player;
4. the proof terminates with all hidden number nodes solved;
5. the proof is reproducible and deterministic.

## 3. Candidate Domains

Each hidden number node begins with a candidate domain.

The initial domain is derived from:

- the number-bank tile occurrences;
- already visible values;
- tile identity and multiplicity;
- equation legality;
- topology participation.

Duplicate numeric values remain separate tile occurrences even when they share the same value.

## 4. Deduction Techniques

The first engine version supports these deduction techniques.

### 4.1 Equation Completion

When every number in an equation except one is known, the remaining number is calculated directly.

### 4.2 Equation Candidate Filtering

A candidate is removed when assigning it to a node would make any participating equation impossible.

### 4.3 Single Candidate

When a node has exactly one remaining legal tile occurrence, that occurrence is assigned.

### 4.4 Single Position for Tile

When a remaining tile occurrence can legally occupy only one unresolved node, it is assigned there.

### 4.5 Intersection Propagation

A deduction made through one equation immediately constrains every intersecting equation that shares the same number node.

### 4.6 Pair Constraint

When two unresolved nodes are restricted to the same two tile occurrences, those occurrences are removed from every other unresolved node.

This technique is optional for Easy puzzles and may be required by harder tiers.

### 4.7 Contradiction Elimination

A candidate may be removed when deterministic forward propagation proves that the candidate leads to an impossible state.

This is logical look-ahead, not unrestricted guessing.

The certification record must preserve the contradiction proof.

## 5. Deduction Step

Every deduction step must record:

- a stable step identifier;
- the technique used;
- the affected node or nodes;
- assigned or removed tile occurrences;
- prerequisite step identifiers;
- supporting equation identifiers;
- a concise machine-readable reason;
- the puzzle state revision before and after the step.

## 6. Proof Graph

The complete proof is a directed acyclic graph.

A node in the proof graph is one deduction step.

An edge means that one deduction depends on the result of another deduction.

Independent deductions may exist at the same proof depth.

The proof graph must not contain cycles.

## 7. Deterministic Canonical Proof

Multiple valid deduction orders may exist.

For certification, the solver must produce one canonical proof using deterministic tie-breaking:

1. lowest proof depth;
2. least expensive technique;
3. lowest equation identifier;
4. lowest node identifier;
5. lowest tile occurrence identifier.

The same puzzle and engine version must always produce the same canonical proof.

## 8. Guessing

Unrestricted guessing is forbidden in a certified logical proof.

A solver may perform bounded contradiction analysis only when:

- the assumed candidate is explicitly recorded;
- propagation is deterministic;
- the contradiction is machine-verifiable;
- the assumption is discharged before continuing.

A puzzle that requires arbitrary search without an explainable contradiction proof is rejected.

## 9. Proof Completion

A proof is complete only when:

- every hidden node has one assigned tile occurrence;
- every number-bank tile occurrence is used exactly once;
- every equation validates mathematically;
- no unresolved candidate domain remains;
- the reconstructed solution matches the unique certified solution.

## 10. Deduction Metrics

The proof exposes at least these metrics:

- total deduction steps;
- assignment count;
- elimination count;
- maximum proof depth;
- maximum branching width;
- number of equation completions;
- number of intersection propagations;
- number of pair constraints;
- number of contradiction eliminations;
- maximum candidate-domain size;
- average candidate-domain size;
- dependency-chain length;
- forced-move ratio.

These metrics inform difficulty but do not alone define it.

## 11. Hint Contract

Hints are generated from the canonical proof.

A hint must reveal the next currently valid deduction, not hidden solution information.

The hint system may expose progressively stronger layers:

1. affected equation;
2. relevant candidate relationship;
3. deduction technique;
4. exact tile placement.

## 12. Certification Failures

A puzzle is rejected when any of the following occurs:

- no solution;
- multiple solutions;
- disconnected proof;
- unresolved hidden node;
- unsupported deduction technique;
- proof cycle;
- non-deterministic canonical proof;
- tile multiplicity violation;
- equation validation failure;
- required unrestricted guessing.

## 13. Locked Product Rule

Difficulty is derived from the reasoning represented by the proof graph, not from visual size, large numbers, or arithmetic operator choice alone.
'@

  ".\src\types\Deduction.ts" = @'
import type { EquationId, NodeId } from "./Topology";

export type TileOccurrenceId = string;
export type DeductionStepId = string;

export type DeductionTechnique =
  | "equation-completion"
  | "equation-candidate-filtering"
  | "single-candidate"
  | "single-position-for-tile"
  | "intersection-propagation"
  | "pair-constraint"
  | "contradiction-elimination";

export interface CandidateAssignment {
  readonly nodeId: NodeId;
  readonly tileId: TileOccurrenceId;
}

export interface CandidateElimination {
  readonly nodeId: NodeId;
  readonly tileId: TileOccurrenceId;
}

export interface DeductionReason {
  readonly code: string;
  readonly message: string;
}

export interface DeductionStep {
  readonly id: DeductionStepId;
  readonly technique: DeductionTechnique;
  readonly assignments: readonly CandidateAssignment[];
  readonly eliminations: readonly CandidateElimination[];
  readonly prerequisiteStepIds: readonly DeductionStepId[];
  readonly supportingEquationIds: readonly EquationId[];
  readonly reason: DeductionReason;
  readonly revisionBefore: number;
  readonly revisionAfter: number;
}

export interface DeductionProofMetrics {
  readonly totalSteps: number;
  readonly assignmentCount: number;
  readonly eliminationCount: number;
  readonly maximumDepth: number;
  readonly maximumWidth: number;
  readonly equationCompletionCount: number;
  readonly intersectionPropagationCount: number;
  readonly pairConstraintCount: number;
  readonly contradictionEliminationCount: number;
  readonly maximumCandidateDomainSize: number;
  readonly averageCandidateDomainSize: number;
  readonly longestDependencyChain: number;
  readonly forcedMoveRatio: number;
}

export interface DeductionProof {
  readonly puzzleId: string;
  readonly engineVersion: string;
  readonly steps: readonly DeductionStep[];
  readonly terminalAssignments: readonly CandidateAssignment[];
  readonly metrics: DeductionProofMetrics;
}
'@

  ".\src\game\validation\DeductionValidation.ts" = @'
import type {
  DeductionProof,
  DeductionStepId,
} from "../../types/Deduction";

export type DeductionValidationCode =
  | "DUPLICATE_STEP_ID"
  | "MISSING_PREREQUISITE_STEP"
  | "SELF_DEPENDENCY"
  | "PROOF_CYCLE"
  | "INVALID_REVISION_TRANSITION"
  | "EMPTY_DEDUCTION_EFFECT"
  | "CONFLICTING_ASSIGNMENT"
  | "DUPLICATE_TILE_ASSIGNMENT"
  | "UNSUPPORTED_TECHNIQUE"
  | "INCOMPLETE_PROOF"
  | "METRICS_MISMATCH";

export interface DeductionValidationIssue {
  readonly code: DeductionValidationCode;
  readonly message: string;
  readonly stepId?: DeductionStepId;
}

export interface DeductionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly DeductionValidationIssue[];
}

export interface DeductionProofValidator {
  validate(proof: DeductionProof): DeductionValidationResult;
}
'@
}

foreach ($path in $files.Keys) {
  $parent = Split-Path -Parent $path

  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $files[$path] | Set-Content -Encoding utf8 -Path $path
}

Write-Host ""
Write-Host "Phase 2.5 files created:"
Write-Host "  docs/DEDUCTION_SPECIFICATION.md"
Write-Host "  src/types/Deduction.ts"
Write-Host "  src/game/validation/DeductionValidation.ts"
Write-Host ""

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  throw "TypeScript validation failed."
}

Write-Host ""
Write-Host "Phase 2.5 deduction contracts passed TypeScript validation."
