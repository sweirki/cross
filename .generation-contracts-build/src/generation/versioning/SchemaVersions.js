"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMERCIAL_GENERATOR_VERSION = exports.GENERATION_SCHEMA_IDS = void 0;
exports.isSupportedGenerationSchema = isSupportedGenerationSchema;
exports.assertSupportedGenerationSchema = assertSupportedGenerationSchema;
exports.GENERATION_SCHEMA_IDS = {
    generationRequest: "crossmath.generation-request/v1",
    generationSeed: "crossmath.generation-seed/v1",
    clusterTemplate: "crossmath.cluster-template/v1",
    clusterInstance: "crossmath.cluster-instance/v1",
    compositionPlan: "crossmath.composition-plan/v1",
    dependencyGraph: "crossmath.dependency-graph/v1",
    equationFillPlan: "crossmath.equation-fill-plan/v1",
    cluePlan: "crossmath.clue-plan/v1",
    puzzleCandidate: "crossmath.puzzle-candidate/v1",
    candidateCertificate: "crossmath.candidate-certificate/v1",
    puzzleDNA: "crossmath.puzzle-dna/v1",
    candidateSearchCheckpoint: "crossmath.candidate-search-checkpoint/v1",
    generationManifest: "crossmath.generation-manifest/v1",
};
exports.COMMERCIAL_GENERATOR_VERSION = "commercial-generator/1.0.0";
const SUPPORTED = new Set(Object.values(exports.GENERATION_SCHEMA_IDS));
function isSupportedGenerationSchema(value) {
    return SUPPORTED.has(value);
}
function assertSupportedGenerationSchema(value) {
    if (!isSupportedGenerationSchema(value)) {
        throw new Error(`Unsupported generation schema: ${value}`);
    }
}
