
import type { DifficultyTier } from "../../types/Difficulty";

export interface QualityWeights {
  readonly composition: number;
  readonly clusterQuality: number;
  readonly dependency: number;
  readonly deductionRhythm: number;
  readonly arithmeticTexture: number;
  readonly clueQuality: number;
  readonly visualBalance: number;
  readonly difficultyAccuracy: number;
  readonly novelty: number;
}

export interface ProductionTuningProfile {
  readonly id: string;
  readonly version: number;
  readonly difficulty: DifficultyTier;
  readonly targetDensity: number;
  readonly densityPenalty: number;
  readonly weights: QualityWeights;
  readonly minimumOverall: number;
  readonly minimumComponent: number;
  readonly targetAcceptanceRate: readonly [number, number];
}

const weights = (values: QualityWeights): QualityWeights => Object.freeze(values);

const PROFILES: Readonly<Record<DifficultyTier, ProductionTuningProfile>> = Object.freeze({
  easy: Object.freeze({
    id: "production-easy/v2", version: 2, difficulty: "easy",
    targetDensity: 0.34, densityPenalty: 210,
    weights: weights({ composition: 0.15, clusterQuality: 0.09, dependency: 0.12, deductionRhythm: 0.18, arithmeticTexture: 0.12, clueQuality: 0.12, visualBalance: 0.08, difficultyAccuracy: 0.10, novelty: 0.04 }),
    minimumOverall: 57, minimumComponent: 36, targetAcceptanceRate: Object.freeze([0.02, 0.18] as const),
  }),
  medium: Object.freeze({
    id: "production-medium/v2", version: 2, difficulty: "medium",
    targetDensity: 0.35, densityPenalty: 220,
    weights: weights({ composition: 0.14, clusterQuality: 0.08, dependency: 0.15, deductionRhythm: 0.19, arithmeticTexture: 0.12, clueQuality: 0.10, visualBalance: 0.07, difficultyAccuracy: 0.10, novelty: 0.05 }),
    minimumOverall: 60, minimumComponent: 39, targetAcceptanceRate: Object.freeze([0.015, 0.14] as const),
  }),
  hard: Object.freeze({
    id: "production-hard/v2", version: 2, difficulty: "hard",
    targetDensity: 0.36, densityPenalty: 230,
    weights: weights({ composition: 0.12, clusterQuality: 0.07, dependency: 0.18, deductionRhythm: 0.21, arithmeticTexture: 0.11, clueQuality: 0.09, visualBalance: 0.06, difficultyAccuracy: 0.11, novelty: 0.05 }),
    minimumOverall: 63, minimumComponent: 42, targetAcceptanceRate: Object.freeze([0.01, 0.10] as const),
  }),
  expert: Object.freeze({
    id: "production-expert/v2", version: 2, difficulty: "expert",
    targetDensity: 0.37, densityPenalty: 240,
    weights: weights({ composition: 0.10, clusterQuality: 0.06, dependency: 0.20, deductionRhythm: 0.23, arithmeticTexture: 0.10, clueQuality: 0.08, visualBalance: 0.05, difficultyAccuracy: 0.13, novelty: 0.05 }),
    minimumOverall: 66, minimumComponent: 44, targetAcceptanceRate: Object.freeze([0.005, 0.08] as const),
  }),
});

export function productionTuningProfile(difficulty: DifficultyTier): ProductionTuningProfile {
  return PROFILES[difficulty];
}

export function validateQualityWeights(profile: ProductionTuningProfile): boolean {
  const sum = Object.values(profile.weights).reduce((total, value) => total + value, 0);
  return Math.abs(sum - 1) < 1e-9;
}
