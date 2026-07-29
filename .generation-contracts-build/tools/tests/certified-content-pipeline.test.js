"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
const request = {
    schema: generation_1.GENERATION_SCHEMA_IDS.generationRequest,
    requestId: "content-pipeline-test",
    rootSeed: "content-seed",
    difficulty: "easy",
    generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 1,
    constraints: {},
};
const generated = (0, generation_1.generateCandidate)(request, 0);
check(generated.candidate !== undefined, "candidate generation failed");
const candidate = generated.candidate;
const fingerprints = candidate.dna.fingerprints;
const certificate = {
    schema: generation_1.GENERATION_SCHEMA_IDS.candidateCertificate,
    valid: true,
    certifiedDifficulty: "easy",
    hardGateFailures: [],
    scores: { overall: 90 },
    fingerprints,
};
const scorecard = {
    composition: 90,
    clusterQuality: 90,
    dependency: 90,
    deductionRhythm: 90,
    arithmeticTexture: 90,
    clueQuality: 90,
    visualBalance: 90,
    difficultyAccuracy: 90,
    novelty: 90,
    overall: 90,
};
const certifiedCandidate = { ...candidate, certificate };
const accepted = {
    index: 0,
    rank: 1,
    disposition: "accepted",
    candidate: certifiedCandidate,
    certificate,
    dna: candidate.dna,
    scorecard,
    failures: [],
    noveltyScore: 90,
};
const manifest = {
    schema: generation_1.GENERATION_SCHEMA_IDS.generationManifest,
    request,
    options: {
        poolSize: 1,
        acceptanceLimit: 1,
        maximumPerComposition: 1,
        maximumPerDependency: 1,
    },
    generatedCount: 1,
    certifiedCount: 1,
    acceptedCount: 1,
    rejectedCount: 0,
    records: [accepted],
    accepted: [accepted],
    rejectionCounts: {
        accepted: 1,
        "hard-gate-rejected": 0,
        "duplicate-rejected": 0,
        "diversity-rejected": 0,
        "ranked-out": 0,
        "generation-failed": 0,
    },
    fingerprint: "test-manifest",
};
const first = (0, generation_1.buildCertifiedCatalog)(manifest, "catalog-test");
const replay = (0, generation_1.buildCertifiedCatalog)(manifest, "catalog-test");
check((0, generation_1.canonicalSerialize)(first) === (0, generation_1.canonicalSerialize)(replay), "catalog generation is nondeterministic");
check(first.schemaVersion === 2, "catalog schema mismatch");
check(first.puzzles.length === 1, "catalog puzzle count mismatch");
check(first.puzzles[0].puzzle.id === first.puzzles[0].id, "runtime puzzle id mismatch");
check(first.puzzles[0].certificate.valid, "uncertified puzzle entered catalog");
check(first.puzzles[0].tags.some((tag) => tag === "difficulty:easy"), "difficulty tag missing");
check(first.puzzles[0].estimatedSolveSeconds >= 30, "solve estimate invalid");
check((0, generation_1.validateCertifiedCatalog)(first).length === 0, "valid catalog rejected");
const campaign = (0, generation_1.buildCertifiedCampaign)(first, "campaign-test", 1);
check(campaign.schemaVersion === 2, "campaign schema mismatch");
check(campaign.chapters.length === 1, "campaign chapter count mismatch");
check(campaign.chapters[0].levels[0].puzzleId === first.puzzles[0].id, "campaign puzzle mismatch");
const scheduleA = (0, generation_1.buildDailySchedule)(first, ["2026-08-01", "2026-08-02"]);
const scheduleB = (0, generation_1.buildDailySchedule)(first, ["2026-08-02", "2026-08-01"]);
check((0, generation_1.canonicalSerialize)(scheduleA) === (0, generation_1.canonicalSerialize)(scheduleB), "daily schedule is nondeterministic");
check(Object.values(scheduleA).every((id) => id === first.puzzles[0].id), "daily schedule referenced unknown puzzle");
let emptyRejected = false;
try {
    (0, generation_1.buildCertifiedCatalog)({ ...manifest, accepted: [], acceptedCount: 0 });
}
catch {
    emptyRejected = true;
}
check(emptyRejected, "empty manifest was accepted");
console.log(`Certified content pipeline: ${assertions}/${assertions} assertions passed.`);
