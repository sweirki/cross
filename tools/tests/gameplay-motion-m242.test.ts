const assert = {
  equal(actual: unknown, expected: unknown): void {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
  },
  ok(value: unknown): void { if (!value) throw new Error("Expected a truthy value."); },
  same(actual: unknown, expected: unknown): void { if (actual !== expected) throw new Error("Expected references to be identical."); },
  throws(run: () => unknown): void {
    let threw = false; try { run(); } catch { threw = true; }
    if (!threw) throw new Error("Expected function to throw.");
  },
};
import {
  gameplayMotionCue,
  gameplayMotionCues,
  INITIAL_GAMEPLAY_MOTION_SNAPSHOT,
  reduceGameplayMotion,
} from "../../src/ui/motion/gameplay";
import { DEFAULT_MOTION_PREFERENCES, resolveMotionPreferences } from "../../src/ui/motion/preferences";

let passed = 0;
function test(name: string, run: () => void): void {
  run(); passed += 1; console.log(`PASS ${name}`);
}
const full = resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, false);
const reduced = resolveMotionPreferences(DEFAULT_MOTION_PREFERENCES, true);
const none = resolveMotionPreferences({ ...DEFAULT_MOTION_PREFERENCES, animationsEnabled: false }, false);

function requiredGameplayMotionCue(
  ...args: Parameters<typeof gameplayMotionCue>
): NonNullable<ReturnType<typeof gameplayMotionCue>> {
  const cue = gameplayMotionCue(...args);
  if (cue === null) throw new Error("Expected gameplay motion cue.");
  return cue;
}

test("tile selection uses pop", () => assert.equal(requiredGameplayMotionCue({kind:"tile-select",targetId:"t1"},full,0).animation.name,"pop"));
test("tile placement uses pop", () => assert.equal(requiredGameplayMotionCue({kind:"tile-place",targetId:"c1"},full,0).animation.name,"pop"));
test("tile removal uses fade", () => assert.equal(requiredGameplayMotionCue({kind:"tile-remove",targetId:"c1"},full,0).animation.name,"fade"));
test("equation completion uses glow", () => assert.equal(requiredGameplayMotionCue({kind:"equation-complete",targetId:"e1"},full,0).animation.name,"glow"));
test("mistake uses shake", () => assert.equal(requiredGameplayMotionCue({kind:"mistake",targetId:"e1"},full,0).animation.name,"shake"));
test("victory uses confetti", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},full,0).animation.name,"confetti"));
test("board reset uses fade", () => assert.equal(requiredGameplayMotionCue({kind:"board-reset"},full,0).animation.name,"fade"));
test("board reset includes transition", () => assert.equal(requiredGameplayMotionCue({kind:"board-reset"},full,0).transition?.name,"board-change"));
test("other cues omit transition", () => assert.equal(requiredGameplayMotionCue({kind:"tile-place"},full,0).transition,null));
test("target is preserved", () => assert.equal(requiredGameplayMotionCue({kind:"tile-place",targetId:" c1 "},full,0).targetId,"c1"));
test("blank target normalizes to null", () => assert.equal(requiredGameplayMotionCue({kind:"tile-place",targetId:" "},full,0).targetId,null));
test("missing target is null", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},full,0).targetId,null));
test("sequence is preserved", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},full,7).sequence,7));
test("negative sequence rejected", () => assert.throws(() => requiredGameplayMotionCue({kind:"victory"},full,-1)));
test("fractional sequence rejected", () => assert.throws(() => requiredGameplayMotionCue({kind:"victory"},full,1.5)));
test("tile selection is subtle", () => assert.equal(requiredGameplayMotionCue({kind:"tile-select"},full,0).emphasis,"subtle"));
test("mistake is strong", () => assert.equal(requiredGameplayMotionCue({kind:"mistake"},full,0).emphasis,"strong"));
test("victory is strong", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},full,0).emphasis,"strong"));
test("removal has no emphasis", () => assert.equal(requiredGameplayMotionCue({kind:"tile-remove"},full,0).emphasis,"none"));
test("full mistake is enabled", () => assert.equal(requiredGameplayMotionCue({kind:"mistake"},full,0).animation.enabled,true));
test("reduced mistake is suppressed", () => assert.equal(requiredGameplayMotionCue({kind:"mistake"},reduced,0).animation.enabled,false));
test("reduced equation glow remains", () => assert.equal(requiredGameplayMotionCue({kind:"equation-complete"},reduced,0).animation.enabled,true));
test("reduced tile pop is suppressed", () => assert.equal(requiredGameplayMotionCue({kind:"tile-place"},reduced,0).animation.enabled,false));
test("disabled victory is suppressed", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},none,0).animation.enabled,false));
test("disabled cue has zero duration", () => assert.equal(requiredGameplayMotionCue({kind:"victory"},none,0).animation.durationMs,0));
test("cue list assigns deterministic sequences", () => {
  const cues=gameplayMotionCues([{kind:"tile-place"},{kind:"equation-complete"}],full,4);
  assert.equal(cues[0]?.sequence,4); assert.equal(cues[1]?.sequence,5);
});
test("empty cue list is empty", () => assert.equal(gameplayMotionCues([],full).length,0));
test("invalid start sequence rejected", () => assert.throws(() => gameplayMotionCues([],full,-2)));
test("initial snapshot has no cue", () => assert.equal(INITIAL_GAMEPLAY_MOTION_SNAPSHOT.cue,null));
test("tile cue updates tile target", () => {
  const cue=requiredGameplayMotionCue({kind:"tile-select",targetId:"t1"},full,0);
  assert.equal(reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,cue).tileId,"t1");
});
test("place cue updates cell target", () => {
  const cue=requiredGameplayMotionCue({kind:"tile-place",targetId:"c1"},full,0);
  assert.equal(reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,cue).cellId,"c1");
});
test("equation cue updates equation target", () => {
  const cue=requiredGameplayMotionCue({kind:"equation-complete",targetId:"e1"},full,0);
  assert.equal(reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,cue).equationId,"e1");
});
test("reset increments board revision", () => {
  const cue=requiredGameplayMotionCue({kind:"board-reset"},full,0);
  assert.equal(reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,cue).boardRevision,1);
});
test("victory increments victory revision", () => {
  const cue=requiredGameplayMotionCue({kind:"victory"},full,0);
  assert.equal(reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,cue).victoryRevision,1);
});
test("stale cues are ignored", () => {
  const first=reduceGameplayMotion(INITIAL_GAMEPLAY_MOTION_SNAPSHOT,requiredGameplayMotionCue({kind:"victory"},full,2));
  const stale=requiredGameplayMotionCue({kind:"mistake"},full,1);
  assert.same(reduceGameplayMotion(first,stale),first);
});
console.log(`${passed}/35 milestone-2.4.2 gameplay-motion tests passed.`);
