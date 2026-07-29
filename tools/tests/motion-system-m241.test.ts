const assert = {
  equal(actual: unknown, expected: unknown): void {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
  },
  ok(value: unknown): void { if (!value) throw new Error("Expected a truthy value."); },
  throws(run: () => unknown): void {
    let threw = false; try { run(); } catch { threw = true; }
    if (!threw) throw new Error("Expected function to throw.");
  },
};
import { motionAnimation } from "../../src/ui/motion/animations";
import {
  clearMotionPreferences, loadMotionPreferences, parseMotionPreferences,
  saveMotionPreferences, serializeMotionPreferences,
} from "../../src/ui/motion/persistence";
import {
  DEFAULT_MOTION_PREFERENCES, resolveMotionPreferences, updateMotionPreferences,
  validateMotionPreferences,
} from "../../src/ui/motion/preferences";
import { MOTION_TOKENS } from "../../src/ui/motion/tokens";
import { motionTransition } from "../../src/ui/motion/transitions";
import type { MotionPreferenceStorage } from "../../src/ui/motion/types";

let passed = 0;
async function test(name: string, run: () => unknown | Promise<unknown>): Promise<void> {
  await run(); passed += 1; console.log(`PASS ${name}`);
}
class MemoryStorage implements MotionPreferenceStorage {
  readonly values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async removeItem(key: string) { this.values.delete(key); }
}

async function main(): Promise<void> {
await test("defaults use system motion", () => assert.equal(DEFAULT_MOTION_PREFERENCES.motion, "system"));
await test("defaults enable animations", () => assert.equal(DEFAULT_MOTION_PREFERENCES.animationsEnabled, true));
await test("valid preferences accepted", () => assert.equal(validateMotionPreferences(DEFAULT_MOTION_PREFERENCES).speed, "standard"));
await test("invalid schema rejected", () => assert.throws(() => validateMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, schemaVersion: 2 as 1 })));
await test("invalid motion rejected", () => assert.throws(() => validateMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, motion: "bad" as never })));
await test("invalid speed rejected", () => assert.throws(() => validateMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, speed: "bad" as never })));
await test("system reduction is honored", () => assert.equal(resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, true).level, "reduced"));
await test("full override ignores system reduction", () => assert.equal(resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, motion: "full" }, true).level, "full"));
await test("reduce override is honored", () => assert.equal(resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, motion: "reduce" }, false).level, "reduced"));
await test("disabled animations resolve to none", () => assert.equal(resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, animationsEnabled: false }, false).level, "none"));
await test("slow speed scales duration", () => assert.equal(resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, speed: "slow" }, false).durationScale, 1.25));
await test("fast speed scales duration", () => assert.equal(resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, speed: "fast" }, false).durationScale, 0.75));
await test("preference update is immutable", () => {
  const next = updateMotionPreferences(DEFAULT_MOTION_PREFERENCES, { speed: "fast" });
  assert.equal(DEFAULT_MOTION_PREFERENCES.speed, "standard"); assert.equal(next.speed, "fast");
});
await test("serialization is deterministic", () => assert.equal(serializeMotionPreferences(DEFAULT_MOTION_PREFERENCES), serializeMotionPreferences(DEFAULT_MOTION_PREFERENCES)));
await test("serialization round trips", () => assert.equal(parseMotionPreferences(serializeMotionPreferences(DEFAULT_MOTION_PREFERENCES)).motion, "system"));
await test("invalid json rejected", () => assert.throws(() => parseMotionPreferences("{")));
await test("non-object json rejected", () => assert.throws(() => parseMotionPreferences("[]")));
await test("missing storage returns defaults", async () => assert.equal((await loadMotionPreferences(new MemoryStorage())).speed, "standard"));
await test("preferences persist", async () => {
  const storage = new MemoryStorage(); const value = updateMotionPreferences(DEFAULT_MOTION_PREFERENCES, { speed: "fast" });
  await saveMotionPreferences(storage, value); assert.equal((await loadMotionPreferences(storage)).speed, "fast");
});
await test("preferences clear", async () => {
  const storage = new MemoryStorage(); await saveMotionPreferences(storage, DEFAULT_MOTION_PREFERENCES);
  await clearMotionPreferences(storage); assert.equal((await loadMotionPreferences(storage)).motion, "system");
});
await test("full motion enables pop", () => assert.equal(motionAnimation("pop", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, false)).enabled, true));
await test("reduced motion disables pop", () => assert.equal(motionAnimation("pop", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, true)).enabled, false));
await test("reduced motion keeps fade", () => assert.equal(motionAnimation("fade", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, true)).enabled, true));
await test("disabled animation has zero duration", () => assert.equal(motionAnimation("fade", resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, animationsEnabled: false }, false)).durationMs, 0));
await test("speed affects animation duration", () => assert.equal(motionAnimation("fade", resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, speed: "fast" }, false)).durationMs, 165));
await test("screen transition uses slide", () => assert.equal(motionTransition("screen-enter", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, false)).animation.name, "slide"));
await test("overlay transition uses fade", () => assert.equal(motionTransition("overlay", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, false)).animation.name, "fade"));
await test("tokens are stable", () => assert.equal(MOTION_TOKENS.duration.standard, 220));
await test("reduced transition has no travel", () => assert.equal(motionTransition("screen-enter", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, true)).animation.distance, 0));
await test("full transition has travel", () => assert.ok(motionTransition("screen-enter", resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, false)).animation.distance > 0));
console.log(`${passed}/30 milestone-2.4.1 motion-system tests passed.`);
}
void main();
