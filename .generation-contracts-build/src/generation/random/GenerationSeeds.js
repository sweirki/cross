"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRootGenerationSeed = createRootGenerationSeed;
exports.deriveGenerationSeed = deriveGenerationSeed;
exports.allocateStageSeeds = allocateStageSeeds;
exports.replaySeed = replaySeed;
const DeterministicRandom_1 = require("../../engine/random/DeterministicRandom");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const SEED_DOMAIN = "crossmath-commercial-generation/v1";
function normalizeRootSeed(rootSeed) {
    const normalized = String(rootSeed);
    if (normalized.length === 0)
        throw new Error("rootSeed must not be empty.");
    return normalized;
}
function createRootGenerationSeed(rootSeed) {
    const normalized = normalizeRootSeed(rootSeed);
    return {
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.generationSeed,
        rootSeed: normalized,
        namespace: SEED_DOMAIN,
        value: (0, DeterministicRandom_1.hashSeed)(`${SEED_DOMAIN}:${normalized}`),
        path: [],
    };
}
function deriveGenerationSeed(parent, label) {
    const normalizedLabel = String(label);
    if (normalizedLabel.length === 0)
        throw new Error("seed label must not be empty.");
    const path = [...parent.path, normalizedLabel];
    return {
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.generationSeed,
        rootSeed: parent.rootSeed,
        namespace: parent.namespace,
        value: (0, DeterministicRandom_1.hashSeed)(`${parent.namespace}:${parent.rootSeed}:${path.join("/")}`),
        path,
    };
}
function allocateStageSeeds(rootSeed, candidateIndex = 0) {
    if (!Number.isInteger(candidateIndex) || candidateIndex < 0) {
        throw new Error("candidateIndex must be a non-negative integer.");
    }
    const candidateRoot = deriveGenerationSeed(createRootGenerationSeed(rootSeed), `candidate:${candidateIndex}`);
    const stages = [
        "composition", "cluster-selection", "placement", "dependency", "operator",
        "numeric", "clue", "candidate", "certification",
    ];
    return Object.freeze(Object.fromEntries(stages.map((stage) => [stage, Object.freeze(deriveGenerationSeed(candidateRoot, stage))])));
}
function replaySeed(seed) {
    let current = createRootGenerationSeed(seed.rootSeed);
    for (const segment of seed.path)
        current = deriveGenerationSeed(current, segment);
    if (current.namespace !== seed.namespace || current.value !== seed.value) {
        throw new Error("Generation seed replay mismatch.");
    }
    return current;
}
