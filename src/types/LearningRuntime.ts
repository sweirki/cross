import type { RuntimeEvent, RuntimeState, RuntimeTransition } from "./GameRuntime";

export type LearningObjective =
  | { readonly id: string; readonly type: "place-tiles"; readonly count: number }
  | { readonly id: string; readonly type: "complete-equations"; readonly count: number }
  | { readonly id: string; readonly type: "solve-puzzle" }
  | { readonly id: string; readonly type: "finish-without-hints" }
  | { readonly id: string; readonly type: "finish-within-moves"; readonly maxMoves: number }
  | { readonly id: string; readonly type: "finish-within-time"; readonly maxElapsedMs: number };

export interface LessonDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly puzzleId: string;
  readonly objectives: readonly LearningObjective[];
  readonly minimumStarsToMaster?: 1 | 2 | 3;
}

export interface CampaignChapterDefinition {
  readonly id: string;
  readonly title: string;
  readonly lessonIds: readonly string[];
}

export interface CampaignDefinition {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly chapters: readonly CampaignChapterDefinition[];
  readonly lessons: readonly LessonDefinition[];
}

export type LessonStatus = "not-started" | "in-progress" | "completed";

export interface ObjectiveProgress {
  readonly objectiveId: string;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

export interface LessonMetrics {
  readonly placedTiles: number;
  readonly completedEquationIds: readonly string[];
  readonly hintsUsed: number;
  readonly mistakes: number;
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface LessonState {
  readonly schemaVersion: 1;
  readonly lessonId: string;
  readonly puzzleId: string;
  readonly status: LessonStatus;
  readonly attempt: number;
  readonly objectives: readonly ObjectiveProgress[];
  readonly activeObjectiveIndex: number;
  readonly stars: 0 | 1 | 2 | 3;
  readonly metrics: LessonMetrics;
  readonly revision: number;
}

export type LearningEvent =
  | { readonly type: "lesson-started"; readonly lessonId: string; readonly attempt: number }
  | { readonly type: "objective-completed"; readonly lessonId: string; readonly objectiveId: string }
  | { readonly type: "star-earned"; readonly lessonId: string; readonly star: 1 | 2 | 3 }
  | { readonly type: "lesson-completed"; readonly lessonId: string; readonly stars: 1 | 2 | 3 }
  | { readonly type: "lesson-restarted"; readonly lessonId: string; readonly attempt: number }
  | { readonly type: "lesson-unlocked"; readonly lessonId: string }
  | { readonly type: "campaign-completed"; readonly campaignId: string };

export interface LessonTransition {
  readonly state: LessonState;
  readonly events: readonly LearningEvent[];
}

export interface CampaignLessonProgress {
  readonly lessonId: string;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly mastered: boolean;
  readonly bestStars: 0 | 1 | 2 | 3;
  readonly attempts: number;
}

export interface CampaignState {
  readonly schemaVersion: 1;
  readonly campaignId: string;
  readonly lessons: readonly CampaignLessonProgress[];
  readonly completed: boolean;
  readonly revision: number;
}

export interface CampaignTransition {
  readonly state: CampaignState;
  readonly events: readonly LearningEvent[];
}

export interface LearningRuntimeContract {
  createLesson(definition: LessonDefinition): LessonTransition;
  restartLesson(definition: LessonDefinition, state: LessonState): LessonTransition;
  observe(
    definition: LessonDefinition,
    state: LessonState,
    game: Pick<RuntimeTransition, "state" | "events">,
  ): LessonTransition;
  serializeLesson(state: LessonState): string;
  restoreLesson(definition: LessonDefinition, serialized: string): LessonState;
  createCampaign(definition: CampaignDefinition): CampaignTransition;
  recordLesson(
    definition: CampaignDefinition,
    state: CampaignState,
    lesson: LessonState,
  ): CampaignTransition;
  serializeCampaign(state: CampaignState): string;
  restoreCampaign(definition: CampaignDefinition, serialized: string): CampaignState;
}

export type ObservedGameState = Pick<RuntimeState, "puzzleId" | "history" | "clock" | "mistakes" | "status">;
export type ObservedRuntimeEvent = RuntimeEvent;
