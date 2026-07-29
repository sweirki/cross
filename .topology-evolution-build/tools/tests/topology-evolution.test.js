"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const board_1 = require("../../src/game/board");
const CrossMathEngine_1 = require("../../src/engine/api/CrossMathEngine");
let assertions = 0;
function check(condition, message) {
    if (!condition)
        throw new Error(message);
    assertions += 1;
}
function equal(actual, expected, message) {
    check(actual === expected, `${message} Expected ${String(expected)}, received ${String(actual)}.`);
}
function organic(seed = 12345, equationCount = 6, width = 13, height = 13) {
    return (0, board_1.generateTopologySkeleton)({
        width,
        height,
        equationCount,
        seed,
        profile: "organic",
    });
}
function topology(seed = 12345, equationCount = 6, width = 13, height = 13) {
    return (0, board_1.materializeTopologySkeleton)(organic(seed, equationCount, width, height), (_equation, index) => ["add", "subtract", "multiply", "divide"][index % 4]);
}
const first = organic();
const second = organic();
equal(first.equations.length, 6, "Organic generation must honor equation count.");
equal((0, board_1.serializeTopologySkeleton)(first), (0, board_1.serializeTopologySkeleton)(second), "Organic generation must be deterministic.");
equal(first.equations[0]?.id, "eq-0001", "First equation ID must remain stable.");
equal(first.equations[5]?.id, "eq-0006", "Final equation ID must remain stable.");
const generatedTopology = topology();
const validation = (0, board_1.validateBoardTopology)(generatedTopology);
check(validation.valid, `Organic topology must validate: ${JSON.stringify(validation.issues)}`);
const analysis = (0, board_1.analyzeTopologyShape)(generatedTopology);
equal(analysis.equationCount, 6, "Analysis equation count mismatch.");
equal(analysis.intersectionCount, 5, "A tree skeleton must have equationCount - 1 intersections.");
check(analysis.middleIntersectionCount >= 4, "Organic layout should predominantly use middle crossings.");
equal(analysis.endpointOnlyIntersectionCount, 0, "Feasible organic layout should avoid endpoint-only crossings.");
check(analysis.branchingEquationCount >= 1, "Organic layout should contain a branching equation.");
check(analysis.boundingWidth > 0, "Bounding width must be positive.");
check(analysis.boundingHeight > 0, "Bounding height must be positive.");
equal(analysis.occupiedCellCount, generatedTopology.nodes.length, "Occupied-cell count mismatch.");
check(analysis.boundingDensity > 0 && analysis.boundingDensity <= 1, "Bounding density must be normalized.");
equal((0, board_1.serializeTopologyShapeAnalysis)(analysis), (0, board_1.serializeTopologyShapeAnalysis)((0, board_1.analyzeTopologyShape)(generatedTopology)), "Shape analysis serialization must be deterministic.");
for (const intersection of analysis.intersections) {
    check(intersection.middleConnected, `Intersection ${intersection.nodeId} should involve a middle number.`);
    check(!intersection.endpointOnly, `Intersection ${intersection.nodeId} should not be endpoint-only.`);
    equal(intersection.equationIds.length, 2, "Intersection must connect exactly two equations.");
    equal(intersection.roles.length, 2, "Intersection must expose two equation roles.");
}
const classicImplicit = (0, board_1.generateTopologySkeleton)({
    width: 9,
    height: 9,
    equationCount: 4,
    seed: 77,
});
const classicExplicit = (0, board_1.generateTopologySkeleton)({
    width: 9,
    height: 9,
    equationCount: 4,
    seed: 77,
    profile: "classic",
});
equal((0, board_1.serializeTopologySkeleton)(classicImplicit), (0, board_1.serializeTopologySkeleton)(classicExplicit), "Omitted profile must preserve classic generation.");
const differentSeed = organic(12346);
check((0, board_1.serializeTopologySkeleton)(first) !== (0, board_1.serializeTopologySkeleton)(differentSeed), "Different organic seeds should produce different layouts.");
for (const seed of [0, 1, 2, 3, 99, 1000, 0xffffffff]) {
    const candidate = topology(seed);
    const candidateValidation = (0, board_1.validateBoardTopology)(candidate);
    check(candidateValidation.valid, `Seed ${seed} produced invalid topology.`);
    const candidateAnalysis = (0, board_1.analyzeTopologyShape)(candidate);
    equal(candidateAnalysis.intersectionCount, 5, `Seed ${seed} intersection count mismatch.`);
    check(candidateAnalysis.middleIntersectionCount >= 4, `Seed ${seed} did not predominantly use middle crossings.`);
}
const twoEquation = topology(5, 2, 7, 7);
const twoAnalysis = (0, board_1.analyzeTopologyShape)(twoEquation);
equal(twoAnalysis.intersectionCount, 1, "Two equations must have one intersection.");
equal(twoAnalysis.middleIntersectionCount, 1, "Two-equation organic board should cross through a middle number.");
equal(twoAnalysis.endpointOnlyIntersectionCount, 0, "Two-equation board should not be endpoint-only.");
let invalidProfileRejected = false;
try {
    (0, board_1.generateTopologySkeleton)({
        width: 9,
        height: 9,
        equationCount: 3,
        seed: 1,
        profile: "diagonal",
    });
}
catch {
    invalidProfileRejected = true;
}
check(invalidProfileRejected, "Unknown profiles must be rejected.");
let crampedFailureIsExplicit = false;
try {
    organic(7, 20, 5, 5);
}
catch (error) {
    crampedFailureIsExplicit =
        error instanceof Error && /Unable to place/.test(error.message);
}
check(crampedFailureIsExplicit, "Impossible organic requests must fail explicitly.");
const engine = new CrossMathEngine_1.CrossMathEngine();
const generatedOrganic = engine.generate({
    seed: 2403001,
    difficulty: "medium",
    width: 9,
    height: 9,
    equationCount: 3,
    hiddenCellCount: 2,
    maximumAttempts: 16,
});
const generatedOrganicAnalysis = (0, board_1.analyzeTopologyShape)(generatedOrganic.topology);
check(generatedOrganicAnalysis.middleIntersectionCount >= 1, "Engine must use organic topology by default.");
check(generatedOrganicAnalysis.endpointOnlyIntersectionCount === 0, "Default engine topology should avoid endpoint-only crossings when feasible.");
check(engine.verify(generatedOrganic.puzzle).unique, "Organic engine puzzle must remain uniquely solvable.");
const generatedClassic = engine.generate({
    seed: 2403001,
    difficulty: "medium",
    width: 9,
    height: 9,
    equationCount: 3,
    hiddenCellCount: 2,
    maximumAttempts: 16,
    topologyProfile: "classic",
});
check((0, board_1.validateBoardTopology)(generatedClassic.topology).valid, "Classic compatibility profile must remain valid.");
check(engine.verify(generatedClassic.puzzle).unique, "Classic compatibility puzzle must remain uniquely solvable.");
console.log(`${assertions}/${assertions} topology-evolution assertions passed.`);
