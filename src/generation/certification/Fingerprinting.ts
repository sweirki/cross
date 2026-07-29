
import { canonicalSerialize } from "../versioning/CanonicalSerialization";
import type { PuzzleCandidate } from "../contracts/GenerationContracts";

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fingerprint(value: unknown): string {
  return `fnv1a32:${fnv1a(canonicalSerialize(value))}`;
}

export function candidateFingerprints(candidate: PuzzleCandidate): Readonly<Record<string, string>> {
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
