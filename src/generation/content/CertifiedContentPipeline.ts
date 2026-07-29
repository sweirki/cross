
import type { GenerationManifest, RankedCandidateRecord } from "../industrial/IndustrialTypes";
import { fingerprint } from "../certification/Fingerprinting";
import { candidateToPuzzle } from "./CandidatePuzzleAdapter";
import type {
  CertifiedCampaign,
  CertifiedPuzzleCatalog,
  CertifiedPuzzleRecord,
  LegacyCampaign,
} from "./ContentTypes";

function requireAccepted(record: RankedCandidateRecord): asserts record is RankedCandidateRecord & {
  candidate: NonNullable<RankedCandidateRecord["candidate"]>;
  certificate: NonNullable<RankedCandidateRecord["certificate"]>;
  dna: NonNullable<RankedCandidateRecord["dna"]>;
  scorecard: NonNullable<RankedCandidateRecord["scorecard"]>;
} {
  if (
    record.disposition !== "accepted"
    || !record.candidate
    || !record.certificate?.valid
    || !record.dna
    || !record.scorecard
  ) {
    throw new Error(`Record ${record.index} is not an accepted certified candidate.`);
  }
}

function solveEstimate(record: RankedCandidateRecord & {
  candidate: NonNullable<RankedCandidateRecord["candidate"]>;
  scorecard: NonNullable<RankedCandidateRecord["scorecard"]>;
}): number {
  const hidden = record.candidate.clues.hiddenCellIds.length;
  const depth = record.candidate.dependency.metrics.longestPath ?? 1;
  const difficultyMultiplier = { easy: 1, medium: 1.35, hard: 1.8, expert: 2.4 }[
    record.candidate.request.difficulty
  ];
  return Math.max(30, Math.round((hidden * 8 + depth * 12) * difficultyMultiplier));
}

function tags(record: RankedCandidateRecord & {
  candidate: NonNullable<RankedCandidateRecord["candidate"]>;
}): readonly string[] {
  const candidate = record.candidate;
  return Object.freeze([
    `difficulty:${candidate.request.difficulty}`,
    `composition:${candidate.composition.family}`,
    `dependency:${candidate.dna?.dependencyProfile ?? `${candidate.request.difficulty}-structural/v1`}`,
    `operators:${candidate.fill.profileId}`,
    `clues:${candidate.clues.profileId}`,
    ...[...new Set(candidate.composition.clusters.map((cluster) => `cluster:${cluster.templateId}`))].sort(),
  ].sort());
}

export function buildCertifiedCatalog(
  manifest: GenerationManifest,
  catalogId = `${manifest.request.requestId}:catalog`,
): CertifiedPuzzleCatalog {
  if (manifest.accepted.length === 0) throw new Error("Cannot build a certified catalog without accepted puzzles.");
  const records: CertifiedPuzzleRecord[] = manifest.accepted.map((record, index) => {
    requireAccepted(record);
    const id = `${catalogId}:puzzle:${String(index + 1).padStart(4, "0")}`;
    return Object.freeze({
      schemaVersion: 1 as const,
      id,
      puzzle: candidateToPuzzle(record.candidate, id),
      certificate: record.certificate,
      dna: record.dna,
      scorecard: record.scorecard,
      tags: tags(record),
      estimatedSolveSeconds: solveEstimate(record),
    });
  });
  const base = {
    schemaVersion: 2 as const,
    id: catalogId,
    generatorVersion: manifest.request.generatorVersion,
    createdFromSeed: manifest.request.rootSeed,
    puzzles: Object.freeze(records),
  };
  return Object.freeze({ ...base, fingerprint: fingerprint(base) });
}

export function buildCertifiedCampaign(
  catalog: CertifiedPuzzleCatalog,
  campaignId = `${catalog.id}:campaign`,
  chapterSize = 10,
): CertifiedCampaign {
  if (!Number.isInteger(chapterSize) || chapterSize < 1) throw new Error("Chapter size must be a positive integer.");
  const difficultyOrder = { easy: 0, medium: 1, hard: 2, expert: 3 } as const;
  const ordered = [...catalog.puzzles].sort((a, b) =>
    difficultyOrder[a.puzzle.difficulty] - difficultyOrder[b.puzzle.difficulty]
    || a.estimatedSolveSeconds - b.estimatedSolveSeconds
    || b.scorecard.overall - a.scorecard.overall
    || a.id.localeCompare(b.id),
  );
  const chapters = [];
  let priorLevelId: string | undefined;
  for (let start = 0; start < ordered.length; start += chapterSize) {
    const chapterIndex = Math.floor(start / chapterSize) + 1;
    const levels = ordered.slice(start, start + chapterSize).map((record, offset) => {
      const id = `${campaignId}:level:${String(start + offset + 1).padStart(4, "0")}`;
      const level = Object.freeze({
        id,
        puzzleId: record.id,
        difficulty: record.puzzle.difficulty,
        ...(priorLevelId ? { unlockAfterLevelId: priorLevelId } : {}),
      });
      priorLevelId = id;
      return level;
    });
    chapters.push(Object.freeze({
      id: `${campaignId}:chapter:${String(chapterIndex).padStart(2, "0")}`,
      title: `Chapter ${chapterIndex}`,
      levels: Object.freeze(levels),
    }));
  }
  const base = {
    schemaVersion: 2 as const,
    id: campaignId,
    catalogId: catalog.id,
    chapters: Object.freeze(chapters),
  };
  return Object.freeze({ ...base, fingerprint: fingerprint(base) });
}

export function migrateCampaignToV2(
  legacy: LegacyCampaign,
  catalog: CertifiedPuzzleCatalog,
): CertifiedCampaign {
  const byId = new Map(catalog.puzzles.map((record) => [record.id, record] as const));
  const chapters = legacy.chapters.map((chapter) => Object.freeze({
    id: chapter.id,
    title: chapter.title,
    levels: Object.freeze(chapter.levels.map((level) => {
      const record = byId.get(level.puzzleId);
      if (!record) throw new Error(`Legacy campaign references missing certified puzzle ${level.puzzleId}.`);
      return Object.freeze({
        ...level,
        difficulty: record.puzzle.difficulty,
      });
    })),
  }));
  const base = {
    schemaVersion: 2 as const,
    id: legacy.id,
    catalogId: catalog.id,
    chapters: Object.freeze(chapters),
  };
  return Object.freeze({ ...base, fingerprint: fingerprint(base) });
}

export function buildDailySchedule(
  catalog: CertifiedPuzzleCatalog,
  dates: readonly string[],
  namespace = catalog.id,
): Readonly<Record<string, string>> {
  if (catalog.puzzles.length === 0) throw new Error("Cannot schedule an empty catalog.");
  const ids = catalog.puzzles.map((record) => record.id).sort();
  const output: Record<string, string> = {};
  for (const date of [...dates].sort()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new Error(`Invalid daily date ${date}.`);
    }
    const hash = fingerprint(`${namespace}:${date}`);
    const numeric = Number.parseInt(hash.split(":")[1]!, 16);
    output[date] = ids[numeric % ids.length]!;
  }
  return Object.freeze(output);
}

export function validateCertifiedCatalog(catalog: CertifiedPuzzleCatalog): readonly string[] {
  const issues: string[] = [];
  if (catalog.schemaVersion !== 2) issues.push("UNSUPPORTED_CATALOG_SCHEMA");
  if (catalog.puzzles.length === 0) issues.push("EMPTY_CATALOG");
  const ids = new Set<string>();
  const exact = new Set<string>();
  for (const record of catalog.puzzles) {
    if (ids.has(record.id)) issues.push(`DUPLICATE_ID:${record.id}`);
    ids.add(record.id);
    const fp = record.certificate.fingerprints.exact;
    if (fp && exact.has(fp)) issues.push(`DUPLICATE_EXACT:${fp}`);
    if (fp) exact.add(fp);
    if (!record.certificate.valid) issues.push(`UNCERTIFIED:${record.id}`);
    if (record.puzzle.id !== record.id) issues.push(`PUZZLE_ID_MISMATCH:${record.id}`);
    if (record.puzzle.numberBank.length !== record.puzzle.cells.filter((cell) => cell.kind === "number" && !cell.given).length) {
      issues.push(`NUMBER_BANK_MISMATCH:${record.id}`);
    }
  }
  const base = {
    schemaVersion: catalog.schemaVersion,
    id: catalog.id,
    generatorVersion: catalog.generatorVersion,
    createdFromSeed: catalog.createdFromSeed,
    puzzles: catalog.puzzles,
  };
  if (catalog.fingerprint !== fingerprint(base)) issues.push("CATALOG_FINGERPRINT_MISMATCH");
  return Object.freeze(issues);
}
