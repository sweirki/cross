"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
function request(difficulty, seed, allowedOperators) {
    return {
        schema: generation_1.GENERATION_SCHEMA_IDS.generationRequest,
        requestId: `fill-${difficulty}-${seed}`,
        rootSeed: seed,
        difficulty,
        generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
        candidateCount: 8,
        constraints: allowedOperators ? { allowedOperators } : {},
    };
}
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    const profile = (0, generation_1.arithmeticProfileForDifficulty)(difficulty);
    check(profile.difficulty === difficulty, `${difficulty}: profile mismatch`);
    check(profile.maximumSearchNodes > 0, `${difficulty}: invalid budget`);
    const fingerprints = new Set();
    for (let index = 0; index < 8; index += 1) {
        const input = request(difficulty, `seed-${index}`);
        const composition = (0, generation_1.generateCompositionPlan)(input, index);
        const result = (0, generation_1.fillEquations)(input, composition, index);
        check(result.ok, `${difficulty}/${index}: filling failed: ${result.ok ? "" : result.message}`);
        if (!result.ok)
            continue;
        const replay = (0, generation_1.fillEquations)(input, composition, index);
        check(replay.ok, `${difficulty}/${index}: replay failed`);
        if (!replay.ok)
            continue;
        check((0, generation_1.canonicalSerialize)(result.plan) === (0, generation_1.canonicalSerialize)(replay.plan), `${difficulty}/${index}: nondeterministic plan`);
        check((0, generation_1.canonicalSerialize)(result.diagnostics) === (0, generation_1.canonicalSerialize)(replay.diagnostics), `${difficulty}/${index}: nondeterministic diagnostics`);
        const validation = (0, generation_1.validateEquationFillPlan)(difficulty, composition, result.plan);
        check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
        check(result.plan.schema === generation_1.GENERATION_SCHEMA_IDS.equationFillPlan, "wrong schema");
        check(Object.keys(result.plan.values).length === composition.occupiedCells.filter((cell) => cell.kind === "number").length, "number-cell coverage mismatch");
        check(Object.keys(result.plan.operators).length > 0, "operator map is empty");
        check(result.diagnostics.searchNodes > 0, "search did not run");
        check(result.diagnostics.candidateTriples > 0, "no candidate triples were considered");
        check(result.diagnostics.trivialEquationRatio === 0, "trivial arithmetic survived");
        fingerprints.add((0, generation_1.canonicalSerialize)(result.plan));
    }
    check(fingerprints.size >= 7, `${difficulty}: insufficient arithmetic diversity`);
}
const impossible = request("easy", "operator-conflict", ["×"]);
const impossibleComposition = (0, generation_1.generateCompositionPlan)(impossible);
const rejected = (0, generation_1.fillEquations)(impossible, impossibleComposition);
check(!rejected.ok && rejected.code === "NO_ALLOWED_OPERATORS", "operator conflict must be rejected");
const constrained = request("hard", "division-only", ["÷"]);
const constrainedComposition = (0, generation_1.generateCompositionPlan)(constrained);
const constrainedResult = (0, generation_1.fillEquations)(constrained, constrainedComposition);
check(constrainedResult.ok, "division-only hard fill should succeed");
if (constrainedResult.ok) {
    check(Object.values(constrainedResult.plan.operators).every((operator) => operator === "÷"), "operator constraint was ignored");
    check((0, generation_1.validateEquationFillPlan)("hard", constrainedComposition, constrainedResult.plan).valid, "constrained plan is invalid");
}
console.log(`Equation filling v2: ${assertions}/${assertions} assertions passed.`);
