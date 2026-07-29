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

import type { Position } from "./Position";

export type SolverStatus = "unsolved" | "unique" | "multiple" | "indeterminate";

export interface SolverAssignment {
  readonly cellId: string;
  readonly position: Position;
  readonly value: number;
}

export type SolverTraceEvent =
  | {
      readonly step: number;
      readonly kind: "select";
      readonly cellId: string;
      readonly candidates: readonly number[];
    }
  | {
      readonly step: number;
      readonly kind: "assign";
      readonly cellId: string;
      readonly value: number;
    }
  | {
      readonly step: number;
      readonly kind: "reject";
      readonly cellId: string;
      readonly value: number;
      readonly reason: "equation" | "number-bank";
    }
  | {
      readonly step: number;
      readonly kind: "backtrack";
      readonly cellId: string;
      readonly value: number;
    }
  | {
      readonly step: number;
      readonly kind: "solution";
      readonly solutionIndex: number;
    };

export interface PuzzleSolverOptions {
  /**
   * Search stops after this many distinct value assignments are found.
   * Uniqueness verification requires a value of at least 2.
   */
  readonly solutionLimit?: number;
  readonly includeTrace?: boolean;
}

export interface PuzzleSolverResult {
  readonly status: SolverStatus;
  /** Number of solutions discovered, capped by solutionLimit. */
  readonly solutionCount: number;
  /** True only when the entire search space was explored. */
  readonly searchExhausted: boolean;
  readonly firstSolution: readonly SolverAssignment[] | null;
  readonly trace: readonly SolverTraceEvent[];
  readonly visitedNodes: number;
}

export interface UniqueSolutionVerification {
  readonly unique: boolean;
  readonly solutionCount: number;
  readonly firstSolution: readonly SolverAssignment[] | null;
  readonly trace: readonly SolverTraceEvent[];
  readonly visitedNodes: number;
}
