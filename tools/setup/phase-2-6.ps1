Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\cross

$files = @{
  ".\docs\SOLVER_SPECIFICATION.md" = @'
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
'@

  ".\src\types\Solver.ts" = @'
import type {
  EquationId,
  NodeId,
} from "./Topology";

export type SolverMode =
  | "logical"
  | "uniqueness"
  | "verification";

export type SolveStatus =
  | "solved-logically"
  | "solved-with-search"
  | "unsatisfiable"
  | "multiple-solutions"
  | "stalled"
  | "invalid-input"
  | "resource-limit";

export type DeductionTechniqueId =
  | "given-assignment"
  | "single-remaining-tile"
  | "single-domain-value"
  | "equation-completion"
  | "equation-candidate-elimination"
  | "intersection-propagation"
  | "tile-multiplicity-elimination"
  | "contradiction-elimination"
  | "forced-assignment";

export interface SolverLimits {
  readonly maxDeductions: number;
  readonly maxPropagationRounds: number;
  readonly maxSearchNodes: number;
  readonly maxSearchDepth: number;
  readonly maxSolutions: number;
  readonly timeBudgetMs?: number;
}

export interface NodeDomain {
  readonly nodeId: NodeId;
  readonly values: readonly number[];
}

export interface DomainChange {
  readonly nodeId: NodeId;
  readonly before: readonly number[];
  readonly after: readonly number[];
}

export interface SolverEvidence {
  readonly nodeIds: readonly NodeId[];
  readonly equationIds: readonly EquationId[];
  readonly messageKey: string;
  readonly parameters: Readonly<Record<string, string | number>>;
}

export interface SolverDeduction {
  readonly id: string;
  readonly sequence: number;
  readonly technique: DeductionTechniqueId;
  readonly prerequisiteDeductionIds: readonly string[];
  readonly changes: readonly DomainChange[];
  readonly assignments: Readonly<Record<NodeId, number>>;
  readonly evidence: SolverEvidence;
}

export interface SolverProof {
  readonly deductions: readonly SolverDeduction[];
  readonly maximumDepth: number;
  readonly fingerprint: string;
}

export interface SearchDecision {
  readonly id: string;
  readonly depth: number;
  readonly nodeId: NodeId;
  readonly orderedCandidates: readonly number[];
}

export interface SearchContradiction {
  readonly decisionId: string;
  readonly candidate: number;
  readonly reason: string;
}

export interface SearchTrace {
  readonly decisions: readonly SearchDecision[];
  readonly contradictions: readonly SearchContradiction[];
  readonly visitedNodes: number;
  readonly maximumDepth: number;
  readonly fingerprint: string;
}

export interface SolverSolution {
  readonly assignments: Readonly<Record<NodeId, number>>;
  readonly fingerprint: string;
}

export interface UniquenessCertificate {
  readonly unique: boolean;
  readonly solutionsFound: number;
  readonly solutionLimit: number;
  readonly searchRequired: boolean;
  readonly canonicalSolution?: SolverSolution;
  readonly searchFingerprint?: string;
  readonly puzzleFingerprint: string;
  readonly solverVersion: string;
}

export type SolverDiagnosticCode =
  | "INVALID_PUZZLE"
  | "CONTRADICTION"
  | "LOGICAL_STALL"
  | "SEARCH_LIMIT_REACHED"
  | "DEPTH_LIMIT_REACHED"
  | "DEDUCTION_LIMIT_REACHED"
  | "PROPAGATION_LIMIT_REACHED"
  | "TIME_LIMIT_REACHED";

export interface SolverDiagnostic {
  readonly code: SolverDiagnosticCode;
  readonly message: string;
  readonly nodeId?: NodeId;
  readonly equationId?: EquationId;
}

export interface SolveResult {
  readonly status: SolveStatus;
  readonly mode: SolverMode;
  readonly domains: readonly NodeDomain[];
  readonly proof: SolverProof;
  readonly searchTrace?: SearchTrace;
  readonly solutions: readonly SolverSolution[];
  readonly uniqueness?: UniquenessCertificate;
  readonly diagnostics: readonly SolverDiagnostic[];
}
'@

  ".\src\game\solver\SolverContracts.ts" = @'
import type {
  BoardTopology,
  NodeId,
} from "../../types/Topology";
import type {
  SolveResult,
  SolverLimits,
  SolverMode,
} from "../../types/Solver";

export interface SolverNumberTile {
  readonly id: string;
  readonly value: number;
}

export interface SolverPuzzleInput {
  readonly puzzleId: string;
  readonly puzzleFingerprint: string;
  readonly topology: BoardTopology;
  readonly givenValues: Readonly<Record<NodeId, number>>;
  readonly hiddenNodeIds: readonly NodeId[];
  readonly numberBank: readonly SolverNumberTile[];
  readonly minimumValue: number;
  readonly maximumValue: number;
}

export interface SolveRequest {
  readonly mode: SolverMode;
  readonly puzzle: SolverPuzzleInput;
  readonly limits: SolverLimits;
}

export interface CrossSolver {
  readonly version: string;
  solve(request: SolveRequest): SolveResult;
}
'@

  ".\src\game\validation\SolverValidation.ts" = @'
import type {
  SolveResult,
  SolverProof,
  UniquenessCertificate,
} from "../../types/Solver";

export type SolverArtifactValidationCode =
  | "INVALID_DEDUCTION_SEQUENCE"
  | "MISSING_PREREQUISITE"
  | "CYCLIC_PROOF_DEPENDENCY"
  | "INVALID_DOMAIN_CHANGE"
  | "INVALID_ASSIGNMENT"
  | "INCONSISTENT_STATUS"
  | "INVALID_UNIQUENESS_CERTIFICATE"
  | "MISSING_FINGERPRINT";

export interface SolverArtifactValidationIssue {
  readonly code: SolverArtifactValidationCode;
  readonly message: string;
  readonly deductionId?: string;
}

export interface SolverArtifactValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SolverArtifactValidationIssue[];
}

export interface SolverArtifactValidator {
  validateProof(proof: SolverProof): SolverArtifactValidationResult;

  validateUniquenessCertificate(
    certificate: UniquenessCertificate,
  ): SolverArtifactValidationResult;

  validateSolveResult(
    result: SolveResult,
  ): SolverArtifactValidationResult;
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
Write-Host "Phase 2.6 files created:"
Write-Host "  docs/SOLVER_SPECIFICATION.md"
Write-Host "  src/types/Solver.ts"
Write-Host "  src/game/solver/SolverContracts.ts"
Write-Host "  src/game/validation/SolverValidation.ts"
Write-Host ""

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  throw "TypeScript validation failed."
}

Write-Host ""
Write-Host "Phase 2.6 solver contracts passed TypeScript validation."
