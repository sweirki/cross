"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = {
    equal(actual, expected) {
        if (actual !== expected)
            throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
    },
    ok(value) { if (!value)
        throw new Error("Expected a truthy value."); },
    throws(run) {
        let threw = false;
        try {
            run();
        }
        catch {
            threw = true;
        }
        if (!threw)
            throw new Error("Expected function to throw.");
    },
};
const animations_1 = require("../../src/ui/motion/animations");
const persistence_1 = require("../../src/ui/motion/persistence");
const preferences_1 = require("../../src/ui/motion/preferences");
const tokens_1 = require("../../src/ui/motion/tokens");
const transitions_1 = require("../../src/ui/motion/transitions");
let passed = 0;
async function test(name, run) {
    await run();
    passed += 1;
    console.log(`PASS ${name}`);
}
class MemoryStorage {
    values = new Map();
    async getItem(key) { return this.values.get(key) ?? null; }
    async setItem(key, value) { this.values.set(key, value); }
    async removeItem(key) { this.values.delete(key); }
}
async function main() {
    await test("defaults use system motion", () => assert.equal(preferences_1.DEFAULT_MOTION_PREFERENCES.motion, "system"));
    await test("defaults enable animations", () => assert.equal(preferences_1.DEFAULT_MOTION_PREFERENCES.animationsEnabled, true));
    await test("valid preferences accepted", () => assert.equal((0, preferences_1.validateMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES).speed, "standard"));
    await test("invalid schema rejected", () => assert.throws(() => (0, preferences_1.validateMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, schemaVersion: 2 })));
    await test("invalid motion rejected", () => assert.throws(() => (0, preferences_1.validateMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, motion: "bad" })));
    await test("invalid speed rejected", () => assert.throws(() => (0, preferences_1.validateMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, speed: "bad" })));
    await test("system reduction is honored", () => assert.equal((0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, true).level, "reduced"));
    await test("full override ignores system reduction", () => assert.equal((0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, motion: "full" }, true).level, "full"));
    await test("reduce override is honored", () => assert.equal((0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, motion: "reduce" }, false).level, "reduced"));
    await test("disabled animations resolve to none", () => assert.equal((0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, animationsEnabled: false }, false).level, "none"));
    await test("slow speed scales duration", () => assert.equal((0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, speed: "slow" }, false).durationScale, 1.25));
    await test("fast speed scales duration", () => assert.equal((0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, speed: "fast" }, false).durationScale, 0.75));
    await test("preference update is immutable", () => {
        const next = (0, preferences_1.updateMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, { speed: "fast" });
        assert.equal(preferences_1.DEFAULT_MOTION_PREFERENCES.speed, "standard");
        assert.equal(next.speed, "fast");
    });
    await test("serialization is deterministic", () => assert.equal((0, persistence_1.serializeMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES), (0, persistence_1.serializeMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES)));
    await test("serialization round trips", () => assert.equal((0, persistence_1.parseMotionPreferences)((0, persistence_1.serializeMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES)).motion, "system"));
    await test("invalid json rejected", () => assert.throws(() => (0, persistence_1.parseMotionPreferences)("{")));
    await test("non-object json rejected", () => assert.throws(() => (0, persistence_1.parseMotionPreferences)("[]")));
    await test("missing storage returns defaults", async () => assert.equal((await (0, persistence_1.loadMotionPreferences)(new MemoryStorage())).speed, "standard"));
    await test("preferences persist", async () => {
        const storage = new MemoryStorage();
        const value = (0, preferences_1.updateMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, { speed: "fast" });
        await (0, persistence_1.saveMotionPreferences)(storage, value);
        assert.equal((await (0, persistence_1.loadMotionPreferences)(storage)).speed, "fast");
    });
    await test("preferences clear", async () => {
        const storage = new MemoryStorage();
        await (0, persistence_1.saveMotionPreferences)(storage, preferences_1.DEFAULT_MOTION_PREFERENCES);
        await (0, persistence_1.clearMotionPreferences)(storage);
        assert.equal((await (0, persistence_1.loadMotionPreferences)(storage)).motion, "system");
    });
    await test("full motion enables pop", () => assert.equal((0, animations_1.motionAnimation)("pop", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, false)).enabled, true));
    await test("reduced motion disables pop", () => assert.equal((0, animations_1.motionAnimation)("pop", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, true)).enabled, false));
    await test("reduced motion keeps fade", () => assert.equal((0, animations_1.motionAnimation)("fade", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, true)).enabled, true));
    await test("disabled animation has zero duration", () => assert.equal((0, animations_1.motionAnimation)("fade", (0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, animationsEnabled: false }, false)).durationMs, 0));
    await test("speed affects animation duration", () => assert.equal((0, animations_1.motionAnimation)("fade", (0, preferences_1.resolveMotionPreferences)({ ...preferences_1.DEFAULT_MOTION_PREFERENCES, speed: "fast" }, false)).durationMs, 165));
    await test("screen transition uses slide", () => assert.equal((0, transitions_1.motionTransition)("screen-enter", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, false)).animation.name, "slide"));
    await test("overlay transition uses fade", () => assert.equal((0, transitions_1.motionTransition)("overlay", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, false)).animation.name, "fade"));
    await test("tokens are stable", () => assert.equal(tokens_1.MOTION_TOKENS.duration.standard, 220));
    await test("reduced transition has no travel", () => assert.equal((0, transitions_1.motionTransition)("screen-enter", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, true)).animation.distance, 0));
    await test("full transition has travel", () => assert.ok((0, transitions_1.motionTransition)("screen-enter", (0, preferences_1.resolveMotionPreferences)(preferences_1.DEFAULT_MOTION_PREFERENCES, false)).animation.distance > 0));
    console.log(`${passed}/30 milestone-2.4.1 motion-system tests passed.`);
}
void main();
