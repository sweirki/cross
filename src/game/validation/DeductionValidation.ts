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
