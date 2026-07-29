"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSearchOptions = normalizeSearchOptions;
exports.requestFingerprint = requestFingerprint;
exports.optionsFingerprint = optionsFingerprint;
exports.createSearchCheckpoint = createSearchCheckpoint;
exports.validateSearchCheckpoint = validateSearchCheckpoint;
const CanonicalSerialization_1 = require("../versioning/CanonicalSerialization");
const Fingerprinting_1 = require("../certification/Fingerprinting");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
function normalizeSearchOptions(request, options = {}) {
    const poolSize = options.poolSize ?? request.candidateCount;
    const acceptanceLimit = options.acceptanceLimit ?? Math.min(1, poolSize);
    const maximumPerComposition = options.maximumPerComposition ?? 2;
    const maximumPerDependency = options.maximumPerDependency ?? 2;
    for (const [name, value] of Object.entries({
        poolSize, acceptanceLimit, maximumPerComposition, maximumPerDependency,
    })) {
        if (!Number.isInteger(value) || value < 1)
            throw new Error(`${name} must be a positive integer.`);
    }
    if (acceptanceLimit > poolSize)
        throw new Error("acceptanceLimit cannot exceed poolSize.");
    return Object.freeze({ poolSize, acceptanceLimit, maximumPerComposition, maximumPerDependency });
}
function requestFingerprint(request) {
    return (0, Fingerprinting_1.fingerprint)(request);
}
function optionsFingerprint(options) {
    return (0, Fingerprinting_1.fingerprint)(options);
}
function createSearchCheckpoint(request, options, generated = []) {
    return Object.freeze({
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.candidateSearchCheckpoint,
        requestFingerprint: requestFingerprint(request),
        optionsFingerprint: optionsFingerprint(options),
        nextCandidateIndex: generated.length,
        generated: Object.freeze([...generated]),
    });
}
function validateSearchCheckpoint(checkpoint, request, options) {
    if (checkpoint.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.candidateSearchCheckpoint) {
        throw new Error(`Unsupported checkpoint schema: ${checkpoint.schema}`);
    }
    if (checkpoint.requestFingerprint !== requestFingerprint(request)) {
        throw new Error("Checkpoint request mismatch.");
    }
    if (checkpoint.optionsFingerprint !== optionsFingerprint(options)) {
        throw new Error("Checkpoint options mismatch.");
    }
    if (checkpoint.nextCandidateIndex !== checkpoint.generated.length) {
        throw new Error("Checkpoint index does not match generated record count.");
    }
    if (checkpoint.nextCandidateIndex > options.poolSize) {
        throw new Error("Checkpoint exceeds configured pool size.");
    }
    (0, CanonicalSerialization_1.canonicalSerialize)(checkpoint);
}
