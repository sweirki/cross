import type { DifficultyTier } from "../../types/Difficulty";

export type CompositionFamily =
  | "four-corners"
  | "triangle"
  | "center-weighted"
  | "diagonal"
  | "hourglass"
  | "balanced-asymmetric";

export interface CompositionProfile {
  readonly id: CompositionFamily;
  readonly difficulties: readonly DifficultyTier[];
  readonly clusterCount: Readonly<Record<DifficultyTier, readonly [number, number]>>;
  readonly minimumGap: number;
  readonly margin: number;
}

const COUNTS: Readonly<Record<DifficultyTier, readonly [number, number]>> = {
  easy: [2, 3],
  medium: [3, 4],
  hard: [3, 5],
  expert: [4, 6],
};

export const PRODUCTION_COMPOSITION_PROFILES: readonly CompositionProfile[] = [
  { id: "four-corners", difficulties: ["easy", "medium", "hard"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
  { id: "triangle", difficulties: ["easy", "medium", "hard"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
  { id: "center-weighted", difficulties: ["medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
  { id: "diagonal", difficulties: ["easy", "medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
  { id: "hourglass", difficulties: ["medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
  { id: "balanced-asymmetric", difficulties: ["easy", "medium", "hard", "expert"], clusterCount: COUNTS, minimumGap: 2, margin: 1 },
];

export function listCompositionProfilesForDifficulty(
  difficulty: DifficultyTier,
): readonly CompositionProfile[] {
  return PRODUCTION_COMPOSITION_PROFILES.filter((profile) =>
    profile.difficulties.includes(difficulty),
  );
}
