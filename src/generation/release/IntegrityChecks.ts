
import type { CertifiedCampaign, CertifiedPuzzleCatalog } from "../content/ContentTypes";
import { fingerprint } from "../certification/Fingerprinting";

export interface IntegrityResult {
  readonly valid: boolean;
  readonly failures: readonly string[];
}

export function validateCatalogIntegrity(catalog: CertifiedPuzzleCatalog): IntegrityResult {
  const failures: string[] = [];
  if (catalog.schemaVersion !== 2) failures.push("catalog-schema");
  if (catalog.puzzles.length === 0) failures.push("catalog-empty");
  const ids = new Set<string>();
  for (const record of catalog.puzzles) {
    if (ids.has(record.id)) failures.push(`duplicate-puzzle-id:${record.id}`);
    ids.add(record.id);
    if (!record.certificate.valid) failures.push(`uncertified-puzzle:${record.id}`);
    if (record.puzzle.id !== record.id) failures.push(`runtime-id-mismatch:${record.id}`);
  }
  const { fingerprint: stored, ...base } = catalog;
  if (stored !== fingerprint(base)) failures.push("catalog-fingerprint");
  return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}

export function validateCampaignIntegrity(
  campaign: CertifiedCampaign,
  catalog: CertifiedPuzzleCatalog,
): IntegrityResult {
  const failures: string[] = [];
  if (campaign.schemaVersion !== 2) failures.push("campaign-schema");
  if (campaign.catalogId !== catalog.id) failures.push("campaign-catalog-id");
  const puzzleIds = new Set(catalog.puzzles.map((record) => record.id));
  const levelIds = new Set<string>();
  let prior: string | undefined;
  for (const chapter of campaign.chapters) {
    for (const level of chapter.levels) {
      if (levelIds.has(level.id)) failures.push(`duplicate-level-id:${level.id}`);
      levelIds.add(level.id);
      if (!puzzleIds.has(level.puzzleId)) failures.push(`missing-puzzle:${level.puzzleId}`);
      if (level.unlockAfterLevelId !== prior) failures.push(`unlock-chain:${level.id}`);
      prior = level.id;
    }
  }
  const { fingerprint: stored, ...base } = campaign;
  if (stored !== fingerprint(base)) failures.push("campaign-fingerprint");
  return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}
