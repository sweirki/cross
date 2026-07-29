import type { DifficultyCertification } from "../../types/DifficultyCertification";

export interface DifficultyValidationResult {
  readonly valid: boolean;
  readonly issues: readonly string[];
}

export interface DifficultyValidator {
  validate(certification: DifficultyCertification): DifficultyValidationResult;
}

export function validateDifficultyCertification(
  certification: DifficultyCertification,
): DifficultyValidationResult {
  const issues: string[] = [];
  if (certification.certificationVersion !== 1) {
    issues.push("Unsupported difficulty certification version.");
  }
  if (!Number.isInteger(certification.score) ||
      certification.score < 0 ||
      certification.score > 100) {
    issues.push("Difficulty score must be an integer from 0 through 100.");
  }
  for (const [name, value] of Object.entries(certification.metrics)) {
    if (!Number.isFinite(value) || value < 0) {
      issues.push(`Difficulty metric ${name} must be a finite non-negative number.`);
    }
  }
  for (const [name, value] of Object.entries(certification.evidence)) {
    if (!Number.isInteger(value) || value < 0) {
      issues.push(`Difficulty evidence ${name} must be a non-negative integer.`);
    }
  }
  if (!/^difficulty-v1-[0-9a-f]{16}$/.test(certification.fingerprint)) {
    issues.push("Difficulty fingerprint has an invalid format.");
  }
  if (certification.unique !== true) {
    issues.push("Only uniquely solved puzzles can be certified.");
  }
  return { valid: issues.length === 0, issues };
}
