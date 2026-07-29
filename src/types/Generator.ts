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
