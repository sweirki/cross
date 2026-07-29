import { hashSeed } from "../../engine/random/DeterministicRandom";
import type { GenerationSeed, GenerationStage } from "../contracts/GenerationContracts";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";

const SEED_DOMAIN = "crossmath-commercial-generation/v1";

function normalizeRootSeed(rootSeed: string | number): string {
  const normalized = String(rootSeed);
  if (normalized.length === 0) throw new Error("rootSeed must not be empty.");
  return normalized;
}

export function createRootGenerationSeed(rootSeed: string | number): GenerationSeed {
  const normalized = normalizeRootSeed(rootSeed);
  return {
    schema: GENERATION_SCHEMA_IDS.generationSeed,
    rootSeed: normalized,
    namespace: SEED_DOMAIN,
    value: hashSeed(`${SEED_DOMAIN}:${normalized}`),
    path: [],
  };
}

export function deriveGenerationSeed(
  parent: GenerationSeed,
  label: string | number,
): GenerationSeed {
  const normalizedLabel = String(label);
  if (normalizedLabel.length === 0) throw new Error("seed label must not be empty.");
  const path = [...parent.path, normalizedLabel];
  return {
    schema: GENERATION_SCHEMA_IDS.generationSeed,
    rootSeed: parent.rootSeed,
    namespace: parent.namespace,
    value: hashSeed(`${parent.namespace}:${parent.rootSeed}:${path.join("/")}`),
    path,
  };
}

export function allocateStageSeeds(
  rootSeed: string | number,
  candidateIndex = 0,
): Readonly<Record<GenerationStage, GenerationSeed>> {
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0) {
    throw new Error("candidateIndex must be a non-negative integer.");
  }
  const candidateRoot = deriveGenerationSeed(
    createRootGenerationSeed(rootSeed),
    `candidate:${candidateIndex}`,
  );
  const stages: readonly GenerationStage[] = [
    "composition", "cluster-selection", "placement", "dependency", "operator",
    "numeric", "clue", "candidate", "certification",
  ];
  return Object.freeze(Object.fromEntries(
    stages.map((stage) => [stage, Object.freeze(deriveGenerationSeed(candidateRoot, stage))]),
  )) as Readonly<Record<GenerationStage, GenerationSeed>>;
}

export function replaySeed(seed: GenerationSeed): GenerationSeed {
  let current = createRootGenerationSeed(seed.rootSeed);
  for (const segment of seed.path) current = deriveGenerationSeed(current, segment);
  if (current.namespace !== seed.namespace || current.value !== seed.value) {
    throw new Error("Generation seed replay mismatch.");
  }
  return current;
}
