
import type { PuzzleProgress } from "../../types/RuntimeContent";
import type { PuzzleLibrary } from "../../services/PuzzleLibrary";
import type { Campaign } from "../../types/RuntimeContent";
import type { CertifiedCampaign, CertifiedPuzzleCatalog } from "./ContentTypes";

export interface ContentMigrationMap {
  readonly schemaVersion: 1;
  readonly fromCatalogId: string;
  readonly toCatalogId: string;
  readonly puzzleIdAliases: Readonly<Record<string, string>>;
}

export function toPuzzleLibrary(catalog: CertifiedPuzzleCatalog): PuzzleLibrary {
  return Object.freeze({
    schemaVersion: 1,
    id: catalog.id,
    puzzles: Object.freeze(catalog.puzzles.map((record) => record.puzzle)),
  });
}

export function toRuntimeCampaign(campaign: CertifiedCampaign): Campaign {
  return Object.freeze({
    schemaVersion: 1,
    id: campaign.id,
    chapters: Object.freeze(campaign.chapters.map((chapter) => Object.freeze({
      id: chapter.id,
      title: chapter.title,
      levels: Object.freeze(chapter.levels.map(({ difficulty: _difficulty, ...level }) => Object.freeze(level))),
    }))),
  });
}

export function migratePuzzleProgress(
  progress: Readonly<Record<string, PuzzleProgress>>,
  migration: ContentMigrationMap,
  catalog: CertifiedPuzzleCatalog,
): Readonly<Record<string, PuzzleProgress>> {
  if (migration.schemaVersion !== 1 || migration.toCatalogId !== catalog.id) {
    throw new Error("Content migration map does not target this catalog.");
  }
  const validIds = new Set(catalog.puzzles.map((record) => record.id));
  const migrated: Record<string, PuzzleProgress> = {};
  for (const [oldId, state] of Object.entries(progress).sort(([a], [b]) => a.localeCompare(b))) {
    const newId = migration.puzzleIdAliases[oldId] ?? oldId;
    if (!validIds.has(newId)) continue;
    const candidate: PuzzleProgress = Object.freeze({ ...state, puzzleId: newId });
    const existing = migrated[newId];
    if (
      !existing
      || candidate.completed && !existing.completed
      || candidate.stars > existing.stars
      || (candidate.bestTimeMs !== null && (existing.bestTimeMs === null || candidate.bestTimeMs < existing.bestTimeMs))
    ) {
      migrated[newId] = candidate;
    }
  }
  return Object.freeze(migrated);
}
