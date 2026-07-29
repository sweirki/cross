Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\cross

$files = @{
  ".\docs\GENERATOR_SPECIFICATION.md" = @'
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
'@

  ".\src\types\Generator.ts" = @'
import type { DifficultyTier } from "./Difficulty";
import type {
  ArithmeticOperator,
  BoardTopology,
  NodeId,
} from "./Topology";
import type { SolverPuzzleInput } from "../game/solver/SolverContracts";

export interface SeededGenerationIdentity {
  readonly rootSeed: string;
  readonly attemptIndex: number;
  readonly attemptSeed: string;
}

export interface TopologyGenerationPolicy {
  readonly id: string;
  readonly minimumWidth: number;
  readonly maximumWidth: number;
  readonly minimumHeight: number;
  readonly maximumHeight: number;
  readonly minimumEquationCount: number;
  readonly maximumEquationCount: number;
  readonly minimumIntersectionCount: number;
  readonly maximumIntersectionCount: number;
}

export interface OperatorGenerationPolicy {
  readonly id: string;
  readonly allowedOperators: readonly ArithmeticOperator[];
  readonly minimumDistinctOperators: number;
  readonly maximumRepeatedOperatorRun: number;
}

export interface NumericGenerationPolicy {
  readonly id: string;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly allowZero: boolean;
  readonly allowNegativeValues: boolean;
  readonly requireIntegerDivision: boolean;
  readonly allowDuplicateValues: boolean;
}

export interface ClueGenerationPolicy {
  readonly id: string;
  readonly minimumVisibleNumbers: number;
  readonly maximumVisibleNumbers: number;
  readonly minimumHiddenNumbers: number;
  readonly maximumHiddenNumbers: number;
  readonly minimumVisibleNumbersPerEquation: number;
  readonly maximumVisibleNumbersPerEquation: number;
  readonly preferHiddenIntersections: boolean;
}

export interface NumberBankGenerationPolicy {
  readonly id: string;
  readonly shuffleTiles: boolean;
  readonly preserveDuplicateTileIdentity: true;
}

export interface GeneratorLimits {
  readonly maxTopologyAttempts: number;
  readonly maxPlacementAttempts: number;
  readonly maxOperatorAttempts: number;
  readonly maxNumericSynthesisAttempts: number;
  readonly maxBacktrackingNodes: number;
  readonly maxClueMaskAttempts: number;
  readonly timeBudgetMs?: number;
}

export interface GenerationRequest {
  readonly generatorVersion: string;
  readonly rootSeed: string;
  readonly targetDifficulty: DifficultyTier;
  readonly topologyPolicy: TopologyGenerationPolicy;
  readonly operatorPolicy: OperatorGenerationPolicy;
  readonly numericPolicy: NumericGenerationPolicy;
  readonly cluePolicy: ClueGenerationPolicy;
  readonly numberBankPolicy: NumberBankGenerationPolicy;
  readonly limits: GeneratorLimits;
}

export interface GeneratedNumberTile {
  readonly id: string;
  readonly value: number;
}

export interface CandidateFingerprints {
  readonly exact: string;
  readonly structural: string;
  readonly solution: string;
  readonly topology: string;
}

export interface GenerationProvenance {
  readonly generatorVersion: string;
  readonly identity: SeededGenerationIdentity;
  readonly topologyPolicyId: string;
  readonly operatorPolicyId: string;
  readonly numericPolicyId: string;
  readonly cluePolicyId: string;
  readonly numberBankPolicyId: string;
  readonly fingerprints: CandidateFingerprints;
  readonly createdAtIso: string;
}

export interface GeneratedCandidate {
  readonly puzzleId: string;
  readonly topology: BoardTopology;
  readonly canonicalSolution: Readonly<Record<NodeId, number>>;
  readonly visibleValues: Readonly<Record<NodeId, number>>;
  readonly hiddenNodeIds: readonly NodeId[];
  readonly numberBank: readonly GeneratedNumberTile[];
  readonly solverInput: SolverPuzzleInput;
  readonly provenance: GenerationProvenance;
}

export type GenerationStage =
  | "request-validation"
  | "topology"
  | "operator-assignment"
  | "numeric-synthesis"
  | "clue-selection"
  | "number-bank"
  | "normalization";

export type GenerationStatus =
  | "candidate-created"
  | "topology-failed"
  | "operator-assignment-failed"
  | "numeric-synthesis-failed"
  | "clue-selection-failed"
  | "normalization-failed"
  | "resource-limit"
  | "invalid-request";

export type GenerationDiagnosticCode =
  | "INVALID_POLICY"
  | "TOPOLOGY_ATTEMPTS_EXHAUSTED"
  | "PLACEMENT_ATTEMPTS_EXHAUSTED"
  | "OPERATOR_ATTEMPTS_EXHAUSTED"
  | "NUMERIC_SYNTHESIS_ATTEMPTS_EXHAUSTED"
  | "BACKTRACKING_LIMIT_REACHED"
  | "CLUE_MASK_ATTEMPTS_EXHAUSTED"
  | "TIME_LIMIT_REACHED"
  | "NORMALIZATION_FAILED";

export interface GenerationDiagnostic {
  readonly stage: GenerationStage;
  readonly code: GenerationDiagnosticCode;
  readonly message: string;
  readonly identity: SeededGenerationIdentity;
}

export interface GenerationResourceUsage {
  readonly topologyAttempts: number;
  readonly placementAttempts: number;
  readonly operatorAttempts: number;
  readonly numericSynthesisAttempts: number;
  readonly backtrackingNodes: number;
  readonly clueMaskAttempts: number;
  readonly elapsedMs: number;
}

export interface GenerationResult {
  readonly status: GenerationStatus;
  readonly candidate?: GeneratedCandidate;
  readonly diagnostics: readonly GenerationDiagnostic[];
  readonly resourceUsage: GenerationResourceUsage;
}
'@

  ".\src\game\generator\GeneratorContracts.ts" = @'
import type {
  GeneratedCandidate,
  GenerationRequest,
  GenerationResult,
} from "../../types/Generator";

export interface CrossPuzzleGenerator {
  readonly version: string;

  generate(
    request: GenerationRequest,
  ): GenerationResult;
}

export interface CandidateNormalizer {
  normalize(
    candidate: GeneratedCandidate,
  ): GeneratedCandidate;
}

export interface CandidateFingerprintService {
  exact(candidate: GeneratedCandidate): string;
  structural(candidate: GeneratedCandidate): string;
  solution(candidate: GeneratedCandidate): string;
  topology(candidate: GeneratedCandidate): string;
}
'@

  ".\src\game\validation\GeneratorValidation.ts" = @'
import type {
  GeneratedCandidate,
  GenerationRequest,
  GenerationResult,
} from "../../types/Generator";

export type GeneratorArtifactValidationCode =
  | "INVALID_GENERATION_REQUEST"
  | "MISSING_CANDIDATE"
  | "UNEXPECTED_CANDIDATE"
  | "MISSING_PROVENANCE"
  | "MISSING_FINGERPRINT"
  | "INCONSISTENT_HIDDEN_NODES"
  | "INCONSISTENT_NUMBER_BANK"
  | "INCONSISTENT_SOLVER_INPUT"
  | "NON_CANONICAL_ORDERING"
  | "INVALID_RESOURCE_USAGE";

export interface GeneratorArtifactValidationIssue {
  readonly code: GeneratorArtifactValidationCode;
  readonly message: string;
}

export interface GeneratorArtifactValidationResult {
  readonly valid: boolean;
  readonly issues: readonly GeneratorArtifactValidationIssue[];
}

export interface GeneratorArtifactValidator {
  validateRequest(
    request: GenerationRequest,
  ): GeneratorArtifactValidationResult;

  validateCandidate(
    candidate: GeneratedCandidate,
  ): GeneratorArtifactValidationResult;

  validateResult(
    result: GenerationResult,
  ): GeneratorArtifactValidationResult;
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
Write-Host "Phase 2.7 files created:"
Write-Host "  docs/GENERATOR_SPECIFICATION.md"
Write-Host "  src/types/Generator.ts"
Write-Host "  src/game/generator/GeneratorContracts.ts"
Write-Host "  src/game/validation/GeneratorValidation.ts"
Write-Host ""

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  throw "TypeScript validation failed."
}

Write-Host ""
Write-Host "Phase 2.7 generator contracts passed TypeScript validation."
