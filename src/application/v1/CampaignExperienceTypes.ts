import type { LearningCampaign, LearningContent, LessonProfile } from "../../types/LearningContent";
import type { ApplicationProgressState } from "./CrossMathApplicationRuntime";

export type CampaignLessonStatus = "locked" | "available" | "in-progress" | "completed";
export type CampaignChapterStatus = "locked" | "active" | "completed";
export type CampaignPathStatus = "locked" | "current" | "completed";

export interface CampaignLessonView {
  readonly id: string;
  readonly chapterId: string;
  readonly order: number;
  readonly title: string;
  readonly instruction: string;
  readonly status: CampaignLessonStatus;
  readonly earnedStars: number;
  readonly maximumStars: number;
  readonly completedPuzzles: number;
  readonly totalPuzzles: number;
  readonly completionPercent: number;
  readonly isResumeTarget: boolean;
}

export interface CampaignPathSegment {
  readonly fromLessonId: string;
  readonly toLessonId: string;
  readonly status: CampaignPathStatus;
}

export interface CampaignChapterView {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: CampaignChapterStatus;
  readonly lessons: readonly CampaignLessonView[];
  readonly path: readonly CampaignPathSegment[];
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly earnedStars: number;
  readonly maximumStars: number;
  readonly completionPercent: number;
}

export interface CampaignExperienceView {
  readonly campaignId: string;
  readonly title: string;
  readonly chapters: readonly CampaignChapterView[];
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly earnedStars: number;
  readonly maximumStars: number;
  readonly completionPercent: number;
  readonly nextLessonId: string | null;
  readonly resumeLessonId: string | null;
  readonly campaignCompleted: boolean;
}

export interface CampaignExperienceContract {
  build(
    content: LearningContent,
    progress: ApplicationProgressState,
  ): CampaignExperienceView;
  findLesson(
    content: LearningContent,
    lessonId: string,
  ): LessonProfile | null;
  isChapterUnlocked(
    campaign: LearningCampaign,
    content: LearningContent,
    progress: ApplicationProgressState,
    chapterId: string,
  ): boolean;
}
