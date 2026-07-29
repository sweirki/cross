import { canonicalSerialize } from "../versioning/CanonicalSerialization";
import { fingerprint } from "../certification/Fingerprinting";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import type { GenerationRequest } from "../contracts/GenerationContracts";
import type {
  CandidateGenerationRecord,
  CandidateSearchCheckpoint,
  CandidateSearchOptions,
} from "./IndustrialTypes";

export function normalizeSearchOptions(
  request: GenerationRequest,
  options: CandidateSearchOptions = {},
): Required<CandidateSearchOptions> {
  const poolSize = options.poolSize ?? request.candidateCount;
  const acceptanceLimit = options.acceptanceLimit ?? Math.min(1, poolSize);
  const maximumPerComposition = options.maximumPerComposition ?? 2;
  const maximumPerDependency = options.maximumPerDependency ?? 2;
  for (const [name, value] of Object.entries({
    poolSize, acceptanceLimit, maximumPerComposition, maximumPerDependency,
  })) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  }
  if (acceptanceLimit > poolSize) throw new Error("acceptanceLimit cannot exceed poolSize.");
  return Object.freeze({ poolSize, acceptanceLimit, maximumPerComposition, maximumPerDependency });
}

export function requestFingerprint(request: GenerationRequest): string {
  return fingerprint(request);
}

export function optionsFingerprint(options: Required<CandidateSearchOptions>): string {
  return fingerprint(options);
}

export function createSearchCheckpoint(
  request: GenerationRequest,
  options: Required<CandidateSearchOptions>,
  generated: readonly CandidateGenerationRecord[] = [],
): CandidateSearchCheckpoint {
  return Object.freeze({
    schema: GENERATION_SCHEMA_IDS.candidateSearchCheckpoint,
    requestFingerprint: requestFingerprint(request),
    optionsFingerprint: optionsFingerprint(options),
    nextCandidateIndex: generated.length,
    generated: Object.freeze([...generated]),
  });
}

export function validateSearchCheckpoint(
  checkpoint: CandidateSearchCheckpoint,
  request: GenerationRequest,
  options: Required<CandidateSearchOptions>,
): void {
  if (checkpoint.schema !== GENERATION_SCHEMA_IDS.candidateSearchCheckpoint) {
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
  canonicalSerialize(checkpoint);
}
