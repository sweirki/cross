"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIndustrialLibrary = generateIndustrialLibrary;
exports.serializeIndustrialCheckpoint = serializeIndustrialCheckpoint;
exports.serializeIndustrialManifest = serializeIndustrialManifest;
const difficulty_1 = require("../difficulty");
const PuzzleValidation_1 = require("../validation/PuzzleValidation");
const PuzzleFingerprint_1 = require("./PuzzleFingerprint");
function seedFor(rootSeed, attempt) {
    let value = 0x811c9dc5;
    const input = `${rootSeed}:${attempt}`;
    for (let i = 0; i < input.length; i += 1) {
        value ^= input.charCodeAt(i);
        value = Math.imul(value, 0x01000193);
    }
    return value >>> 0;
}
function validateRequest(request) {
    if (!Number.isInteger(request.count) || request.count < 1)
        throw new Error("count must be a positive integer.");
    if (!Number.isInteger(request.chunkSize) || request.chunkSize < 1)
        throw new Error("chunkSize must be a positive integer.");
    if (!Number.isInteger(request.maximumAttempts) || request.maximumAttempts < request.count) {
        throw new Error("maximumAttempts must be an integer not smaller than count.");
    }
    if (request.checkpoint && request.checkpoint.rootSeed !== request.rootSeed) {
        throw new Error("Checkpoint root seed does not match request root seed.");
    }
}
function emptyDistribution() {
    return { easy: 0, medium: 0, hard: 0, expert: 0 };
}
function generateIndustrialLibrary(request, factory) {
    validateRequest(request);
    const prior = request.checkpoint;
    const exact = new Set(prior?.exactFingerprints ?? []);
    const structural = new Set(prior?.structuralFingerprints ?? []);
    const records = [];
    let attemptIndex = prior?.nextAttemptIndex ?? 0;
    let rejectedDuplicates = prior?.rejectedDuplicates ?? 0;
    let rejectedInvalid = prior?.rejectedInvalid ?? 0;
    const startingAttempt = attemptIndex;
    while (records.length < request.count && attemptIndex - startingAttempt < request.maximumAttempts) {
        const current = attemptIndex;
        attemptIndex += 1;
        try {
            const puzzle = factory(current, seedFor(request.rootSeed, current));
            if (!puzzle) {
                rejectedInvalid += 1;
                continue;
            }
            const validation = (0, PuzzleValidation_1.validatePuzzle)(puzzle);
            if (!validation.valid) {
                rejectedInvalid += 1;
                continue;
            }
            const fingerprints = (0, PuzzleFingerprint_1.fingerprintPuzzle)(puzzle);
            const duplicate = exact.has(fingerprints.exact) ||
                Boolean(request.rejectStructuralDuplicates && structural.has(fingerprints.structural));
            if (duplicate) {
                rejectedDuplicates += 1;
                continue;
            }
            const certification = (0, difficulty_1.certifyDifficulty)(puzzle);
            exact.add(fingerprints.exact);
            structural.add(fingerprints.structural);
            records.push({ puzzle, certification, fingerprints, attemptIndex: current });
        }
        catch {
            rejectedInvalid += 1;
        }
    }
    const chunks = [];
    for (let index = 0; index < records.length; index += request.chunkSize) {
        chunks.push(records.slice(index, index + request.chunkSize));
    }
    const distribution = emptyDistribution();
    for (const record of records)
        distribution[record.certification.certifiedTier] += 1;
    const checkpoint = {
        version: 1,
        rootSeed: request.rootSeed,
        nextAttemptIndex: attemptIndex,
        accepted: (prior?.accepted ?? 0) + records.length,
        rejectedDuplicates,
        rejectedInvalid,
        exactFingerprints: [...exact].sort(),
        structuralFingerprints: [...structural].sort(),
    };
    return {
        records,
        chunks,
        checkpoint,
        manifest: {
            schemaVersion: 1,
            rootSeed: request.rootSeed,
            requestedCount: request.count,
            generatedCount: records.length,
            attempts: attemptIndex - startingAttempt,
            rejectedDuplicates,
            rejectedInvalid,
            chunks: chunks.map((chunk, index) => ({
                index,
                firstPuzzleId: chunk[0].puzzle.id,
                lastPuzzleId: chunk[chunk.length - 1].puzzle.id,
                count: chunk.length,
            })),
            difficultyDistribution: distribution,
        },
    };
}
function serializeIndustrialCheckpoint(checkpoint) {
    return JSON.stringify(checkpoint);
}
function serializeIndustrialManifest(result) {
    return JSON.stringify(result.manifest);
}
