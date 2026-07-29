"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
function request(difficulty, seed, count = 12) {
    return Object.freeze({
        schema: generation_1.GENERATION_SCHEMA_IDS.generationRequest,
        requestId: `industrial-${difficulty}-${seed}`,
        rootSeed: seed,
        difficulty,
        generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
        candidateCount: count,
        constraints: {},
    });
}
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    for (let seedIndex = 0; seedIndex < 1; seedIndex += 1) {
        const input = request(difficulty, `seed-${seedIndex}`, 2);
        const options = { poolSize: 2, acceptanceLimit: 1, maximumPerComposition: 1, maximumPerDependency: 2 };
        const first = (0, generation_1.runCandidateSearch)(input, options);
        const replay = (0, generation_1.runCandidateSearch)(input, options);
        check(first.manifest.schema === generation_1.GENERATION_SCHEMA_IDS.generationManifest, "manifest schema mismatch");
        check(first.checkpoint.schema === generation_1.GENERATION_SCHEMA_IDS.candidateSearchCheckpoint, "checkpoint schema mismatch");
        check(first.manifest.generatedCount === 2, "wrong generated count");
        check(first.manifest.records.length === 2, "record count mismatch");
        check(first.manifest.acceptedCount <= 1, "acceptance limit exceeded");
        check(first.manifest.rejectedCount + first.manifest.acceptedCount === 2, "manifest totals mismatch");
        check(first.checkpoint.nextCandidateIndex === 2, "checkpoint index mismatch");
        check((0, generation_1.canonicalSerialize)(first) === (0, generation_1.canonicalSerialize)(replay), "search is nondeterministic");
        check(first.manifest.fingerprint === replay.manifest.fingerprint, "manifest fingerprint mismatch");
        check(Object.values(first.manifest.rejectionCounts).reduce((sum, value) => sum + value, 0) === 2, "rejection counts mismatch");
        check(first.manifest.records.every((record) => record.failures !== undefined), "missing failure list");
        const acceptedComposition = new Set();
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
        const normalized = (0, generation_1.normalizeSearchOptions)(input, options);
        const prefix = Array.from({ length: 1 }, (_, index) => (0, generation_1.generateCandidate)(input, index));
        const partial = (0, generation_1.createSearchCheckpoint)(input, normalized, prefix);
        const resumed = (0, generation_1.runCandidateSearch)(input, options, partial);
        check((0, generation_1.canonicalSerialize)(first) === (0, generation_1.canonicalSerialize)(resumed), "checkpoint resume changed output");
        let mismatchRejected = false;
        try {
            (0, generation_1.runCandidateSearch)({ ...input, rootSeed: "other" }, options, partial);
        }
        catch {
            mismatchRejected = true;
        }
        check(mismatchRejected, "checkpoint request mismatch accepted");
    }
}
const invalidRequest = request("easy", "invalid", 2);
let invalidOptionsRejected = false;
try {
    (0, generation_1.runCandidateSearch)(invalidRequest, { poolSize: 2, acceptanceLimit: 3 });
}
catch {
    invalidOptionsRejected = true;
}
check(invalidOptionsRejected, "invalid acceptance limit accepted");
console.log(`Industrial generation v2: ${assertions}/${assertions} assertions passed.`);
