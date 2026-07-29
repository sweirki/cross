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
        requestId: `dependency-${difficulty}-${seed}`,
        rootSeed: seed,
        difficulty,
        generatorVersion: generation_1.COMMERCIAL_GENERATOR_VERSION,
        candidateCount: 8,
        constraints: {},
    };
}
for (const difficulty of ["easy", "medium", "hard", "expert"]) {
    const profile = (0, generation_1.dependencyProfileForDifficulty)(difficulty);
    check(profile.difficulty === difficulty, `${difficulty}: profile mismatch`);
    const fingerprints = new Set();
    for (let index = 0; index < 16; index += 1) {
        const input = request(difficulty, `seed-${index}`);
        const composition = (0, generation_1.generateCompositionPlan)(input, index);
        const graph = (0, generation_1.buildStructuralDependencyGraph)(input, composition);
        const replay = (0, generation_1.buildStructuralDependencyGraph)(input, composition);
        const validation = (0, generation_1.validateDependencyGraph)(graph);
        const metrics = (0, generation_1.calculateDependencyMetrics)(graph);
        check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
        check((0, generation_1.canonicalSerialize)(graph) === (0, generation_1.canonicalSerialize)(replay), `${difficulty}/${index}: nondeterministic`);
        check(graph.schema === generation_1.GENERATION_SCHEMA_IDS.dependencyGraph, "wrong schema");
        check(metrics.clusterCount === composition.clusters.length, "cluster node count mismatch");
        check(metrics.equationCount > metrics.clusterCount, "equation graph is unexpectedly sparse");
        check(metrics.numberCellCount > metrics.equationCount, "number node count is unexpectedly low");
        check(metrics.edgeCount === graph.edges.length, "edge metric mismatch");
        check(metrics.componentCount === composition.clusters.length, "cluster components must remain independent");
        check(metrics.longestPath >= 3, "dependency paths are too shallow");
        check(metrics.averageDegree > 1, "average degree is too low");
        check(metrics.maximumDegree >= 3, "maximum degree is too low");
        check(metrics.articulationPointCount > 0, "expected articulation points");
        check((0, generation_1.renderDependencyGraphAsText)(graph).includes("shares-value"), "preview lacks value dependencies");
        check(Object.isFrozen(graph), "graph must be immutable");
        fingerprints.add((0, generation_1.canonicalSerialize)(graph));
    }
    check(fingerprints.size >= 14, `${difficulty}: insufficient graph diversity`);
}
const input = request("medium", "invalid");
const composition = (0, generation_1.generateCompositionPlan)(input);
const valid = (0, generation_1.buildStructuralDependencyGraph)(input, composition);
const invalid = {
    ...valid,
    edges: [...valid.edges, {
            id: "invalid-edge",
            from: valid.nodes[0].id,
            to: "missing-node",
            kind: "shares-value",
            directed: false,
        }],
};
check(!(0, generation_1.validateDependencyGraph)(invalid).valid, "missing-node edge must be rejected");
console.log(`Structural dependency graph: ${assertions}/${assertions} assertions passed.`);
