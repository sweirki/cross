import { strict as assert } from "node:assert";
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { EN_US_MESSAGES } from "../../src/data/messageCatalogs";
import {
  InstalledContentLibrary,
  buildContentRelease,
  compileContentPack,
  contentChecksum,
  generateContentQaReport,
  isRuntimeCompatible,
  parseContentPack,
  publishContentRelease,
  translate,
  verifyContentPack,
} from "../../src/services/ContentPlatform";

function main(): void {
  const [first, second, third, fourth] = BUNDLED_LIBRARY.puzzles;
  assert.ok(first && second && third && fourth);

  const tutorial = compileContentPack({
    id: "tutorial",
    version: "1.0.0",
    kind: "tutorial",
    puzzles: [second!, first!, third!],
    classifications: [
      { puzzleId: first!.id, concepts: ["place-number", "addition"], templateId: "template-one-equation", lessonIds: ["lesson-001"] },
      { puzzleId: second!.id, concepts: ["addition"], templateId: "template-one-equation", lessonIds: ["lesson-002"] },
      { puzzleId: third!.id, concepts: ["shared-number"], templateId: "template-first-intersection", lessonIds: ["lesson-003"] },
    ],
  });
  assert.equal(tutorial.puzzles[0]?.id, [...tutorial.puzzles].sort((a, b) => a.id.localeCompare(b.id))[0]?.id);
  assert.equal(tutorial.index.byConcept.addition.length, 2);
  assert.equal(tutorial.index.byTemplate["template-one-equation"]?.length, 2);
  assert.equal(tutorial.index.byLesson["lesson-003"]?.[0], third!.id);
  assert.equal(verifyContentPack(tutorial), true);

  const mixed = compileContentPack({
    id: "mixed",
    version: "1.0.0",
    kind: "mixed",
    puzzles: [fourth!],
  });
  const release = buildContentRelease(
    "crossmath-content",
    "1.0.0",
    "1.0.0",
    "2026-07-28T12:00:00.000Z",
    [mixed, tutorial],
  );
  assert.deepEqual(release.manifest.packIds, ["mixed", "tutorial"]);
  assert.equal(release.manifest.puzzleCount, 4);
  assert.equal(isRuntimeCompatible(release.manifest, "1.0.0"), true);
  assert.equal(isRuntimeCompatible(release.manifest, "1.1.0"), true);
  assert.equal(isRuntimeCompatible(release.manifest, "0.9.9"), false);

  const installed = new InstalledContentLibrary();
  installed.install(tutorial);
  installed.install(mixed);
  assert.deepEqual(installed.installedPackIds(), ["mixed", "tutorial"]);
  assert.equal(installed.query().length, 4);
  assert.equal(installed.query({ concept: "addition" }).length, 2);
  assert.equal(installed.query({ lessonId: "lesson-003" })[0]?.id, third!.id);
  assert.equal(installed.query({ packId: "mixed" })[0]?.id, fourth!.id);
  assert.equal(installed.uninstall("mixed"), true);
  assert.equal(installed.query().length, 3);

  const report = generateContentQaReport(release, "2026-07-28T12:00:00.000Z");
  assert.equal(report.valid, true);
  assert.equal(report.totals.puzzles, 4);
  assert.equal(report.totals.uniquePuzzles, 4);
  assert.equal(report.totals.checksumFailures, 0);

  const published = publishContentRelease(release);
  assert.equal(Object.keys(published.serializedPacks).length, 2);
  assert.deepEqual(parseContentPack(published.serializedPacks.tutorial!), tutorial);
  assert.equal(published.serializedManifest.includes("crossmath-content"), true);

  assert.equal(translate(EN_US_MESSAGES, "lesson.start", { lesson: "Addition" }), "Start Addition");
  assert.equal(translate(EN_US_MESSAGES, "pack.installed", { count: 4 }), "4 puzzles installed");
  assert.throws(() => translate(EN_US_MESSAGES, "missing"));
  assert.throws(() => translate(EN_US_MESSAGES, "lesson.start"));

  const deterministicA = contentChecksum({ b: 2, a: 1 });
  const deterministicB = contentChecksum({ a: 1, b: 2 });
  assert.equal(deterministicA, deterministicB);

  const tampered = { ...tutorial, version: "1.0.1" };
  assert.equal(verifyContentPack(tampered), false);
  assert.throws(() => installed.install(tampered));
  assert.throws(() => parseContentPack(JSON.stringify(tampered)));
  assert.throws(() => compileContentPack({ id: "", version: "1", kind: "mixed", puzzles: [] }));
  assert.throws(() => compileContentPack({ id: "bad", version: "1.0.0", kind: "mixed", puzzles: [first!, first!] }));
  assert.throws(() => buildContentRelease("bad", "1.0.0", "1.0.0", "not-a-date", []));
  assert.throws(() => buildContentRelease("bad", "1.0.0", "1.0.0", "2026-01-01T00:00:00Z", [tutorial, tutorial]));
  assert.throws(() => isRuntimeCompatible(release.manifest, "latest"));

  const duplicateRelease = buildContentRelease(
    "duplicates",
    "1.0.0",
    "1.0.0",
    "2026-07-28T12:00:00.000Z",
    [
      tutorial,
      compileContentPack({ id: "duplicate-copy", version: "1.0.0", kind: "mixed", puzzles: [first!] }),
    ],
  );
  const duplicateQa = generateContentQaReport(duplicateRelease, "2026-07-28T12:00:00.000Z");
  assert.equal(duplicateQa.valid, false);
  assert.equal(duplicateQa.totals.duplicatePuzzleIds, 1);
  assert.throws(() => publishContentRelease(duplicateRelease));

  console.log("Content platform tests passed (31 assertions).");
}

main();
