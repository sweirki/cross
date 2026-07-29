
import type { DifficultyTier } from "../../types/Difficulty";
import type { GenerationManifest, RankedCandidateRecord } from "../industrial/IndustrialTypes";
import { productionTuningProfile } from "./TuningProfiles";

export interface NumericDistribution {
  readonly count: number;
  readonly minimum: number;
  readonly p25: number;
  readonly median: number;
  readonly p75: number;
  readonly p95: number;
  readonly maximum: number;
  readonly mean: number;
}

export interface CorpusAnalysis {
  readonly difficulty: DifficultyTier;
  readonly generated: number;
  readonly accepted: number;
  readonly acceptanceRate: number;
  readonly acceptanceWithinTarget: boolean;
  readonly scores: Readonly<Record<string, NumericDistribution>>;
  readonly dispositions: Readonly<Record<string, number>>;
  readonly compositionFamilies: Readonly<Record<string, number>>;
  readonly dependencyProfiles: Readonly<Record<string, number>>;
  readonly rejectionReasons: Readonly<Record<string, number>>;
}

function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

export function distribution(values: readonly number[]): NumericDistribution {
  if (values.length === 0) {
    return Object.freeze({ count: 0, minimum: 0, p25: 0, median: 0, p75: 0, p95: 0, maximum: 0, mean: 0 });
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return Object.freeze({
    count: sorted.length,
    minimum: sorted[0],
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.50),
    p75: percentile(sorted, 0.75),
    p95: percentile(sorted, 0.95),
    maximum: sorted[sorted.length - 1],
    mean: Number(mean.toFixed(3)),
  });
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

export function analyzeGenerationManifest(manifest: GenerationManifest): CorpusAnalysis {
  const scoreKeys = ["composition", "clusterQuality", "dependency", "deductionRhythm", "arithmeticTexture", "clueQuality", "visualBalance", "difficultyAccuracy", "novelty", "overall"] as const;
  const scoreValues: Record<string, number[]> = Object.fromEntries(scoreKeys.map((key) => [key, []]));
  const dispositions: Record<string, number> = {};
  const compositionFamilies: Record<string, number> = {};
  const dependencyProfiles: Record<string, number> = {};
  const rejectionReasons: Record<string, number> = {};

  for (const record of manifest.records) {
    increment(dispositions, record.disposition);
    if (record.scorecard) {
      for (const key of scoreKeys) scoreValues[key].push(record.scorecard[key]);
    }
    if (record.candidate) increment(compositionFamilies, record.candidate.composition.family);
    if (record.dna) increment(dependencyProfiles, record.dna.dependencyProfile);
    if (record.rejectionReason) {
      for (const reason of record.rejectionReason.split(",")) increment(rejectionReasons, reason.trim());
    }
  }

  const rate = manifest.generatedCount === 0 ? 0 : manifest.acceptedCount / manifest.generatedCount;
  const profile = productionTuningProfile(manifest.request.difficulty);
  return Object.freeze({
    difficulty: manifest.request.difficulty,
    generated: manifest.generatedCount,
    accepted: manifest.acceptedCount,
    acceptanceRate: Number(rate.toFixed(6)),
    acceptanceWithinTarget: rate >= profile.targetAcceptanceRate[0] && rate <= profile.targetAcceptanceRate[1],
    scores: Object.freeze(Object.fromEntries(scoreKeys.map((key) => [key, distribution(scoreValues[key])]))),
    dispositions: Object.freeze(dispositions),
    compositionFamilies: Object.freeze(compositionFamilies),
    dependencyProfiles: Object.freeze(dependencyProfiles),
    rejectionReasons: Object.freeze(rejectionReasons),
  });
}

export function analyzeCorpus(manifests: readonly GenerationManifest[]): readonly CorpusAnalysis[] {
  return Object.freeze(manifests.map(analyzeGenerationManifest));
}
