"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyCandidate = certifyCandidate;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const CompositionValidator_1 = require("../composition/CompositionValidator");
const DependencyValidator_1 = require("../dependency/DependencyValidator");
const EquationFillValidator_1 = require("../filling/EquationFillValidator");
const CluePlanValidator_1 = require("../clues/CluePlanValidator");
const CertificationProfiles_1 = require("./CertificationProfiles");
const Fingerprinting_1 = require("./Fingerprinting");
const QualityScorer_1 = require("./QualityScorer");
function failure(gate, code, message) {
    return Object.freeze({ gate, code, message });
}
function componentScores(scorecard) {
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
function certifyCandidate(input) {
    const { candidate, deductionTrace, fillingDiagnostics } = input;
    const failures = [];
    const profile = (0, CertificationProfiles_1.certificationProfileForDifficulty)(candidate.request.difficulty);
    const composition = (0, CompositionValidator_1.inspectCompositionPlan)(candidate.composition);
    if (!composition.valid) {
        failures.push(failure("composition", "INVALID_COMPOSITION", composition.errors.join("; ")));
    }
    const dependency = (0, DependencyValidator_1.validateDependencyGraph)(candidate.dependency);
    if (!dependency.valid) {
        failures.push(failure("dependency", "INVALID_DEPENDENCY", dependency.errors.join("; ")));
    }
    const arithmetic = (0, EquationFillValidator_1.validateEquationFillPlan)(candidate.request.difficulty, candidate.composition, candidate.fill);
    if (!arithmetic.valid) {
        failures.push(failure("arithmetic", "INVALID_ARITHMETIC", arithmetic.errors.join("; ")));
    }
    const clues = (0, CluePlanValidator_1.validateCluePlan)(candidate.composition, candidate.fill, candidate.clues);
    if (!clues.valid) {
        failures.push(failure("clues", "INVALID_CLUE_PLAN", clues.errors.join("; ")));
    }
    if (!deductionTrace.solved || deductionTrace.unresolvedCellIds.length > 0) {
        failures.push(failure("deduction", "UNSOLVED_DEDUCTION_TRACE", `Deduction trace leaves ${deductionTrace.unresolvedCellIds.length} unresolved cells.`));
    }
    const depth = deductionTrace.metrics.deductionDepth ?? 0;
    const starts = deductionTrace.metrics.initialDeductions ?? 0;
    if (depth < profile.minimumDeductionDepth || starts < 1 || starts > profile.maximumInitialDeductions) {
        failures.push(failure("difficulty", "DIFFICULTY_MISMATCH", `Trace depth ${depth} and initial deductions ${starts} do not match ${candidate.request.difficulty}.`));
    }
    if (fillingDiagnostics && fillingDiagnostics.searchNodes > profile.maximumSearchNodes) {
        failures.push(failure("performance", "PERFORMANCE_BUDGET_EXCEEDED", `Search used ${fillingDiagnostics.searchNodes} nodes; budget is ${profile.maximumSearchNodes}.`));
    }
    const scorecard = (0, QualityScorer_1.scoreCandidate)(input);
    if (scorecard.overall < profile.minimumOverall ||
        componentScores(scorecard).some((score) => score < profile.minimumComponent)) {
        failures.push(failure("difficulty", "QUALITY_THRESHOLD_NOT_MET", `Overall ${scorecard.overall}; required ${profile.minimumOverall}, component floor ${profile.minimumComponent}.`));
    }
    const fingerprints = (0, Fingerprinting_1.candidateFingerprints)(candidate);
    const certificate = Object.freeze({
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.candidateCertificate,
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
