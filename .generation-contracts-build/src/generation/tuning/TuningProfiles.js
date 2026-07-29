"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionTuningProfile = productionTuningProfile;
exports.validateQualityWeights = validateQualityWeights;
const weights = (values) => Object.freeze(values);
const PROFILES = Object.freeze({
    easy: Object.freeze({
        id: "production-easy/v2", version: 2, difficulty: "easy",
        targetDensity: 0.34, densityPenalty: 210,
        weights: weights({ composition: 0.15, clusterQuality: 0.09, dependency: 0.12, deductionRhythm: 0.18, arithmeticTexture: 0.12, clueQuality: 0.12, visualBalance: 0.08, difficultyAccuracy: 0.10, novelty: 0.04 }),
        minimumOverall: 57, minimumComponent: 36, targetAcceptanceRate: Object.freeze([0.02, 0.18]),
    }),
    medium: Object.freeze({
        id: "production-medium/v2", version: 2, difficulty: "medium",
        targetDensity: 0.35, densityPenalty: 220,
        weights: weights({ composition: 0.14, clusterQuality: 0.08, dependency: 0.15, deductionRhythm: 0.19, arithmeticTexture: 0.12, clueQuality: 0.10, visualBalance: 0.07, difficultyAccuracy: 0.10, novelty: 0.05 }),
        minimumOverall: 60, minimumComponent: 39, targetAcceptanceRate: Object.freeze([0.015, 0.14]),
    }),
    hard: Object.freeze({
        id: "production-hard/v2", version: 2, difficulty: "hard",
        targetDensity: 0.36, densityPenalty: 230,
        weights: weights({ composition: 0.12, clusterQuality: 0.07, dependency: 0.18, deductionRhythm: 0.21, arithmeticTexture: 0.11, clueQuality: 0.09, visualBalance: 0.06, difficultyAccuracy: 0.11, novelty: 0.05 }),
        minimumOverall: 63, minimumComponent: 42, targetAcceptanceRate: Object.freeze([0.01, 0.10]),
    }),
    expert: Object.freeze({
        id: "production-expert/v2", version: 2, difficulty: "expert",
        targetDensity: 0.37, densityPenalty: 240,
        weights: weights({ composition: 0.10, clusterQuality: 0.06, dependency: 0.20, deductionRhythm: 0.23, arithmeticTexture: 0.10, clueQuality: 0.08, visualBalance: 0.05, difficultyAccuracy: 0.13, novelty: 0.05 }),
        minimumOverall: 66, minimumComponent: 44, targetAcceptanceRate: Object.freeze([0.005, 0.08]),
    }),
});
function productionTuningProfile(difficulty) {
    return PROFILES[difficulty];
}
function validateQualityWeights(profile) {
    const sum = Object.values(profile.weights).reduce((total, value) => total + value, 0);
    return Math.abs(sum - 1) < 1e-9;
}
