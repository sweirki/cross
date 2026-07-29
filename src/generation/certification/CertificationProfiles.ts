
import type { DifficultyTier } from "../../types/Difficulty";
import { productionTuningProfile } from "../tuning/TuningProfiles";

export interface CertificationProfile {
  readonly difficulty: DifficultyTier;
  readonly minimumOverall: number;
  readonly minimumComponent: number;
  readonly maximumSearchNodes: number;
  readonly minimumDeductionDepth: number;
  readonly maximumInitialDeductions: number;
}

const PROFILES: Readonly<Record<DifficultyTier, CertificationProfile>> = Object.freeze({
  easy: Object.freeze({ difficulty: "easy", minimumOverall: 55, minimumComponent: 35, maximumSearchNodes: 50_000, minimumDeductionDepth: 1, maximumInitialDeductions: 20 }),
  medium: Object.freeze({ difficulty: "medium", minimumOverall: 58, minimumComponent: 38, maximumSearchNodes: 75_000, minimumDeductionDepth: 2, maximumInitialDeductions: 12 }),
  hard: Object.freeze({ difficulty: "hard", minimumOverall: 60, minimumComponent: 40, maximumSearchNodes: 100_000, minimumDeductionDepth: 3, maximumInitialDeductions: 8 }),
  expert: Object.freeze({ difficulty: "expert", minimumOverall: 62, minimumComponent: 42, maximumSearchNodes: 150_000, minimumDeductionDepth: 4, maximumInitialDeductions: 6 }),
});

export function certificationProfileForDifficulty(difficulty: DifficultyTier): CertificationProfile {
  const base = PROFILES[difficulty];
  const tuning = productionTuningProfile(difficulty);
  return Object.freeze({
    ...base,
    minimumOverall: tuning.minimumOverall,
    minimumComponent: tuning.minimumComponent,
  });
}
