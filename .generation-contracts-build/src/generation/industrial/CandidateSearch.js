"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCandidateSearch = runCandidateSearch;
const CanonicalSerialization_1 = require("../versioning/CanonicalSerialization");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const certification_1 = require("../certification");
const CandidatePipeline_1 = require("./CandidatePipeline");
const SearchCheckpoint_1 = require("./SearchCheckpoint");
function noveltyScore(candidate, frequencies) {
    const prints = (0, certification_1.candidateFingerprints)(candidate);
    let score = 100;
    if ((frequencies.composition?.[prints.composition] ?? 0) > 1)
        score -= 18;
    if ((frequencies.dependency?.[prints.dependency] ?? 0) > 1)
        score -= 18;
    if ((frequencies.arithmetic?.[prints.arithmetic] ?? 0) > 1)
        score -= 12;
    if ((frequencies.clues?.[prints.clues] ?? 0) > 1)
        score -= 12;
    return Math.max(0, score);
}
function fingerprintFrequencies(generated) {
    const output = {
        composition: {}, dependency: {}, arithmetic: {}, clues: {},
    };
    for (const record of generated) {
        if (!record.candidate)
            continue;
        const prints = (0, certification_1.candidateFingerprints)(record.candidate);
        for (const kind of Object.keys(output)) {
            const value = prints[kind];
            output[kind][value] = (output[kind][value] ?? 0) + 1;
        }
    }
    return output;
}
function rankingOrder(a, b) {
    const score = (b.scorecard?.overall ?? -1) - (a.scorecard?.overall ?? -1);
    if (score !== 0)
        return score;
    const novelty = (b.noveltyScore ?? -1) - (a.noveltyScore ?? -1);
    if (novelty !== 0)
        return novelty;
    return a.index - b.index;
}
function rejectionCounts(records) {
    const result = {
        accepted: 0,
        "hard-gate-rejected": 0,
        "duplicate-rejected": 0,
        "diversity-rejected": 0,
        "ranked-out": 0,
        "generation-failed": 0,
    };
    for (const record of records)
        result[record.disposition] += 1;
    return Object.freeze(result);
}
function rankAndSelect(generated, options) {
    const frequencies = fingerprintFrequencies(generated);
    const exactSeen = new Set();
    const eligible = [];
    const fixed = [];
    for (const record of generated) {
        if (!record.candidate || !record.deductionTrace) {
            fixed.push(Object.freeze({
                index: record.index,
                disposition: "generation-failed",
                failures: Object.freeze([]),
                rejectionReason: record.generationFailure ?? "Candidate generation failed.",
            }));
            continue;
        }
        const exact = (0, certification_1.candidateFingerprints)(record.candidate).exact;
        if (exactSeen.has(exact)) {
            fixed.push(Object.freeze({
                index: record.index,
                disposition: "duplicate-rejected",
                candidate: record.candidate,
                dna: record.candidate.dna,
                failures: Object.freeze([]),
                rejectionReason: `Duplicate exact fingerprint ${exact}.`,
            }));
            continue;
        }
        exactSeen.add(exact);
        const novelty = noveltyScore(record.candidate, frequencies);
        const certification = (0, certification_1.certifyCandidate)({
            candidate: record.candidate,
            deductionTrace: record.deductionTrace,
            fillingDiagnostics: record.fillingDiagnostics,
            noveltyScore: novelty,
        });
        const certifiedCandidate = Object.freeze({
            ...record.candidate,
            certificate: certification.certificate,
        });
        const ranked = Object.freeze({
            index: record.index,
            disposition: certification.accepted ? "ranked-out" : "hard-gate-rejected",
            candidate: certifiedCandidate,
            certificate: certification.certificate,
            dna: certifiedCandidate.dna,
            scorecard: certification.scorecard,
            failures: certification.failures,
            noveltyScore: novelty,
            ...(certification.accepted
                ? {}
                : { rejectionReason: certification.failures.map((item) => item.code).join(",") }),
        });
        (certification.accepted ? eligible : fixed).push(ranked);
    }
    eligible.sort(rankingOrder);
    const compositionCounts = new Map();
    const dependencyCounts = new Map();
    const selected = new Set();
    for (const record of eligible) {
        if (selected.size >= options.acceptanceLimit || !record.candidate)
            break;
        const prints = (0, certification_1.candidateFingerprints)(record.candidate);
        if ((compositionCounts.get(prints.composition) ?? 0) >= options.maximumPerComposition)
            continue;
        if ((dependencyCounts.get(prints.dependency) ?? 0) >= options.maximumPerDependency)
            continue;
        selected.add(record.index);
        compositionCounts.set(prints.composition, (compositionCounts.get(prints.composition) ?? 0) + 1);
        dependencyCounts.set(prints.dependency, (dependencyCounts.get(prints.dependency) ?? 0) + 1);
    }
    const finalized = eligible.map((record, rankIndex) => {
        const accepted = selected.has(record.index);
        const blockedByDiversity = !accepted && selected.size < options.acceptanceLimit;
        return Object.freeze({
            ...record,
            rank: rankIndex + 1,
            disposition: accepted ? "accepted" : blockedByDiversity ? "diversity-rejected" : "ranked-out",
            ...(accepted
                ? {}
                : { rejectionReason: blockedByDiversity
                        ? "Composition or dependency diversity limit reached."
                        : "Candidate ranked below the acceptance limit." }),
        });
    });
    return Object.freeze([...fixed, ...finalized].sort((a, b) => a.index - b.index));
}
function runCandidateSearch(request, optionsInput = {}, checkpointInput) {
    const options = (0, SearchCheckpoint_1.normalizeSearchOptions)(request, optionsInput);
    const generated = checkpointInput ? [...checkpointInput.generated] : [];
    if (checkpointInput)
        (0, SearchCheckpoint_1.validateSearchCheckpoint)(checkpointInput, request, options);
    for (let index = generated.length; index < options.poolSize; index += 1) {
        generated.push((0, CandidatePipeline_1.generateCandidate)(request, index));
    }
    const checkpoint = (0, SearchCheckpoint_1.createSearchCheckpoint)(request, options, generated);
    const records = rankAndSelect(generated, options);
    const accepted = Object.freeze(records.filter((record) => record.disposition === "accepted"));
    const manifestBase = {
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.generationManifest,
        request,
        options,
        generatedCount: generated.length,
        certifiedCount: records.filter((record) => record.certificate !== undefined).length,
        acceptedCount: accepted.length,
        rejectedCount: records.length - accepted.length,
        records: Object.freeze(records),
        accepted,
        rejectionCounts: rejectionCounts(records),
    };
    const manifest = Object.freeze({
        ...manifestBase,
        fingerprint: (0, certification_1.fingerprint)(manifestBase),
    });
    (0, CanonicalSerialization_1.canonicalSerialize)(manifest);
    return Object.freeze({ manifest, checkpoint });
}
