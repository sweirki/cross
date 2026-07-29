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
