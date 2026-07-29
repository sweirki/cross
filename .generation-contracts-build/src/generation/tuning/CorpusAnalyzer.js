"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distribution = distribution;
exports.analyzeGenerationManifest = analyzeGenerationManifest;
exports.analyzeCorpus = analyzeCorpus;
const TuningProfiles_1 = require("./TuningProfiles");
function percentile(sorted, q) {
    if (sorted.length === 0)
        return 0;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
    return sorted[index];
}
function distribution(values) {
    if (values.length === 0) {
        return Object.freeze({ count: 0, minimum: 0, p25: 0, median: 0, p75: 0, p95: 0, maximum: 0, mean: 0 });
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    return Object.freeze({
        count: sorted.length,
        minimum: sorted[0],
        p25: percentile(sorted, 0.25),
        median: percentile(sorted, 0.50),
        p75: percentile(sorted, 0.75),
        p95: percentile(sorted, 0.95),
        maximum: sorted[sorted.length - 1],
        mean: Number(mean.toFixed(3)),
    });
}
function increment(target, key) {
    target[key] = (target[key] ?? 0) + 1;
}
function analyzeGenerationManifest(manifest) {
    const scoreKeys = ["composition", "clusterQuality", "dependency", "deductionRhythm", "arithmeticTexture", "clueQuality", "visualBalance", "difficultyAccuracy", "novelty", "overall"];
    const scoreValues = Object.fromEntries(scoreKeys.map((key) => [key, []]));
    const dispositions = {};
    const compositionFamilies = {};
    const dependencyProfiles = {};
    const rejectionReasons = {};
    for (const record of manifest.records) {
        increment(dispositions, record.disposition);
        if (record.scorecard) {
            for (const key of scoreKeys)
                scoreValues[key].push(record.scorecard[key]);
        }
        if (record.candidate)
            increment(compositionFamilies, record.candidate.composition.family);
        if (record.dna)
            increment(dependencyProfiles, record.dna.dependencyProfile);
        if (record.rejectionReason) {
            for (const reason of record.rejectionReason.split(","))
                increment(rejectionReasons, reason.trim());
        }
    }
    const rate = manifest.generatedCount === 0 ? 0 : manifest.acceptedCount / manifest.generatedCount;
    const profile = (0, TuningProfiles_1.productionTuningProfile)(manifest.request.difficulty);
    return Object.freeze({
        difficulty: manifest.request.difficulty,
        generated: manifest.generatedCount,
        accepted: manifest.acceptedCount,
        acceptanceRate: Number(rate.toFixed(6)),
        acceptanceWithinTarget: rate >= profile.targetAcceptanceRate[0] && rate <= profile.targetAcceptanceRate[1],
        scores: Object.freeze(Object.fromEntries(scoreKeys.map((key) => [key, distribution(scoreValues[key])]))),
        dispositions: Object.freeze(dispositions),
        compositionFamilies: Object.freeze(compositionFamilies),
        dependencyProfiles: Object.freeze(dependencyProfiles),
        rejectionReasons: Object.freeze(rejectionReasons),
    });
}
function analyzeCorpus(manifests) {
    return Object.freeze(manifests.map(analyzeGenerationManifest));
}
