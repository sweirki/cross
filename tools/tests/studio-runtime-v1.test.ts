import { CrossMathStudio } from "../../src/studio/v1";
import type { ContentPack, ContentResource } from "../../src/types/ContentPlatformRuntime";
import type { StudioGenerator } from "../../src/types/StudioRuntime";

let passed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
}
function equal(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
function ok(value: unknown, message = "Expected truthy value"): asserts value {
  if (!value) throw new Error(message);
}
function throws(run: () => void, text?: string): void {
  let error: unknown;
  try { run(); } catch (caught) { error = caught; }
  if (!(error instanceof Error)) throw new Error("Expected function to throw");
  if (text && !error.message.includes(text)) throw new Error(`Expected error containing ${text}, received ${error.message}`);
}

function puzzle(id = "puzzle-001", status: ContentResource["status"] = "draft"): ContentResource {
  return {
    schemaVersion: 1,
    kind: "puzzle",
    id,
    version: "1.0.0",
    status,
    title: `Puzzle ${id}`,
    tags: ["addition"],
    dependencies: [],
    payload: { board: [] },
  };
}
function lesson(status: ContentResource["status"] = "draft"): ContentResource {
  return {
    schemaVersion: 1,
    kind: "lesson",
    id: "lesson-001",
    version: "1.0.0",
    status,
    title: "Lesson One",
    tags: ["addition"],
    dependencies: [{ kind: "puzzle", id: "puzzle-001", version: "1.0.0" }],
    payload: { puzzleId: "puzzle-001" },
  };
}
function pack(resources: readonly ContentResource[] = [puzzle()]): ContentPack {
  return {
    schemaVersion: 1,
    id: "studio-pack",
    version: "1.0.0",
    title: "Studio Pack",
    minimumEngineVersion: "1.0.0",
    createdAt: 100,
    resources,
  };
}

const studio = new CrossMathStudio();
const create = (resources: readonly ContentResource[] = [puzzle()]) =>
  studio.createProject("project-one", pack(resources), "1.0.0", 100).project;

test("creates deterministic projects", () => {
  equal(create(), create());
});
test("emits project creation", () => {
  equal(studio.createProject("project-one", pack(), "1.0.0", 100).events[0]?.type, "project-created");
});
test("rejects invalid project IDs", () => throws(() => studio.createProject("Bad ID", pack(), "1.0.0", 100), "project ID"));
test("rejects invalid engine versions", () => throws(() => studio.createProject("project-one", pack(), "latest", 100), "engine version"));
test("rejects invalid project times", () => throws(() => studio.createProject("project-one", pack(), "1.0.0", -1), "time"));

test("adds resources and selects them", () => {
  const result = studio.addResource(create(), puzzle("puzzle-002"), 101);
  equal(result.project.snapshot.pack.resources.length, 2);
  equal(result.project.snapshot.selection?.id, "puzzle-002");
  equal(result.events[0]?.type, "resource-added");
});
test("sorts added resources canonically", () => {
  const result = studio.addResource(create([puzzle("puzzle-z")]), puzzle("puzzle-a"), 101);
  equal(result.project.snapshot.pack.resources.map((item) => item.id), ["puzzle-a", "puzzle-z"]);
});
test("rejects duplicate resources", () => throws(() => studio.addResource(create(), puzzle(), 101), "already exists"));
test("updates existing resources", () => {
  const result = studio.updateResource(create(), { ...puzzle(), title: "Changed" }, 101);
  equal(result.project.snapshot.pack.resources[0]?.title, "Changed");
  equal(result.events[0]?.type, "resource-updated");
});
test("rejects updates to unknown resources", () => throws(() => studio.updateResource(create(), puzzle("missing"), 101), "Unknown resource"));

test("removes unreferenced resources", () => {
  const result = studio.removeResource(create([puzzle(), puzzle("puzzle-002")]), "puzzle", "puzzle-002", "1.0.0", 101);
  equal(result.project.snapshot.pack.resources.length, 1);
});
test("protects required dependencies", () => {
  throws(() => studio.removeResource(create([puzzle(), lesson()]), "puzzle", "puzzle-001", "1.0.0", 101), "required by");
});
test("rejects removing unknown resources", () => throws(() => studio.removeResource(create(), "puzzle", "missing", "1.0.0", 101), "Unknown resource"));
test("duplicates resources as drafts", () => {
  const result = studio.duplicateResource(create(), { kind: "puzzle", id: "puzzle-001", version: "1.0.0" }, "puzzle-copy", "1.1.0", 101);
  const copy = result.project.snapshot.pack.resources.find((item) => item.id === "puzzle-copy");
  equal(copy?.status, "draft");
  equal(result.events[0]?.type, "resource-duplicated");
});
test("rejects bad duplicate identities", () => {
  throws(() => studio.duplicateResource(create(), { kind: "puzzle", id: "puzzle-001", version: "1.0.0" }, "Bad ID", "1.0.0", 101), "duplicate resource ID");
});

test("selects and clears resources", () => {
  const project = create();
  const selected = studio.select(project, { kind: "puzzle", id: "puzzle-001", version: "1.0.0" }).project;
  equal(selected.snapshot.selection?.id, "puzzle-001");
  equal(studio.select(selected, undefined).project.snapshot.selection, undefined);
});
test("rejects unknown selections", () => throws(() => studio.select(create(), { kind: "puzzle", id: "missing", version: "1.0.0" }), "Unknown resource"));
test("selection does not dirty project", () => {
  const project = create();
  equal(studio.select(project, { kind: "puzzle", id: "puzzle-001", version: "1.0.0" }).project.revision, 0);
});

test("supports undo", () => {
  const edited = studio.addResource(create(), puzzle("puzzle-002"), 101).project;
  const undone = studio.undo(edited, 102).project;
  equal(undone.snapshot.pack.resources.length, 1);
});
test("supports redo", () => {
  const edited = studio.addResource(create(), puzzle("puzzle-002"), 101).project;
  const undone = studio.undo(edited, 102).project;
  const redone = studio.redo(undone, 103).project;
  equal(redone.snapshot.pack.resources.length, 2);
});
test("rejects empty undo and redo", () => {
  throws(() => studio.undo(create(), 101), "Nothing to undo");
  throws(() => studio.redo(create(), 101), "Nothing to redo");
});
test("clears redo after a new edit", () => {
  const edited = studio.addResource(create(), puzzle("puzzle-002"), 101).project;
  const undone = studio.undo(edited, 102).project;
  const changed = studio.addResource(undone, puzzle("puzzle-003"), 103).project;
  equal(changed.redo.length, 0);
});
test("rejects backward edit time", () => throws(() => studio.addResource(create(), puzzle("puzzle-002"), 99), "backwards"));

test("tracks dirty and saved state", () => {
  const edited = studio.addResource(create(), puzzle("puzzle-002"), 101).project;
  equal(studio.validate(edited).dirty, true);
  const saved = studio.markSaved(edited).project;
  equal(studio.validate(saved).dirty, false);
});
test("validates content packs", () => {
  equal(studio.validate(create()).valid, true);
  equal(studio.validate(create([])).valid, false);
});
test("checks publishability", () => {
  equal(studio.validate(create([puzzle("puzzle-001", "review")])).publishable, true);
  equal(studio.validate(create()).publishable, false);
});
test("builds project catalogs", () => {
  const catalog = studio.buildCatalog(create([puzzle(), lesson()]));
  equal(catalog.entries.length, 2);
});

const generator: StudioGenerator = {
  generate(seed, index) {
    return {
      resource: puzzle(`generated-${seed}-${index}`),
      diagnostics: { accepted: index % 2 === 0, difficulty: index + 1, solveNodes: (index + 1) * 10, reason: index % 2 ? "rejected" : "" },
    };
  },
};

test("batch generates deterministic resources", () => {
  const a = studio.generate(create(), { count: 2, seed: 7, kind: "puzzle" }, generator, 101).project;
  const b = studio.generate(create(), { count: 2, seed: 7, kind: "puzzle" }, generator, 101).project;
  equal(a, b);
  equal(a.snapshot.pack.resources.length, 3);
});
test("rejects invalid generation counts", () => {
  throws(() => studio.simulate({ count: 0, seed: 1 }, generator), "between 1 and 1000");
  throws(() => studio.simulate({ count: 1001, seed: 1 }, generator), "between 1 and 1000");
});
test("rejects invalid generation seeds", () => throws(() => studio.simulate({ count: 1, seed: 1.5 }, generator), "seed"));
test("rejects generated kind mismatches", () => throws(() => studio.generate(create(), { count: 1, seed: 1, kind: "lesson" }, generator, 101), "unexpected content kind"));
test("rejects generated duplicate resources", () => {
  const duplicate: StudioGenerator = { generate: () => ({ resource: puzzle() }) };
  throws(() => studio.generate(create(), { count: 1, seed: 1 }, duplicate, 101), "duplicate");
});

test("simulates generation and aggregates metrics", () => {
  const report = studio.simulate({ count: 4, seed: 3 }, generator);
  equal(report.accepted, 2);
  equal(report.rejected, 2);
  equal(report.acceptanceRate, 0.5);
  equal(report.averageDifficulty, 2.5);
  equal(report.averageSolveNodes, 25);
});
test("captures generation failures in simulation", () => {
  const failing: StudioGenerator = { generate: (_seed, index) => { if (index === 1) throw new Error("boom"); return { resource: puzzle(`ok-${index}`) }; } };
  const report = studio.simulate({ count: 2, seed: 1 }, failing);
  equal(report.rejected, 1);
  equal(report.samples[1]?.reason, "boom");
});

test("prepares drafts for review", () => {
  const result = studio.prepareForReview(create([puzzle(), lesson()]), 101);
  ok(result.project.snapshot.pack.resources.every((item) => item.status === "review"));
  ok(result.events.some((event) => event.type === "pack-prepared"));
});
test("publishes reviewed projects", () => {
  const project = create([puzzle("puzzle-001", "review"), lesson("review")]);
  const result = studio.publish(project, 101);
  ok(result.project.snapshot.pack.resources.every((item) => item.status === "published"));
  equal(result.project.savedRevision, result.project.revision);
});
test("rejects unpublishable projects", () => throws(() => studio.publish(create(), 101), "not publishable"));

test("exports canonically and imports safely", () => {
  const project = studio.addResource(create(), puzzle("puzzle-002"), 101).project;
  const serialized = studio.exportProject(project);
  const restored = studio.importProject(serialized);
  equal(studio.exportProject(restored.project), studio.exportProject(project));
  equal(restored.validation.valid, true);
});
test("canonical export is deterministic", () => {
  equal(studio.exportProject(create()), studio.exportProject(create()));
});
test("rejects corrupt project JSON", () => throws(() => studio.importProject("{bad"), "Invalid Studio project JSON"));
test("rejects invalid restored selections", () => {
  const project = create();
  const bad = { ...project, snapshot: { ...project.snapshot, selection: { kind: "puzzle", id: "missing", version: "1.0.0" } } };
  throws(() => studio.importProject(JSON.stringify(bad)), "unknown resource");
});

console.log(`\n${passed}/41 phase-12 Studio tests passed.`);
