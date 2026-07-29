import type { DifficultyTier } from "./Difficulty";

export interface DifficultyMetricVector {
  /** Maximum active decision depth observed in the deterministic trace. */
  readonly proofDepth: number;
  /** Largest candidate domain selected during solving. */
  readonly proofWidth: number;
  /** Number of selections with exactly one legal value. */
  readonly deductionCount: number;
  /** Number of distinct deduction/search characteristics used. */
  readonly techniqueDiversity: number;
  /** Mean candidate count across selection events. */
  readonly branchingFactor: number;
  /** Mean binary information reduction produced by selections. */
  readonly informationGain: number;
  /** Equation-to-hidden-cell ratio. */
  readonly constraintDensity: number;
}

export interface DifficultyEvidence {
  readonly hiddenCellCount: number;
  readonly equationCount: number;
  readonly forcedMoveCount: number;
  readonly branchPointCount: number;
  readonly visitedSearchNodes: number;
  readonly traceEventCount: number;
}

export interface DifficultyCertification {
  readonly certificationVersion: 1;
  readonly requestedTier: DifficultyTier;
  readonly certifiedTier: DifficultyTier;
  /** Integer score from 0 through 100. */
  readonly score: number;
  readonly unique: true;
  readonly metrics: DifficultyMetricVector;
  readonly evidence: DifficultyEvidence;
  readonly fingerprint: string;
}
