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
