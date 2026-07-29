
export type AchievementId =
  | "first-solve"
  | "five-solves"
  | "twenty-five-solves"
  | "perfect-solve"
  | "hint-free"
  | "fast-solve"
  | "daily-streak-3"
  | "daily-streak-7"
  | "star-collector-25"
  | "star-collector-100";

export interface ProgressionCompletionInput {
  readonly puzzleId: string;
  readonly completedAt: string;
  readonly stars: 1 | 2 | 3;
  readonly moves: number;
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly elapsedMs: number;
  readonly mode: "lesson" | "practice" | "daily";
  readonly lessonCompleted?: boolean;
  readonly campaignCompleted?: boolean;
  readonly masteryImproved?: boolean;
}

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly xpReward: number;
  readonly badge: string;
}

export interface UnlockedAchievement {
  readonly id: AchievementId;
  readonly unlockedAt: string;
}

export interface ProgressionStatistics {
  readonly puzzlesCompleted: number;
  readonly perfectSolves: number;
  readonly hintFreeSolves: number;
  readonly dailyChallengesCompleted: number;
  readonly lessonsCompleted: number;
  readonly campaignsCompleted: number;
  readonly totalStars: number;
  readonly totalMoves: number;
  readonly totalHints: number;
  readonly totalMistakes: number;
  readonly totalPlayTimeMs: number;
  readonly fastestSolveMs: number | null;
}

export interface RewardItem {
  readonly id: string;
  readonly kind: "xp" | "level-up" | "achievement" | "badge" | "streak";
  readonly title: string;
  readonly detail: string;
  readonly amount?: number;
  readonly achievementId?: AchievementId;
  readonly level?: number;
}

export interface ProgressionState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly totalXp: number;
  readonly level: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActiveDate: string | null;
  readonly activityDates: readonly string[];
  readonly achievements: readonly UnlockedAchievement[];
  readonly stats: ProgressionStatistics;
  readonly rewardQueue: readonly RewardItem[];
  readonly processedCompletionIds: readonly string[];
  readonly revision: number;
}

export interface ProgressionResult {
  readonly state: ProgressionState;
  readonly xpEarned: number;
  readonly rewards: readonly RewardItem[];
  readonly newlyUnlocked: readonly AchievementId[];
}
