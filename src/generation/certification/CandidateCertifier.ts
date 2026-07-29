
import type { CandidateCertificate } from "../contracts/GenerationContracts";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { inspectCompositionPlan } from "../composition/CompositionValidator";
import { validateDependencyGraph } from "../dependency/DependencyValidator";
import { validateEquationFillPlan } from "../filling/EquationFillValidator";
import { validateCluePlan } from "../clues/CluePlanValidator";
import { certificationProfileForDifficulty } from "./CertificationProfiles";
import { candidateFingerprints } from "./Fingerprinting";
import { scoreCandidate } from "./QualityScorer";
import type {
  CertificationFailure,
  CertificationInput,
  CertificationResult,
  QualityScorecard,
} from "./CertificationTypes";

function failure(
  gate: CertificationFailure["gate"],
  code: CertificationFailure["code"],
  message: string,
): CertificationFailure {
  return Object.freeze({ gate, code, message });
}

function componentScores(scorecard: QualityScorecard): readonly number[] {
  return [
    scorecard.composition,
    scorecard.clusterQuality,
    scorecard.dependency,
    scorecard.deductionRhythm,
    scorecard.arithmeticTexture,
    scorecard.clueQuality,
    scorecard.visualBalance,
    scorecard.difficultyAccuracy,
  ];
}

export function certifyCandidate(input: CertificationInput): CertificationResult {
  const { candidate, deductionTrace, fillingDiagnostics } = input;
  const failures: CertificationFailure[] = [];
  const profile = certificationProfileForDifficulty(candidate.request.difficulty);

  const composition = inspectCompositionPlan(candidate.composition);
  if (!composition.valid) {
    failures.push(failure("composition", "INVALID_COMPOSITION", composition.errors.join("; ")));
  }

  const dependency = validateDependencyGraph(candidate.dependency);
  if (!dependency.valid) {
    failures.push(failure("dependency", "INVALID_DEPENDENCY", dependency.errors.join("; ")));
  }

  const arithmetic = validateEquationFillPlan(candidate.request.difficulty, candidate.composition, candidate.fill);
  if (!arithmetic.valid) {
    failures.push(failure("arithmetic", "INVALID_ARITHMETIC", arithmetic.errors.join("; ")));
  }

  const clues = validateCluePlan(candidate.composition, candidate.fill, candidate.clues);
  if (!clues.valid) {
    failures.push(failure("clues", "INVALID_CLUE_PLAN", clues.errors.join("; ")));
  }

  if (!deductionTrace.solved || deductionTrace.unresolvedCellIds.length > 0) {
    failures.push(failure(
      "deduction",
      "UNSOLVED_DEDUCTION_TRACE",
      `Deduction trace leaves ${deductionTrace.unresolvedCellIds.length} unresolved cells.`,
    ));
  }

  const depth = deductionTrace.metrics.deductionDepth ?? 0;
  const starts = deductionTrace.metrics.initialDeductions ?? 0;
  if (depth < profile.minimumDeductionDepth || starts < 1 || starts > profile.maximumInitialDeductions) {
    failures.push(failure(
      "difficulty",
      "DIFFICULTY_MISMATCH",
      `Trace depth ${depth} and initial deductions ${starts} do not match ${candidate.request.difficulty}.`,
    ));
  }

  if (fillingDiagnostics && fillingDiagnostics.searchNodes > profile.maximumSearchNodes) {
    failures.push(failure(
      "performance",
      "PERFORMANCE_BUDGET_EXCEEDED",
      `Search used ${fillingDiagnostics.searchNodes} nodes; budget is ${profile.maximumSearchNodes}.`,
    ));
  }

  const scorecard = scoreCandidate(input);
  if (
    scorecard.overall < profile.minimumOverall ||
    componentScores(scorecard).some((score) => score < profile.minimumComponent)
  ) {
    failures.push(failure(
      "difficulty",
      "QUALITY_THRESHOLD_NOT_MET",
      `Overall ${scorecard.overall}; required ${profile.minimumOverall}, component floor ${profile.minimumComponent}.`,
    ));
  }

  const fingerprints = candidateFingerprints(candidate);
  const certificate: CandidateCertificate = Object.freeze({
    schema: GENERATION_SCHEMA_IDS.candidateCertificate,
    valid: failures.length === 0,
    certifiedDifficulty: candidate.request.difficulty,
    hardGateFailures: Object.freeze(failures.map((entry) => entry.code)),
    scores: Object.freeze({ ...scorecard }),
    fingerprints,
  });

  return Object.freeze({
    accepted: certificate.valid,
    certificate,
    scorecard,
    failures: Object.freeze(failures),
  });
}
