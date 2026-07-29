import type { Puzzle } from "../../types/Puzzle";
import type { LearningContent, LessonProfile } from "../../types/LearningContent";

export interface PuzzleProgressRecord {
  readonly puzzleId: string;
  readonly completed: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly bestMoves: number | null;
  readonly completedAt: string | null;
}

export interface ApplicationProgressState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly puzzleProgress: Readonly<Record<string, PuzzleProgressRecord>>;
  readonly lastPuzzleId: string | null;
  readonly lastLessonId: string | null;
  readonly dailyChallengeDates: readonly string[];
  readonly revision: number;
}

function canonical<T>(value: T): T {
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Date must use YYYY-MM-DD.");
}

export class CrossMathApplicationRuntime {
  public create(playerId: string): ApplicationProgressState {
    if (playerId.trim().length === 0) throw new Error("Player ID must not be empty.");
    return {
      schemaVersion: 1,
      playerId,
      puzzleProgress: {},
      lastPuzzleId: null,
      lastLessonId: null,
      dailyChallengeDates: [],
      revision: 0,
    };
  }

  public recordPuzzleStarted(
    state: ApplicationProgressState,
    puzzleId: string,
    lessonId: string | null,
  ): ApplicationProgressState {
    if (puzzleId.trim().length === 0) throw new Error("Puzzle ID must not be empty.");
    return {
      ...state,
      lastPuzzleId: puzzleId,
      lastLessonId: lessonId,
      revision: state.revision + 1,
    };
  }

  public recordPuzzleCompleted(
    state: ApplicationProgressState,
    puzzleId: string,
    moves: number,
    hintsUsed: number,
    completedAt: string,
  ): ApplicationProgressState {
    if (!Number.isSafeInteger(moves) || moves < 0) throw new Error("Moves are invalid.");
    if (!Number.isSafeInteger(hintsUsed) || hintsUsed < 0) throw new Error("Hints are invalid.");
    const prior = state.puzzleProgress[puzzleId];
    const stars: 1 | 2 | 3 = hintsUsed === 0 && moves <= 3 ? 3 : hintsUsed <= 1 ? 2 : 1;
    const bestMoves = prior?.bestMoves === null || prior?.bestMoves === undefined
      ? moves : Math.min(prior.bestMoves, moves);
    return {
      ...state,
      puzzleProgress: {
        ...state.puzzleProgress,
        [puzzleId]: {
          puzzleId,
          completed: true,
          stars: Math.max(prior?.stars ?? 0, stars) as 1 | 2 | 3,
          bestMoves,
          completedAt,
        },
      },
      revision: state.revision + 1,
    };
  }

  public markDailyComplete(state: ApplicationProgressState, date: string): ApplicationProgressState {
    assertDate(date);
    if (state.dailyChallengeDates.includes(date)) return state;
    return {
      ...state,
      dailyChallengeDates: [...state.dailyChallengeDates, date].sort(),
      revision: state.revision + 1,
    };
  }

  public nextLesson(content: LearningContent, state: ApplicationProgressState): LessonProfile | null {
    const ordered = content.campaign.chapters.flatMap(chapter =>
      chapter.lessonIds.map(id => content.lessons.find(lesson => lesson.id === id)!),
    );
    return ordered.find(lesson =>
      !lesson.puzzleIds.every(id => state.puzzleProgress[id]?.completed === true),
    ) ?? null;
  }

  public isLessonUnlocked(content: LearningContent, state: ApplicationProgressState, lessonId: string): boolean {
    const ordered = content.campaign.chapters.flatMap(chapter => chapter.lessonIds);
    const index = ordered.indexOf(lessonId);
    if (index < 0) return false;
    if (index === 0) return true;
    const previous = content.lessons.find(lesson => lesson.id === ordered[index - 1]);
    return previous !== undefined &&
      previous.puzzleIds.every(id => state.puzzleProgress[id]?.completed === true);
  }

  public dailyPuzzle(puzzles: readonly Puzzle[], date: string): Puzzle {
    assertDate(date);
    if (puzzles.length === 0) throw new Error("Puzzle library is empty.");
    let hash = 0;
    for (const ch of date) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return puzzles[hash % puzzles.length]!;
  }

  public practicePuzzle(puzzles: readonly Puzzle[], state: ApplicationProgressState): Puzzle {
    if (puzzles.length === 0) throw new Error("Puzzle library is empty.");
    return puzzles.find(puzzle => !state.puzzleProgress[puzzle.id]?.completed)
      ?? puzzles[state.revision % puzzles.length]!;
  }

  public serialize(state: ApplicationProgressState): string {
    return JSON.stringify(canonical(state));
  }

  public restore(playerId: string, serialized: string): ApplicationProgressState {
    let value: unknown;
    try { value = JSON.parse(serialized); } catch { throw new Error("Progress is not valid JSON."); }
    if (value === null || typeof value !== "object") throw new Error("Progress is invalid.");
    const state = value as ApplicationProgressState;
    if (state.schemaVersion !== 1 || state.playerId !== playerId) throw new Error("Progress is incompatible.");
    if (!Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("Progress revision is invalid.");
    return state;
  }
}

export const applicationRuntime = new CrossMathApplicationRuntime();
