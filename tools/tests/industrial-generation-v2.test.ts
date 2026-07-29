import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  canonicalSerialize,
  createSearchCheckpoint,
  generateCandidate,
  normalizeSearchOptions,
  runCandidateSearch,
} from "../../src/generation";
import type { GenerationRequest } from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string, count = 12): GenerationRequest {
  return Object.freeze({
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `industrial-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: count,
    constraints: {},
  });
}

for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  for (let seedIndex = 0; seedIndex < 1; seedIndex += 1) {
    const input = request(difficulty, `seed-${seedIndex}`, 2);
    const options = { poolSize: 2, acceptanceLimit: 1, maximumPerComposition: 1, maximumPerDependency: 2 };
    const first = runCandidateSearch(input, options);
    const replay = runCandidateSearch(input, options);

    check(first.manifest.schema === GENERATION_SCHEMA_IDS.generationManifest, "manifest schema mismatch");
    check(first.checkpoint.schema === GENERATION_SCHEMA_IDS.candidateSearchCheckpoint, "checkpoint schema mismatch");
    check(first.manifest.generatedCount === 2, "wrong generated count");
    check(first.manifest.records.length === 2, "record count mismatch");
    check(first.manifest.acceptedCount <= 1, "acceptance limit exceeded");
    check(first.manifest.rejectedCount + first.manifest.acceptedCount === 2, "manifest totals mismatch");
    check(first.checkpoint.nextCandidateIndex === 2, "checkpoint index mismatch");
    check(canonicalSerialize(first) === canonicalSerialize(replay), "search is nondeterministic");
    check(first.manifest.fingerprint === replay.manifest.fingerprint, "manifest fingerprint mismatch");
    check(Object.values(first.manifest.rejectionCounts).reduce((sum, value) => sum + value, 0) === 2, "rejection counts mismatch");
    check(first.manifest.records.every((record) => record.failures !== undefined), "missing failure list");

    const acceptedComposition = new Set<string>();
    for (const accepted of first.manifest.accepted) {
      check(accepted.disposition === "accepted", "accepted list has non-accepted record");
      check(accepted.rank !== undefined, "accepted record missing rank");
      check(accepted.certificate?.valid === true, "accepted record lacks valid certificate");
      check(accepted.dna?.stageSeeds.candidate !== undefined, "accepted record lacks puzzle DNA");
      const composition = accepted.certificate?.fingerprints.composition;
      check(composition !== undefined, "accepted record lacks composition fingerprint");
      check(!acceptedComposition.has(composition), "composition diversity limit violated");
      acceptedComposition.add(composition);
    }

    const normalized = normalizeSearchOptions(input, options);
    const prefix = Array.from({ length: 1 }, (_, index) => generateCandidate(input, index));
    const partial = createSearchCheckpoint(input, normalized, prefix);
    const resumed = runCandidateSearch(input, options, partial);
    check(canonicalSerialize(first) === canonicalSerialize(resumed), "checkpoint resume changed output");

    let mismatchRejected = false;
    try {
      runCandidateSearch({ ...input, rootSeed: "other" }, options, partial);
    } catch {
      mismatchRejected = true;
    }
    check(mismatchRejected, "checkpoint request mismatch accepted");
  }
}

const invalidRequest = request("easy", "invalid", 2);
let invalidOptionsRejected = false;
try {
  runCandidateSearch(invalidRequest, { poolSize: 2, acceptanceLimit: 3 });
} catch {
  invalidOptionsRejected = true;
}
check(invalidOptionsRejected, "invalid acceptance limit accepted");

console.log(`Industrial generation v2: ${assertions}/${assertions} assertions passed.`);
