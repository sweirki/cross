"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fingerprint = fingerprint;
exports.candidateFingerprints = candidateFingerprints;
const CanonicalSerialization_1 = require("../versioning/CanonicalSerialization");
function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}
function fingerprint(value) {
    return `fnv1a32:${fnv1a((0, CanonicalSerialization_1.canonicalSerialize)(value))}`;
}
function candidateFingerprints(candidate) {
    return Object.freeze({
        exact: fingerprint({
            composition: candidate.composition,
            dependency: candidate.dependency,
            fill: candidate.fill,
            clues: candidate.clues,
        }),
        composition: fingerprint({
            family: candidate.composition.family,
            rows: candidate.composition.rows,
            columns: candidate.composition.columns,
            clusters: candidate.composition.clusters.map((cluster) => ({
                templateId: cluster.templateId,
                transform: cluster.transform,
                origin: cluster.origin,
            })),
        }),
        dependency: fingerprint({
            nodes: candidate.dependency.nodes.map((node) => ({ kind: node.kind, sourceId: node.sourceId })),
            edges: candidate.dependency.edges.map((edge) => ({
                from: edge.from, to: edge.to, kind: edge.kind, directed: edge.directed,
            })),
        }),
        arithmetic: fingerprint({ operators: candidate.fill.operators, values: candidate.fill.values }),
        clues: fingerprint({
            givenCellIds: candidate.clues.givenCellIds,
            hiddenCellIds: candidate.clues.hiddenCellIds,
        }),
    });
}
