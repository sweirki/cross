export interface GenerationFeatureFlags {
  readonly commercialGenerationContracts: boolean;
  readonly commercialGenerationPipeline: boolean;
  readonly legacyGenerationFallback: boolean;
}

export const DEFAULT_GENERATION_FEATURE_FLAGS: GenerationFeatureFlags = Object.freeze({
  commercialGenerationContracts: true,
  commercialGenerationPipeline: true,
  legacyGenerationFallback: true,
});
