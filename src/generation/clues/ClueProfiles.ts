
import type { DifficultyTier } from "../../types/Difficulty";

export interface ClueProfile {
  readonly id: string;
  readonly difficulty: DifficultyTier;
  readonly targetGivenRatio: number;
  readonly minimumInitialDeductions: number;
  readonly maximumInitialDeductions: number;
  readonly minimumDeductionDepth: number;
}

const PROFILES: Readonly<Record<DifficultyTier, ClueProfile>> = Object.freeze({
  easy: Object.freeze({ id: "clues/easy-v1", difficulty: "easy", targetGivenRatio: 0.52, minimumInitialDeductions: 2, maximumInitialDeductions: 20, minimumDeductionDepth: 1 }),
  medium: Object.freeze({ id: "clues/medium-v1", difficulty: "medium", targetGivenRatio: 0.44, minimumInitialDeductions: 1, maximumInitialDeductions: 12, minimumDeductionDepth: 2 }),
  hard: Object.freeze({ id: "clues/hard-v1", difficulty: "hard", targetGivenRatio: 0.36, minimumInitialDeductions: 1, maximumInitialDeductions: 8, minimumDeductionDepth: 3 }),
  expert: Object.freeze({ id: "clues/expert-v1", difficulty: "expert", targetGivenRatio: 0.30, minimumInitialDeductions: 1, maximumInitialDeductions: 6, minimumDeductionDepth: 4 }),
});

export function clueProfileForDifficulty(difficulty: DifficultyTier): ClueProfile {
  return PROFILES[difficulty];
}
