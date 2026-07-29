
import {
  certifyReleaseCandidate,
  evaluatePerformance,
  fingerprint,
  percentile95,
  validateCampaignIntegrity,
  validateCatalogIntegrity,
} from "../../src/generation";
import type {
  CertifiedCampaign,
  CertifiedPuzzleCatalog,
  PerformanceBudget,
} from "../../src/generation";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}

check(percentile95([1, 2, 3, 4, 5]) === 5, "p95 small sample");
check(percentile95([10, 1, 2, 3, 4, 5, 6, 7, 8, 9]) === 10, "p95 sorting");
let invalidPercentileRejected = false;
try { percentile95([]); } catch { invalidPercentileRejected = true; }
check(invalidPercentileRejected, "empty percentile rejected");

const budget: PerformanceBudget = {
  candidateGenerationP95Ms: 100,
  certificationP95Ms: 20,
  replayP95Ms: 10,
  maximumSerializedCatalogBytes: 1000,
};
const passingPerformance = evaluatePerformance({
  candidateGenerationMs: [70, 80, 90],
  certificationMs: [10, 12, 15],
  replayMs: [2, 3, 4],
  serializedCatalogBytes: 800,
}, budget);
check(passingPerformance.passed, "passing performance");
check(passingPerformance.failures.length === 0, "no passing failures");

const failingPerformance = evaluatePerformance({
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
  fingerprint: fingerprint(catalogBase),
} as unknown as CertifiedPuzzleCatalog;
check(validateCatalogIntegrity(catalog).valid, "catalog integrity");

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
  fingerprint: fingerprint(campaignBase),
} as unknown as CertifiedCampaign;
check(validateCampaignIntegrity(campaign, catalog).valid, "campaign integrity");

const brokenCatalog = {
  ...catalog,
  fingerprint: "tampered",
} as CertifiedPuzzleCatalog;
check(!validateCatalogIntegrity(brokenCatalog).valid, "tampered catalog rejected");

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
  fingerprint: fingerprint(brokenCampaignBase),
} as unknown as CertifiedCampaign;
const brokenCampaignResult = validateCampaignIntegrity(brokenCampaign, catalog);
check(!brokenCampaignResult.valid, "broken campaign rejected");
check(brokenCampaignResult.failures.some((failure) => failure.startsWith("missing-puzzle")), "missing puzzle found");
check(brokenCampaignResult.failures.some((failure) => failure.startsWith("unlock-chain")), "broken unlock found");

const release = certifyReleaseCandidate({
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
check(certifyReleaseCandidate({
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

const blocked = certifyReleaseCandidate({
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
