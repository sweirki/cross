"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v1_1 = require("../../src/content/v1");
let passed = 0;
function test(name, run) {
    try {
        run();
        passed += 1;
        console.log(`PASS ${name}`);
    }
    catch (error) {
        console.error(`FAIL ${name}`);
        throw error;
    }
}
function equal(actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}
function ok(value, message = "Expected truthy value") {
    if (!value)
        throw new Error(message);
}
function throws(run, text) {
    let error;
    try {
        run();
    }
    catch (caught) {
        error = caught;
    }
    if (!(error instanceof Error))
        throw new Error("Expected function to throw");
    if (text && !error.message.includes(text))
        throw new Error(`Expected error containing ${text}, received ${error.message}`);
}
const lesson = (status = "draft") => ({
    schemaVersion: 1,
    kind: "lesson",
    id: "addition-basics",
    version: "1.0.0",
    status,
    title: "Addition Basics",
    tags: ["addition", "beginner"],
    dependencies: [{ kind: "puzzle", id: "puzzle-001", version: "1.0.0" }],
    payload: { puzzleId: "puzzle-001" },
});
const puzzle = (status = "draft") => ({
    schemaVersion: 1,
    kind: "puzzle",
    id: "puzzle-001",
    version: "1.0.0",
    status,
    title: "First Addition",
    tags: ["addition"],
    dependencies: [],
    payload: { board: [] },
});
const pack = (resources = [puzzle(), lesson()]) => ({
    schemaVersion: 1,
    id: "starter-pack",
    version: "1.0.0",
    title: "Starter Pack",
    minimumEngineVersion: "1.0.0",
    createdAt: 1000,
    resources,
});
const platform = new v1_1.CrossMathContentPlatform();
test("validates a content pack", () => equal(platform.validatePack(pack()).valid, true));
test("rejects invalid pack IDs", () => equal(platform.validatePack({ ...pack(), id: "Bad ID" }).valid, false));
test("rejects invalid pack versions", () => equal(platform.validatePack({ ...pack(), version: "1" }).valid, false));
test("rejects empty pack titles", () => equal(platform.validatePack({ ...pack(), title: " " }).valid, false));
test("rejects invalid minimum engine versions", () => equal(platform.validatePack({ ...pack(), minimumEngineVersion: "latest" }).valid, false));
test("rejects invalid creation times", () => equal(platform.validatePack({ ...pack(), createdAt: -1 }).valid, false));
test("rejects empty packs", () => equal(platform.validatePack({ ...pack(), resources: [] }).valid, false));
test("rejects duplicate resources", () => equal(platform.validatePack(pack([puzzle(), puzzle()])).valid, false));
test("rejects missing required dependencies", () => equal(platform.validatePack(pack([lesson()])).valid, false));
test("warns for missing optional dependencies", () => {
    const value = { ...lesson(), dependencies: [{ kind: "puzzle", id: "missing", optional: true }] };
    const result = platform.validatePack(pack([value]));
    ok(result.valid);
    ok(result.issues.some((issue) => issue.code === "dependency.optional-missing"));
});
test("rejects self dependencies", () => {
    const value = { ...puzzle(), dependencies: [{ kind: "puzzle", id: "puzzle-001" }] };
    equal(platform.validatePack(pack([value])).valid, false);
});
test("rejects published resources with unpublished dependencies", () => {
    equal(platform.validatePack(pack([puzzle("review"), lesson("published")])).valid, false);
});
test("accepts published dependency graphs", () => equal(platform.validatePack(pack([puzzle("published"), lesson("published")])).valid, true));
test("seals and verifies pack integrity", () => {
    const sealed = platform.seal(pack());
    ok(platform.verifyIntegrity(sealed));
});
test("detects integrity tampering", () => {
    const sealed = platform.seal(pack());
    equal(platform.verifyIntegrity({ ...sealed, title: "Tampered" }), false);
});
test("reports invalid integrity during validation", () => {
    const sealed = platform.seal(pack());
    equal(platform.validatePack({ ...sealed, title: "Tampered" }).valid, false);
});
test("moves resources from draft to review", () => {
    const transition = platform.changeResourceStatus(pack(), "puzzle", "puzzle-001", "review");
    equal(transition.pack.resources[0]?.status, "review");
    equal(transition.events.length, 1);
    ok(platform.verifyIntegrity(transition.pack));
});
test("rejects invalid publishing transitions", () => throws(() => platform.changeResourceStatus(pack(), "puzzle", "puzzle-001", "published"), "Invalid status transition"));
test("rejects unknown status targets", () => throws(() => platform.changeResourceStatus(pack(), "puzzle", "missing", "review"), "Unknown resource"));
test("publishes reviewed packs", () => {
    const result = platform.publish(pack([puzzle("review"), lesson("review")]));
    ok(result.pack.resources.every((resource) => resource.status === "published"));
    ok(result.events.some((event) => event.type === "pack-published"));
    ok(platform.verifyIntegrity(result.pack));
});
test("rejects publishing draft resources", () => throws(() => platform.publish(pack()), "review"));
test("archives published resources", () => {
    const result = platform.changeResourceStatus(pack([puzzle("published"), lesson("published")]), "lesson", "addition-basics", "archived");
    equal(result.pack.resources[1]?.status, "archived");
});
test("rejects transitions out of archived", () => throws(() => platform.changeResourceStatus(pack([puzzle("published"), lesson("archived")]), "lesson", "addition-basics", "draft"), "Invalid status transition"));
const migration = {
    kind: "lesson",
    fromSchemaVersion: 1,
    toSchemaVersion: 2,
    migrate(payload) {
        return { ...payload, migrated: true };
    },
};
const migrating = new v1_1.CrossMathContentPlatform([migration]);
test("migrates resources", () => {
    const result = migrating.migrateResource("starter-pack", lesson(), 2);
    equal(result.resource.schemaVersion, 2);
    equal(result.resource.payload.migrated, true);
    equal(result.events.length, 1);
});
test("rejects missing migrations", () => throws(() => migrating.migrateResource("starter-pack", lesson(), 3), "Missing migration"));
test("rejects backwards migrations", () => throws(() => migrating.migrateResource("starter-pack", { ...lesson(), schemaVersion: 2 }, 1), "cannot be lower"));
test("rejects skipped migration definitions", () => throws(() => new v1_1.CrossMathContentPlatform([{ ...migration, toSchemaVersion: 3 }]), "exactly one"));
test("rejects duplicate migration definitions", () => throws(() => new v1_1.CrossMathContentPlatform([migration, migration]), "Duplicate migration"));
test("builds deterministic catalogs", () => {
    const catalog = platform.buildCatalog([platform.seal(pack())]);
    equal(catalog.entries.length, 2);
    equal(catalog.entries.map((entry) => entry.kind), ["lesson", "puzzle"]);
});
test("rejects invalid packs during cataloging", () => throws(() => platform.buildCatalog([{ ...pack(), id: "BAD" }]), "invalid pack"));
test("queries catalog by kind and status", () => {
    const catalog = platform.buildCatalog([pack([puzzle("published"), lesson("published")])]);
    equal(platform.query(catalog, { kinds: ["lesson"], statuses: ["published"] }).length, 1);
});
test("queries catalog by tags and text", () => {
    const catalog = platform.buildCatalog([pack()]);
    equal(platform.query(catalog, { tags: ["addition"], text: "basics" }).map((entry) => entry.id), ["addition-basics"]);
});
test("checks compatible engine versions", () => equal(platform.checkCompatibility(pack(), "1.2.0").compatible, true));
test("rejects old engine versions", () => equal(platform.checkCompatibility(pack(), "0.9.0").compatible, false));
test("rejects malformed engine versions", () => equal(platform.checkCompatibility(pack(), "latest").compatible, false));
test("serializes packs canonically", () => {
    const sealed = platform.seal(pack());
    equal(platform.serializePack(sealed), platform.serializePack(sealed));
});
test("restores valid packs safely", () => {
    const sealed = platform.seal(pack());
    equal(platform.restorePack(platform.serializePack(sealed)), JSON.parse(platform.serializePack(sealed)));
});
test("rejects corrupt JSON", () => throws(() => platform.restorePack("{"), "Invalid content pack JSON"));
test("rejects tampered persisted packs", () => {
    const sealed = platform.seal(pack());
    const serialized = platform.serializePack(sealed).replace("Starter Pack", "Changed Pack");
    throws(() => platform.restorePack(serialized), "integrity");
});
console.log(`\n${passed}/${passed} phase-11 content-platform tests passed.`);
