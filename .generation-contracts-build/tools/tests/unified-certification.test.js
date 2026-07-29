"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
function request(difficulty, seed) {
    return {
        schema: generation_1.GENERATION_SCHEMA_IDS.generationRequest,
        requestId: `cert-${difficulty}-${seed}`,
        rootSeed: seed,
        difficulty,
        generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
        candidateCount: 8,
        constraints: {},
    };
}
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    for (let index = 0; index < 6; index += 1) {
        const input = request(difficulty, `seed-${index}`);
        const composition = (0, generation_1.generateCompositionPlan)(input, index);
        const dependency = (0, generation_1.buildStructuralDependencyGraph)(input, composition);
        const filling = (0, generation_1.fillEquations)(input, composition, index);
        check(filling.ok, `${difficulty}/${index}: fill failed`);
        if (!filling.ok)
            continue;
        const clues = (0, generation_1.planClues)(input, composition, filling.plan, index);
        check(clues.ok, `${difficulty}/${index}: clues failed`);
        if (!clues.ok)
            continue;
        const candidate = {
            schema: generation_1.GENERATION_SCHEMA_IDS.puzzleCandidate,
            id: `candidate-${difficulty}-${index}`,
            request: input,
            composition,
            dependency,
            fill: filling.plan,
            clues: clues.plan,
        };
        const result = (0, generation_1.certifyCandidate)({
            candidate,
            deductionTrace: clues.trace,
            fillingDiagnostics: filling.diagnostics,
            noveltyScore: 85,
        });
        const replay = (0, generation_1.certifyCandidate)({
            candidate,
            deductionTrace: clues.trace,
            fillingDiagnostics: filling.diagnostics,
            noveltyScore: 85,
        });
        check(result.certificate.schema === generation_1.GENERATION_SCHEMA_IDS.candidateCertificate, "wrong certificate schema");
        check((0, generation_1.canonicalSerialize)(result) === (0, generation_1.canonicalSerialize)(replay), `${difficulty}/${index}: nondeterministic certificate`);
        check(Object.keys(result.scorecard).length === 10, "scorecard incomplete");
        check(Object.values(result.scorecard).every((score) => score >= 0 && score <= 100), "score outside range");
        check(result.certificate.valid === result.accepted, "acceptance mismatch");
        check(result.certificate.hardGateFailures.length === result.failures.length, "failure mismatch");
        check(Object.keys(result.certificate.fingerprints).length === 5, "fingerprints incomplete");
        check((0, generation_1.canonicalSerialize)(result.scorecard) === (0, generation_1.canonicalSerialize)((0, generation_1.scoreCandidate)({
            candidate,
            deductionTrace: clues.trace,
            fillingDiagnostics: filling.diagnostics,
            noveltyScore: 85,
        })), "score replay mismatch");
        check((0, generation_1.canonicalSerialize)(result.certificate.fingerprints) === (0, generation_1.canonicalSerialize)((0, generation_1.candidateFingerprints)(candidate)), "fingerprint replay mismatch");
        const broken = {
            ...candidate,
            clues: { ...candidate.clues, numberBank: [] },
        };
        const rejected = (0, generation_1.certifyCandidate)({ candidate: broken, deductionTrace: clues.trace });
        check(!rejected.accepted, "invalid clue plan accepted");
        check(rejected.failures.some((failure) => failure.code === "INVALID_CLUE_PLAN"), "missing clue rejection");
    }
}
console.log(`Unified certification: ${assertions}/${assertions} assertions passed.`);
