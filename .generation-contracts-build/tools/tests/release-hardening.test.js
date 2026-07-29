"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
check((0, generation_1.percentile95)([1, 2, 3, 4, 5]) === 5, "p95 small sample");
check((0, generation_1.percentile95)([10, 1, 2, 3, 4, 5, 6, 7, 8, 9]) === 10, "p95 sorting");
let invalidPercentileRejected = false;
try {
    (0, generation_1.percentile95)([]);
}
catch {
    invalidPercentileRejected = true;
}
check(invalidPercentileRejected, "empty percentile rejected");
const budget = {
    candidateGenerationP95Ms: 100,
    certificationP95Ms: 20,
    replayP95Ms: 10,
    maximumSerializedCatalogBytes: 1000,
};
const passingPerformance = (0, generation_1.evaluatePerformance)({
    candidateGenerationMs: [70, 80, 90],
    certificationMs: [10, 12, 15],
    replayMs: [2, 3, 4],
    serializedCatalogBytes: 800,
}, budget);
check(passingPerformance.passed, "passing performance");
check(passingPerformance.failures.length === 0, "no passing failures");
const failingPerformance = (0, generation_1.evaluatePerformance)({
    candidateGenerationMs: [101, 120],
    certificationMs: [21],
    replayMs: [11],
    serializedCatalogBytes: 1001,
}, budget);
check(!failingPerformance.passed, "failing performance");
check(failingPerformance.failures.length === 4, "all budgets enforced");
check(failingPerformance.failures.includes("catalog-size"), "catalog size failure");
const puzzleRecord = {
    schemaVersion: 1,
    id: "catalog:puzzle:0001",
    puzzle: {
        schemaVersion: 1,
        id: "catalog:puzzle:0001",
        difficulty: "easy",
        width: 1,
        height: 1,
        cells: [],
        equations: [],
        numberBank: [],
    },
    certificate: { valid: true },
    dna: {},
    scorecard: { overall: 90 },
    tags: ["difficulty:easy"],
    estimatedSolveSeconds: 30,
};
const catalogBase = {
    schemaVersion: 2,
    id: "catalog",
    generatorVersion: "commercial-v1",
    createdFromSeed: "seed",
    puzzles: [puzzleRecord],
};
const catalog = {
    ...catalogBase,
    fingerprint: (0, generation_1.fingerprint)(catalogBase),
};
check((0, generation_1.validateCatalogIntegrity)(catalog).valid, "catalog integrity");
const campaignBase = {
    schemaVersion: 2,
    id: "campaign",
    catalogId: "catalog",
    chapters: [{
            id: "chapter-1",
            title: "Chapter 1",
            levels: [{
                    id: "level-1",
                    puzzleId: "catalog:puzzle:0001",
                    difficulty: "easy",
                }],
        }],
};
const campaign = {
    ...campaignBase,
    fingerprint: (0, generation_1.fingerprint)(campaignBase),
};
check((0, generation_1.validateCampaignIntegrity)(campaign, catalog).valid, "campaign integrity");
const brokenCatalog = {
    ...catalog,
    fingerprint: "tampered",
};
check(!(0, generation_1.validateCatalogIntegrity)(brokenCatalog).valid, "tampered catalog rejected");
const brokenCampaignBase = {
    ...campaignBase,
    chapters: [{
            id: "chapter-1",
            title: "Chapter 1",
            levels: [{
                    id: "level-1",
                    puzzleId: "missing",
                    difficulty: "easy",
                    unlockAfterLevelId: "wrong",
                }],
        }],
};
const brokenCampaign = {
    ...brokenCampaignBase,
    fingerprint: (0, generation_1.fingerprint)(brokenCampaignBase),
};
const brokenCampaignResult = (0, generation_1.validateCampaignIntegrity)(brokenCampaign, catalog);
check(!brokenCampaignResult.valid, "broken campaign rejected");
check(brokenCampaignResult.failures.some((failure) => failure.startsWith("missing-puzzle")), "missing puzzle found");
check(brokenCampaignResult.failures.some((failure) => failure.startsWith("unlock-chain")), "broken unlock found");
const release = (0, generation_1.certifyReleaseCandidate)({
    releaseId: "rc-1",
    generatorVersion: "commercial-v1",
    catalogValid: true,
    campaignValid: true,
    saveMigrationValid: true,
    replayDeterministic: true,
    offlineReady: true,
    accessibilityReviewed: true,
    privacyReviewed: true,
    crashAuditPassed: true,
    androidBuildStatus: "passed",
    iosBuildStatus: "passed",
    performance: passingPerformance,
});
check(release.passed, "release passes");
check(release.checks.length === 11, "release check count");
check(release.fingerprint.length > 0, "release fingerprint");
check((0, generation_1.certifyReleaseCandidate)({
    releaseId: "rc-1",
    generatorVersion: "commercial-v1",
    catalogValid: true,
    campaignValid: true,
    saveMigrationValid: true,
    replayDeterministic: true,
    offlineReady: true,
    accessibilityReviewed: true,
    privacyReviewed: true,
    crashAuditPassed: true,
    androidBuildStatus: "passed",
    iosBuildStatus: "passed",
    performance: passingPerformance,
}).fingerprint === release.fingerprint, "release deterministic");
const blocked = (0, generation_1.certifyReleaseCandidate)({
    releaseId: "rc-2",
    generatorVersion: "commercial-v1",
    catalogValid: true,
    campaignValid: true,
    saveMigrationValid: true,
    replayDeterministic: true,
    offlineReady: true,
    accessibilityReviewed: false,
    privacyReviewed: true,
    crashAuditPassed: true,
    androidBuildStatus: "not-run",
    iosBuildStatus: "not-run",
    performance: passingPerformance,
});
check(!blocked.passed, "not-run builds block release");
check(blocked.checks.filter((item) => item.status !== "passed").length === 3, "blocked check count");
console.log(`Release hardening tests passed: ${assertions}/${assertions}`);
