"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_1 = require("../../src/generation");
let assertions = 0;
function assert(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
function assertEqual(actual, expected, message) {
    assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}
function assertThrows(action, message) {
    let threw = false;
    try {
        action();
    }
    catch {
        threw = true;
    }
    assert(threw, message);
}
const request = {
    schema: generation_1.GENERATION_SCHEMA_IDS.generationRequest,
    requestId: "request-1",
    rootSeed: "commercial-seed",
    difficulty: "hard",
    generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 32,
    constraints: {
        minimumRows: 9,
        maximumRows: 17,
        minimumColumns: 9,
        maximumColumns: 17,
        allowedOperators: ["+", "-", "×", "÷"],
    },
};
(0, generation_1.validateGenerationRequest)(request);
assertEqual(request.schema, "crossmath.generation-request/v1", "request schema is versioned");
const rootA = (0, generation_1.createRootGenerationSeed)("seed-A");
const rootARepeat = (0, generation_1.createRootGenerationSeed)("seed-A");
const rootB = (0, generation_1.createRootGenerationSeed)("seed-B");
assertEqual(rootA.value, rootARepeat.value, "same root seed is deterministic");
assert(rootA.value !== rootB.value, "different root seeds diverge");
const childA = (0, generation_1.deriveGenerationSeed)(rootA, "composition");
const childARepeat = (0, generation_1.deriveGenerationSeed)(rootARepeat, "composition");
const childB = (0, generation_1.deriveGenerationSeed)(rootA, "dependency");
assertEqual(childA.value, childARepeat.value, "same path is deterministic");
assert(childA.value !== childB.value, "different labels produce different seeds");
assertEqual((0, generation_1.replaySeed)(childA).value, childA.value, "seed replay reproduces value");
const stageSeedsA = (0, generation_1.allocateStageSeeds)("seed-A", 7);
const stageSeedsARepeat = (0, generation_1.allocateStageSeeds)("seed-A", 7);
const stageSeedsB = (0, generation_1.allocateStageSeeds)("seed-A", 8);
assertEqual((0, generation_1.canonicalSerialize)(stageSeedsA), (0, generation_1.canonicalSerialize)(stageSeedsARepeat), "same candidate seed allocation is byte-identical");
assert(stageSeedsA.composition.value !== stageSeedsA.dependency.value, "stages receive isolated seeds");
assert(stageSeedsA.composition.value !== stageSeedsB.composition.value, "candidate index isolates stage streams");
const reorderedA = { beta: 2, alpha: { y: 2, x: 1 } };
const reorderedB = { alpha: { x: 1, y: 2 }, beta: 2 };
assertEqual((0, generation_1.canonicalSerialize)(reorderedA), (0, generation_1.canonicalSerialize)(reorderedB), "canonical serialization sorts object keys recursively");
assertThrows(() => (0, generation_1.canonicalSerialize)({ invalid: undefined }), "canonical serialization rejects undefined");
const composition = {
    schema: generation_1.GENERATION_SCHEMA_IDS.compositionPlan,
    id: "composition-1",
    family: "balanced-asymmetric",
    rows: 9,
    columns: 9,
    clusters: [],
    occupiedCells: [
        {
            cellId: "cell-1",
            position: { row: 1, col: 1 },
            kind: "number",
            clusterIds: ["cluster-1"],
        },
    ],
    metrics: { visualBalance: 0.91 },
};
(0, generation_1.validateCompositionPlan)(composition);
assertThrows(() => (0, generation_1.validateCompositionPlan)({
    ...composition,
    occupiedCells: [
        ...composition.occupiedCells,
        {
            cellId: "cell-2",
            position: { row: 1, col: 1 },
            kind: "number",
            clusterIds: ["cluster-2"],
        },
    ],
}), "composition validation rejects duplicate positions");
assertEqual(generation_1.DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline, false, "new pipeline remains disabled");
assertEqual(generation_1.DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationContracts, true, "new contracts are available independently");
console.log(`${assertions}/${assertions} commercial generation contract assertions passed.`);
