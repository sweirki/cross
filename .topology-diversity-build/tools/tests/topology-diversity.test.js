"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("../../src/game/board");
const topology_1 = require("../../src/game/topology");
let assertions = 0;
function check(condition, message) {
    if (!condition)
        throw new Error(message);
    assertions += 1;
}
function equal(actual, expected, message) {
    check(actual === expected, `${message} Expected ${String(expected)}, received ${String(actual)}.`);
}
function topology(seed, archetype) {
    return (0, board_1.materializeTopologySkeleton)((0, board_1.generateTopologySkeleton)({
        seed,
        profile: "organic",
        archetype,
        equationCount: 6,
        width: 13,
        height: 13,
    }), (_equation, index) => ["add", "subtract", "multiply", "divide"][index % 4]);
}
for (const seed of [0, 1, 2, 99, 100000, 0xffffffff]) {
    equal((0, board_1.selectOrganicTopologyArchetype)(seed), (0, board_1.selectOrganicTopologyArchetype)(seed), `Seed ${seed} archetype selection must be deterministic.`);
}
const selectedFamilies = new Set(Array.from({ length: 200 }, (_, index) => (0, board_1.selectOrganicTopologyArchetype)(100000 + index)));
equal(selectedFamilies.size, board_1.ORGANIC_TOPOLOGY_ARCHETYPES.length, "Seeded selection must exercise every organic archetype.");
for (const archetype of board_1.ORGANIC_TOPOLOGY_ARCHETYPES) {
    const first = (0, board_1.generateTopologySkeleton)({
        seed: 424242,
        profile: "organic",
        archetype,
        equationCount: 6,
        width: 13,
        height: 13,
    });
    const second = (0, board_1.generateTopologySkeleton)({
        seed: 424242,
        profile: "organic",
        archetype,
        equationCount: 6,
        width: 13,
        height: 13,
    });
    equal((0, board_1.serializeTopologySkeleton)(first), (0, board_1.serializeTopologySkeleton)(second), `${archetype} generation must be deterministic.`);
    check((0, board_1.validateBoardTopology)(topology(424242, archetype)).valid, `${archetype} topology must validate.`);
}
const samples = Array.from({ length: 500 }, (_, index) => {
    const seed = 100000 + index;
    return {
        seed,
        profile: "organic",
        topology: topology(seed),
    };
});
const report = (0, topology_1.createTopologyBatchReport)(samples);
const reversed = (0, topology_1.createTopologyBatchReport)([...samples].reverse());
equal(report.summary.sampleCount, 500, "Batch sample count mismatch.");
check(report.summary.uniqueMetricSignatures >= 5, "Organic generation must produce several structural metric signatures.");
check(report.summary.scoreStandardDeviation >= 5, "Organic quality scores must have a meaningful distribution.");
check(report.summary.minimumScore < report.summary.maximumScore, "Organic score range must not collapse to a single value.");
check(Object.values(report.summary.archetypeCounts).every((count) => count > 0), "Every organic archetype must occur in the deterministic sample.");
check(report.summary.averageMiddleIntersectionRatio >= 0.8, "Diversity must preserve predominantly middle-connected crossings.");
check(report.summary.averageEndpointIntersectionRatio <= 0.2, "Diversity must not reintroduce endpoint-only layouts.");
equal((0, topology_1.serializeTopologyBatchReport)(report), (0, topology_1.serializeTopologyBatchReport)(reversed), "Diversity reports must be stable across input order.");
let invalidArchetypeRejected = false;
try {
    (0, board_1.generateTopologySkeleton)({
        seed: 1,
        profile: "organic",
        archetype: "ring",
        equationCount: 6,
        width: 13,
        height: 13,
    });
}
catch {
    invalidArchetypeRejected = true;
}
check(invalidArchetypeRejected, "Unknown organic archetypes must be rejected.");
console.log(`${assertions}/${assertions} topology-diversity assertions passed.`);
