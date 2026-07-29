import type {
  Campaign,
  CampaignLevelState,
  PuzzleProgress,
} from "../types/RuntimeContent";
import type { PuzzleLibrary } from "./PuzzleLibrary";

export function buildCampaignState(
  campaign: Campaign,
  library: PuzzleLibrary,
  progress: Readonly<Record<string, PuzzleProgress>> = {},
): readonly CampaignLevelState[] {
  if (campaign.schemaVersion !== 1 || campaign.id.trim().length === 0) {
    throw new Error("Campaign metadata is invalid.");
  }
  const puzzles = new Map(library.puzzles.map((puzzle) => [puzzle.id, puzzle]));
  const levelIds = new Set<string>();
  for (const chapter of campaign.chapters) {
    for (const level of chapter.levels) {
      if (levelIds.has(level.id)) throw new Error(`Duplicate campaign level: ${level.id}.`);
      levelIds.add(level.id);
    }
  }
  return campaign.chapters.flatMap((chapter) =>
    chapter.levels.map((level) => {
      const puzzle = puzzles.get(level.puzzleId);
      if (puzzle === undefined) throw new Error(`Missing campaign puzzle: ${level.puzzleId}.`);
      if (level.unlockAfterLevelId !== undefined && !levelIds.has(level.unlockAfterLevelId)) {
        throw new Error(`Unknown campaign prerequisite: ${level.unlockAfterLevelId}.`);
      }
      const prerequisitePuzzleId = campaign.chapters
        .flatMap((candidate) => candidate.levels)
        .find((candidate) => candidate.id === level.unlockAfterLevelId)?.puzzleId;
      return {
        chapterId: chapter.id,
        level,
        puzzle,
        locked: prerequisitePuzzleId !== undefined && progress[prerequisitePuzzleId]?.completed !== true,
        completed: progress[puzzle.id]?.completed ?? false,
      };
    }),
  );
}
