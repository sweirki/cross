import { canonicalSerialize } from "../versioning/CanonicalSerialization";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { candidateFingerprints, certifyCandidate, fingerprint } from "../certification";
import type { GenerationRequest, PuzzleCandidate } from "../contracts/GenerationContracts";
import { generateCandidate } from "./CandidatePipeline";
import {
  createSearchCheckpoint,
  normalizeSearchOptions,
  validateSearchCheckpoint,
} from "./SearchCheckpoint";
import type {
  CandidateDisposition,
  CandidateGenerationRecord,
  CandidateSearchCheckpoint,
  CandidateSearchOptions,
  CandidateSearchResult,
  GenerationManifest,
  RankedCandidateRecord,
} from "./IndustrialTypes";

function noveltyScore(
  candidate: PuzzleCandidate,
  frequencies: Readonly<Record<string, Readonly<Record<string, number>>>>,
): number {
  const prints = candidateFingerprints(candidate);
  let score = 100;
  if ((frequencies.composition?.[prints.composition] ?? 0) > 1) score -= 18;
  if ((frequencies.dependency?.[prints.dependency] ?? 0) > 1) score -= 18;
  if ((frequencies.arithmetic?.[prints.arithmetic] ?? 0) > 1) score -= 12;
  if ((frequencies.clues?.[prints.clues] ?? 0) > 1) score -= 12;
  return Math.max(0, score);
}

function fingerprintFrequencies(
  generated: readonly CandidateGenerationRecord[],
): Readonly<Record<string, Readonly<Record<string, number>>>> {
  const output: Record<string, Record<string, number>> = {
    composition: {}, dependency: {}, arithmetic: {}, clues: {},
  };
  for (const record of generated) {
    if (!record.candidate) continue;
    const prints = candidateFingerprints(record.candidate);
    for (const kind of Object.keys(output)) {
      const value = prints[kind];
      output[kind][value] = (output[kind][value] ?? 0) + 1;
    }
  }
  return output;
}

function rankingOrder(a: RankedCandidateRecord, b: RankedCandidateRecord): number {
  const score = (b.scorecard?.overall ?? -1) - (a.scorecard?.overall ?? -1);
  if (score !== 0) return score;
  const novelty = (b.noveltyScore ?? -1) - (a.noveltyScore ?? -1);
  if (novelty !== 0) return novelty;
  return a.index - b.index;
}

function rejectionCounts(records: readonly RankedCandidateRecord[]): Readonly<Record<CandidateDisposition, number>> {
  const result: Record<CandidateDisposition, number> = {
    accepted: 0,
    "hard-gate-rejected": 0,
    "duplicate-rejected": 0,
    "diversity-rejected": 0,
    "ranked-out": 0,
    "generation-failed": 0,
  };
  for (const record of records) result[record.disposition] += 1;
  return Object.freeze(result);
}

function rankAndSelect(
  generated: readonly CandidateGenerationRecord[],
  options: Required<CandidateSearchOptions>,
): readonly RankedCandidateRecord[] {
  const frequencies = fingerprintFrequencies(generated);
  const exactSeen = new Set<string>();
  const eligible: RankedCandidateRecord[] = [];
  const fixed: RankedCandidateRecord[] = [];

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
    const exact = candidateFingerprints(record.candidate).exact;
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
    const certification = certifyCandidate({
      candidate: record.candidate,
      deductionTrace: record.deductionTrace,
      fillingDiagnostics: record.fillingDiagnostics,
      noveltyScore: novelty,
    });
    const certifiedCandidate = Object.freeze({
      ...record.candidate,
      certificate: certification.certificate,
    });
    const ranked: RankedCandidateRecord = Object.freeze({
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
  const compositionCounts = new Map<string, number>();
  const dependencyCounts = new Map<string, number>();
  const selected = new Set<number>();

  for (const record of eligible) {
    if (selected.size >= options.acceptanceLimit || !record.candidate) break;
    const prints = candidateFingerprints(record.candidate);
    if ((compositionCounts.get(prints.composition) ?? 0) >= options.maximumPerComposition) continue;
    if ((dependencyCounts.get(prints.dependency) ?? 0) >= options.maximumPerDependency) continue;
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
    } as RankedCandidateRecord);
  });
  return Object.freeze([...fixed, ...finalized].sort((a, b) => a.index - b.index));
}

export function runCandidateSearch(
  request: GenerationRequest,
  optionsInput: CandidateSearchOptions = {},
  checkpointInput?: CandidateSearchCheckpoint,
): CandidateSearchResult {
  const options = normalizeSearchOptions(request, optionsInput);
  const generated = checkpointInput ? [...checkpointInput.generated] : [];
  if (checkpointInput) validateSearchCheckpoint(checkpointInput, request, options);

  for (let index = generated.length; index < options.poolSize; index += 1) {
    generated.push(generateCandidate(request, index));
  }

  const checkpoint = createSearchCheckpoint(request, options, generated);
  const records = rankAndSelect(generated, options);
  const accepted = Object.freeze(records.filter((record) => record.disposition === "accepted"));
  const manifestBase = {
    schema: GENERATION_SCHEMA_IDS.generationManifest,
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
  const manifest: GenerationManifest = Object.freeze({
    ...manifestBase,
    fingerprint: fingerprint(manifestBase),
  });
  canonicalSerialize(manifest);
  return Object.freeze({ manifest, checkpoint });
}
