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
        requestId: `test-${difficulty}-${seed}`,
        rootSeed: seed,
        difficulty,
        generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
        candidateCount: 10,
        constraints: {},
    };
}
check(generation_1.PRODUCTION_COMPOSITION_PROFILES.length === 6, "expected six production profiles");
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    const seenFamilies = new Set();
    const seenSerializations = new Set();
    for (let index = 0; index < 24; index += 1) {
        const input = request(difficulty, `seed-${index}`);
        const plan = (0, generation_1.generateCompositionPlan)(input, index);
        const replay = (0, generation_1.generateCompositionPlan)(input, index);
        const validation = (0, generation_1.inspectCompositionPlan)(plan);
        check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
        check((0, generation_1.canonicalSerialize)(plan) === (0, generation_1.canonicalSerialize)(replay), `${difficulty}/${index} is not deterministic`);
        check(plan.clusters.length >= 2, `${difficulty}/${index} has too few clusters`);
        check(plan.occupiedCells.length > plan.clusters.length * 5, `${difficulty}/${index} has too few cells`);
        check(plan.metrics.visualBalance >= 0 && plan.metrics.visualBalance <= 1, "invalid visual balance");
        check(plan.metrics.density > 0 && plan.metrics.density < 1, "invalid density");
        check((0, generation_1.renderCompositionAscii)(plan).includes("□"), "preview must contain number cells");
        seenFamilies.add(plan.family);
        seenSerializations.add((0, generation_1.canonicalSerialize)(plan));
    }
    check(seenFamilies.size >= 2, `${difficulty} needs family diversity`);
    check(seenSerializations.size >= 20, `${difficulty} needs deterministic variety`);
}
const bounded = request("easy", "bounded");
const boundedPlan = (0, generation_1.generateCompositionPlan)({
    ...bounded,
    constraints: { minimumRows: 40, minimumColumns: 41 },
});
check(boundedPlan.rows >= 40 && boundedPlan.columns >= 41, "minimum bounds not honored");
let maxError = "";
try {
    (0, generation_1.generateCompositionPlan)({ ...bounded, constraints: { maximumRows: 2, maximumColumns: 2 } });
}
catch (error) {
    maxError = error instanceof Error ? error.message : String(error);
}
check(/maximum/.test(maxError), "maximum bounds must reject oversized compositions");
const invalid = { ...(0, generation_1.generateCompositionPlan)(request("easy", "invalid")), rows: 1 };
check(!(0, generation_1.inspectCompositionPlan)(invalid).valid, "out-of-bounds composition must fail");
console.log(`Composition engine: ${assertions}/${assertions} assertions passed.`);
