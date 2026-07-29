import { validatePuzzle } from "../game/validation/PuzzleValidation";
import type { DifficultyTier } from "../types/Difficulty";
import type {
  CompilePackInput,
  CompiledContentPack,
  ContentPackIndex,
  ContentQaReport,
  ContentQuery,
  ContentRelease,
  ContentReleaseManifest,
  MessageCatalog,
  PublishedContentRelease,
} from "../types/ContentPlatform";
import type { Puzzle } from "../types/Puzzle";

const DIFFICULTIES: readonly DifficultyTier[] = ["easy", "medium", "hard", "expert"];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const constants = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15]!;
      const b = words[index - 2]!;
      const s0 = rightRotate(a, 7) ^ rightRotate(a, 18) ^ (a >>> 3);
      const s1 = rightRotate(b, 17) ^ rightRotate(b, 19) ^ (b >>> 10);
      words[index] = (words[index - 16]! + s0 + words[index - 7]! + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e!, 6) ^ rightRotate(e!, 11) ^ rightRotate(e!, 25);
      const choose = (e! & f!) ^ (~e! & g!);
      const temp1 = (h! + s1 + choose + constants[index]! + words[index]!) >>> 0;
      const s0 = rightRotate(a!, 2) ^ rightRotate(a!, 13) ^ rightRotate(a!, 22);
      const majority = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const temp2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d! + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0]! + a!) >>> 0; hash[1] = (hash[1]! + b!) >>> 0;
    hash[2] = (hash[2]! + c!) >>> 0; hash[3] = (hash[3]! + d!) >>> 0;
    hash[4] = (hash[4]! + e!) >>> 0; hash[5] = (hash[5]! + f!) >>> 0;
    hash[6] = (hash[6]! + g!) >>> 0; hash[7] = (hash[7]! + h!) >>> 0;
  }
  return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
}

export function contentChecksum(value: unknown): string {
  return `sha256:${sha256(stable(value))}`;
}

function emptyDifficultyIndex(): Record<DifficultyTier, string[]> {
  return { easy: [], medium: [], hard: [], expert: [] };
}

function add(index: Record<string, string[]>, key: string | undefined, id: string): void {
  if (key === undefined || key.length === 0) return;
  (index[key] ??= []).push(id);
}

export function compileContentPack(input: CompilePackInput): CompiledContentPack {
  if (!input.id.trim() || !/^\d+\.\d+\.\d+$/.test(input.version)) {
    throw new Error("Pack ID and semantic version are required.");
  }
  const classifications = new Map((input.classifications ?? []).map((item) => [item.puzzleId, item]));
  const seen = new Set<string>();
  const puzzles = [...input.puzzles].sort((a, b) => a.id.localeCompare(b.id));
  const byDifficulty = emptyDifficultyIndex();
  const byConcept: Record<string, string[]> = {};
  const byTemplate: Record<string, string[]> = {};
  const byLesson: Record<string, string[]> = {};

  for (const puzzle of puzzles) {
    if (seen.has(puzzle.id)) throw new Error(`Duplicate puzzle ID: ${puzzle.id}.`);
    seen.add(puzzle.id);
    const validation = validatePuzzle(puzzle);
    if (!validation.valid) throw new Error(`Invalid puzzle ${puzzle.id}.`);
    byDifficulty[puzzle.difficulty].push(puzzle.id);
    const classification = classifications.get(puzzle.id);
    for (const concept of classification?.concepts ?? []) add(byConcept, concept, puzzle.id);
    add(byTemplate, classification?.templateId, puzzle.id);
    for (const lessonId of classification?.lessonIds ?? []) add(byLesson, lessonId, puzzle.id);
  }

  const sortRecord = (record: Record<string, string[]>): void => {
    for (const values of Object.values(record)) values.sort();
  };
  sortRecord(byDifficulty); sortRecord(byConcept); sortRecord(byTemplate); sortRecord(byLesson);
  const index: ContentPackIndex = { byDifficulty, byConcept, byTemplate, byLesson };
  const payload = { schemaVersion: 1, id: input.id, version: input.version, kind: input.kind, puzzles, index } as const;
  return { ...payload, checksum: contentChecksum(payload) };
}

export function verifyContentPack(pack: CompiledContentPack): boolean {
  const { checksum, ...payload } = pack;
  return checksum === contentChecksum(payload);
}

export function buildContentRelease(
  id: string,
  version: string,
  minimumRuntimeVersion: string,
  generatedAt: string,
  packs: readonly CompiledContentPack[],
): ContentRelease {
  if (!id.trim() || !/^\d+\.\d+\.\d+$/.test(version) || !/^\d+\.\d+\.\d+$/.test(minimumRuntimeVersion)) {
    throw new Error("Release metadata is invalid.");
  }
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("generatedAt must be an ISO date.");
  const packIds = packs.map((pack) => pack.id).sort();
  if (new Set(packIds).size !== packIds.length) throw new Error("Release pack IDs must be unique.");
  for (const pack of packs) if (!verifyContentPack(pack)) throw new Error(`Pack checksum failed: ${pack.id}.`);
  const puzzleCount = packs.reduce((sum, pack) => sum + pack.puzzles.length, 0);
  const base = { schemaVersion: 1, id, version, minimumRuntimeVersion, generatedAt, packIds, puzzleCount } as const;
  const manifest: ContentReleaseManifest = { ...base, checksum: contentChecksum({ ...base, packChecksums: packs.map((p) => p.checksum).sort() }) };
  return { manifest, packs: [...packs].sort((a, b) => a.id.localeCompare(b.id)) };
}

function semverParts(version: string): readonly number[] {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid semantic version: ${version}.`);
  return version.split(".").map(Number);
}

export function isRuntimeCompatible(manifest: ContentReleaseManifest, runtimeVersion: string): boolean {
  const required = semverParts(manifest.minimumRuntimeVersion);
  const actual = semverParts(runtimeVersion);
  for (let index = 0; index < 3; index += 1) {
    if (actual[index]! !== required[index]!) return actual[index]! > required[index]!;
  }
  return true;
}

export class InstalledContentLibrary {
  private readonly packs = new Map<string, CompiledContentPack>();

  install(pack: CompiledContentPack): void {
    if (!verifyContentPack(pack)) throw new Error(`Pack checksum failed: ${pack.id}.`);
    this.packs.set(pack.id, pack);
  }

  uninstall(packId: string): boolean { return this.packs.delete(packId); }
  installedPackIds(): readonly string[] { return [...this.packs.keys()].sort(); }

  query(query: ContentQuery = {}): readonly Puzzle[] {
    const packs = query.packId === undefined
      ? [...this.packs.values()]
      : [this.packs.get(query.packId)].filter((pack): pack is CompiledContentPack => pack !== undefined);
    const results = new Map<string, Puzzle>();
    for (const pack of packs) {
      let ids: readonly string[] = pack.puzzles.map((puzzle) => puzzle.id);
      if (query.difficulty) ids = pack.index.byDifficulty[query.difficulty];
      const concept = query.concept;
      const templateId = query.templateId;
      const lessonId = query.lessonId;
      if (concept !== undefined) ids = ids.filter((id) => pack.index.byConcept[concept]?.includes(id));
      if (templateId !== undefined) ids = ids.filter((id) => pack.index.byTemplate[templateId]?.includes(id));
      if (lessonId !== undefined) ids = ids.filter((id) => pack.index.byLesson[lessonId]?.includes(id));
      if (query.puzzleId) ids = ids.filter((id) => id === query.puzzleId);
      for (const id of ids) {
        const puzzle = pack.puzzles.find((candidate) => candidate.id === id);
        if (puzzle) results.set(id, puzzle);
      }
    }
    return [...results.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

export function generateContentQaReport(release: ContentRelease, generatedAt: string): ContentQaReport {
  const issues: Array<{ severity: "error" | "warning"; code: string; message: string }> = [];
  const ids = new Set<string>();
  let duplicatePuzzleIds = 0;
  let checksumFailures = 0;
  const difficulty = emptyDifficultyIndex();
  for (const pack of release.packs) {
    if (!verifyContentPack(pack)) {
      checksumFailures += 1;
      issues.push({ severity: "error", code: "PACK_CHECKSUM", message: `Checksum failed for ${pack.id}.` });
    }
    for (const puzzle of pack.puzzles) {
      if (ids.has(puzzle.id)) {
        duplicatePuzzleIds += 1;
        issues.push({ severity: "error", code: "DUPLICATE_PUZZLE", message: `Puzzle ${puzzle.id} appears in multiple packs.` });
      }
      ids.add(puzzle.id);
      difficulty[puzzle.difficulty].push(puzzle.id);
    }
  }
  const distribution = Object.fromEntries(DIFFICULTIES.map((tier) => [tier, difficulty[tier].length])) as Record<DifficultyTier, number>;
  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    generatedAt,
    totals: { packs: release.packs.length, puzzles: release.manifest.puzzleCount, uniquePuzzles: ids.size, duplicatePuzzleIds, checksumFailures },
    difficulty: distribution,
    issues,
  };
}

export function translate(catalog: MessageCatalog, key: string, variables: Readonly<Record<string, string | number>> = {}): string {
  const template = catalog.messages[key];
  if (template === undefined) throw new Error(`Missing translation key ${key} for ${catalog.locale}.`);
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
    const value = variables[name];
    if (value === undefined) throw new Error(`Missing translation variable ${name}.`);
    return String(value);
  });
}

export function publishContentRelease(release: ContentRelease): PublishedContentRelease {
  const qa = generateContentQaReport(release, release.manifest.generatedAt);
  if (!qa.valid) throw new Error("Content release failed QA.");
  return {
    release,
    qa,
    serializedManifest: stable(release.manifest),
    serializedPacks: Object.fromEntries(release.packs.map((pack) => [pack.id, stable(pack)])),
  };
}

export function parseContentPack(json: string): CompiledContentPack {
  const pack = JSON.parse(json) as CompiledContentPack;
  if (!verifyContentPack(pack)) throw new Error("Content pack checksum is invalid.");
  return pack;
}
