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
