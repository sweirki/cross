export const GENERATION_SCHEMA_IDS = {
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
} as const;

export type GenerationSchemaId =
  (typeof GENERATION_SCHEMA_IDS)[keyof typeof GENERATION_SCHEMA_IDS];

export const COMMERCIAL_GENERATOR_VERSION = "commercial-generator/1.0.0" as const;

const SUPPORTED = new Set<string>(Object.values(GENERATION_SCHEMA_IDS));

export function isSupportedGenerationSchema(value: string): value is GenerationSchemaId {
  return SUPPORTED.has(value);
}

export function assertSupportedGenerationSchema(value: string): asserts value is GenerationSchemaId {
  if (!isSupportedGenerationSchema(value)) {
    throw new Error(`Unsupported generation schema: ${value}`);
  }
}
