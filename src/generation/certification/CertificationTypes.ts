
import type { CandidateCertificate, PuzzleCandidate, DeductionTrace } from "../contracts/GenerationContracts";
import type { EquationFillingDiagnostics } from "../filling/FillingTypes";

export type CertificationGate =
  | "composition"
  | "dependency"
  | "arithmetic"
  | "clues"
  | "deduction"
  | "difficulty"
  | "performance";

export type CertificationFailureCode =
  | "INVALID_COMPOSITION"
  | "INVALID_DEPENDENCY"
  | "INVALID_ARITHMETIC"
  | "INVALID_CLUE_PLAN"
  | "UNSOLVED_DEDUCTION_TRACE"
  | "DIFFICULTY_MISMATCH"
  | "PERFORMANCE_BUDGET_EXCEEDED"
  | "QUALITY_THRESHOLD_NOT_MET";

export interface CertificationFailure {
  readonly gate: CertificationGate;
  readonly code: CertificationFailureCode;
  readonly message: string;
}

export interface QualityScorecard {
  readonly composition: number;
  readonly clusterQuality: number;
  readonly dependency: number;
  readonly deductionRhythm: number;
  readonly arithmeticTexture: number;
  readonly clueQuality: number;
  readonly visualBalance: number;
  readonly difficultyAccuracy: number;
  readonly novelty: number;
  readonly overall: number;
}

export interface CertificationInput {
  readonly candidate: PuzzleCandidate;
  readonly deductionTrace: DeductionTrace;
  readonly fillingDiagnostics?: EquationFillingDiagnostics;
  readonly noveltyScore?: number;
}

export interface CertificationResult {
  readonly accepted: boolean;
  readonly certificate: CandidateCertificate;
  readonly scorecard: QualityScorecard;
  readonly failures: readonly CertificationFailure[];
}
