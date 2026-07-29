"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCandidate = scoreCandidate;
const CertificationProfiles_1 = require("./CertificationProfiles");
const TuningProfiles_1 = require("../tuning/TuningProfiles");
function clamp(value) {
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}
function metric(record, name, fallback = 0) {
    const value = record[name];
    return value === undefined || !Number.isFinite(value) ? fallback : value;
}
function scoreCandidate(input) {
    const { candidate, deductionTrace, fillingDiagnostics } = input;
    const profile = (0, CertificationProfiles_1.certificationProfileForDifficulty)(candidate.request.difficulty);
    const tuning = (0, TuningProfiles_1.productionTuningProfile)(candidate.request.difficulty);
    const compositionMetrics = candidate.composition.metrics;
    const dependencyMetrics = candidate.dependency.metrics;
    const traceMetrics = deductionTrace.metrics;
    const visualBalance = clamp(metric(compositionMetrics, "visualBalance", 0.5) * 100);
    const density = metric(compositionMetrics, "density", 0.35);
    const densityFitness = clamp(100 - Math.abs(density - tuning.targetDensity) * tuning.densityPenalty);
    const centerOffset = metric(compositionMetrics, "centerOffset", 0.5);
    const composition = clamp(visualBalance * 0.55 + densityFitness * 0.30 + (1 - Math.min(1, centerOffset)) * 15);
    const clusterCount = metric(compositionMetrics, "clusterCount", candidate.composition.clusters.length);
    const clusterQuality = clamp(55 + Math.min(30, clusterCount * 6) + Math.min(15, candidate.composition.clusters.length * 2));
    const longestPath = metric(dependencyMetrics, "longestPath");
    const branching = metric(dependencyMetrics, "branchingFactor");
    const components = metric(dependencyMetrics, "componentCount", 1);
    const dependency = clamp(45 + Math.min(30, longestPath * 4) + Math.min(20, branching * 10) - Math.max(0, components - 1) * 8);
    const depth = metric(traceMetrics, "deductionDepth");
    const initial = metric(traceMetrics, "initialDeductions");
    const solved = metric(traceMetrics, "solved");
    const depthFitness = depth >= profile.minimumDeductionDepth ? 100 : (depth / Math.max(1, profile.minimumDeductionDepth)) * 100;
    const startFitness = initial >= 1 && initial <= profile.maximumInitialDeductions
        ? 100
        : clamp(100 - Math.abs(initial - Math.max(1, profile.maximumInitialDeductions / 2)) * 12);
    const deductionRhythm = clamp(depthFitness * 0.55 + startFitness * 0.30 + solved * 15);
    const trivialRatio = fillingDiagnostics?.trivialEquationRatio ?? 0;
    const repeatedRatio = fillingDiagnostics?.repeatedValueRatio ?? 0;
    const operatorKinds = fillingDiagnostics
        ? Object.values(fillingDiagnostics.operatorCounts).filter((count) => count > 0).length
        : new Set(Object.values(candidate.fill.operators)).size;
    const arithmeticTexture = clamp(100 - trivialRatio * 55 - repeatedRatio * 35 + Math.min(15, operatorKinds * 4));
    const hidden = candidate.clues.hiddenCellIds.length;
    const total = hidden + candidate.clues.givenCellIds.length;
    const hiddenRatio = total === 0 ? 0 : hidden / total;
    const clueQuality = clamp(55 + hiddenRatio * 35 + (deductionTrace.solved ? 10 : 0));
    const difficultyAccuracy = clamp(depthFitness * 0.5 +
        startFitness * 0.3 +
        (dependency >= profile.minimumComponent ? 20 : (dependency / profile.minimumComponent) * 20));
    const novelty = clamp(input.noveltyScore ?? 75);
    const weights = tuning.weights;
    const overall = clamp(composition * weights.composition +
        clusterQuality * weights.clusterQuality +
        dependency * weights.dependency +
        deductionRhythm * weights.deductionRhythm +
        arithmeticTexture * weights.arithmeticTexture +
        clueQuality * weights.clueQuality +
        visualBalance * weights.visualBalance +
        difficultyAccuracy * weights.difficultyAccuracy +
        novelty * weights.novelty);
    return Object.freeze({
        composition,
        clusterQuality,
        dependency,
        deductionRhythm,
        arithmeticTexture,
        clueQuality,
        visualBalance,
        difficultyAccuracy,
        novelty,
        overall,
    });
}
