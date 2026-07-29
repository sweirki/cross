const assert = {
  equal(actual: unknown, expected: unknown): void {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
  },
  ok(value: unknown): void { if (!value) throw new Error("Expected truthy value."); },
  same(actual: unknown, expected: unknown): void {
    if (actual !== expected) throw new Error("Expected identical references.");
  },
  throws(run: () => unknown): void {
    let threw = false; try { run(); } catch { threw = true; }
    if (!threw) throw new Error("Expected function to throw.");
  },
};
import { EMPTY_ANNOUNCEMENT_QUEUE, dequeueAnnouncement, enqueueAnnouncement } from "../../src/ui/device/announcementQueue";
import { deviceFeelCue, deviceFeelCues } from "../../src/ui/device/cues";
import { loadDevicePreferences, saveDevicePreferences } from "../../src/ui/device/persistence";
import { DEFAULT_DEVICE_PREFERENCES, parseDevicePreferences, updateDevicePreferences } from "../../src/ui/device/preferences";
import { DeviceFeelServices } from "../../src/ui/device/services";
import type { AccessibilityDriver, AudioDriver, HapticsDriver } from "../../src/ui/device/types";

let passed = 0;
async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  await run(); passed += 1; console.log(`PASS ${name}`);
}
const base = DEFAULT_DEVICE_PREFERENCES;

async function main(): Promise<void> {
await test("defaults enable haptics", () => assert.equal(base.hapticsEnabled,true));
await test("defaults enable sound", () => assert.equal(base.soundEnabled,true));
await test("defaults optimize screen readers", () => assert.equal(base.screenReaderOptimizations,true));
await test("defaults use standard verbosity", () => assert.equal(base.announcementVerbosity,"standard"));
await test("invalid preferences return defaults", () => assert.same(parseDevicePreferences(null),base));
await test("partial preferences preserve defaults", () => assert.equal(parseDevicePreferences({soundEnabled:false}).hapticsEnabled,true));
await test("sound preference parses", () => assert.equal(parseDevicePreferences({soundEnabled:false}).soundEnabled,false));
await test("invalid verbosity falls back", () => assert.equal(parseDevicePreferences({announcementVerbosity:"loud"}).announcementVerbosity,"standard"));
await test("updates are immutable", () => {
  const next=updateDevicePreferences(base,{soundEnabled:false}); assert.equal(next.soundEnabled,false); assert.equal(base.soundEnabled,true);
});
await test("tile selection maps haptic", () => assert.equal(deviceFeelCue({kind:"tile-select"},base,0).haptic,"selection"));
await test("tile placement maps sound", () => assert.equal(deviceFeelCue({kind:"tile-place"},base,0).sound,"place"));
await test("invalid maps warning", () => assert.equal(deviceFeelCue({kind:"invalid"},base,0).haptic,"warning"));
await test("equation maps success", () => assert.equal(deviceFeelCue({kind:"equation-complete"},base,0).sound,"success"));
await test("victory maps celebration", () => assert.equal(deviceFeelCue({kind:"victory"},base,0).haptic,"celebration"));
await test("achievement maps reward", () => assert.equal(deviceFeelCue({kind:"achievement"},base,0).sound,"reward"));
await test("level up maps reward", () => assert.equal(deviceFeelCue({kind:"level-up"},base,0).sound,"reward"));
await test("disabled haptics map null", () => assert.equal(deviceFeelCue({kind:"victory"},updateDevicePreferences(base,{hapticsEnabled:false}),0).haptic,null));
await test("disabled sound maps null", () => assert.equal(deviceFeelCue({kind:"victory"},updateDevicePreferences(base,{soundEnabled:false}),0).sound,null));
await test("screen reader disabled maps no announcement", () => assert.equal(deviceFeelCue({kind:"victory"},updateDevicePreferences(base,{screenReaderOptimizations:false}),0).announcement,null));
await test("minimal verbosity suppresses tile announcement", () => assert.equal(deviceFeelCue({kind:"tile-select"},updateDevicePreferences(base,{announcementVerbosity:"minimal"}),0).announcement,null));
await test("minimal verbosity keeps victory", () => assert.equal(deviceFeelCue({kind:"victory"},updateDevicePreferences(base,{announcementVerbosity:"minimal"}),0).announcement,"Puzzle completed."));
await test("custom message is trimmed", () => assert.equal(deviceFeelCue({kind:"victory",message:" Done! "},base,0).announcement,"Done!"));
await test("target is trimmed", () => assert.equal(deviceFeelCue({kind:"tile-place",targetId:" c1 "},base,0).targetId,"c1"));
await test("blank target becomes null", () => assert.equal(deviceFeelCue({kind:"tile-place",targetId:" "},base,0).targetId,null));
await test("invalid cue is assertive", () => assert.equal(deviceFeelCue({kind:"invalid"},base,0).politeness,"assertive"));
await test("selection cue is polite", () => assert.equal(deviceFeelCue({kind:"tile-select"},base,0).politeness,"polite"));
await test("negative sequence rejected", () => assert.throws(()=>deviceFeelCue({kind:"victory"},base,-1)));
await test("fractional sequence rejected", () => assert.throws(()=>deviceFeelCue({kind:"victory"},base,1.5)));
await test("cue list sequence deterministic", () => {
  const cues=deviceFeelCues([{kind:"tile-select"},{kind:"victory"}],base,4); assert.equal(cues[0]?.sequence,4); assert.equal(cues[1]?.sequence,5);
});
await test("invalid list sequence rejected", () => assert.throws(()=>deviceFeelCues([],base,-1)));
await test("empty queue returns no announcement", () => assert.equal(dequeueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE).announcement,null));
await test("blank announcement ignored", () => assert.same(enqueueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE," "),EMPTY_ANNOUNCEMENT_QUEUE));
await test("announcement is trimmed", () => assert.equal(enqueueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE," Hello ").pending[0]?.message,"Hello"));
await test("duplicate announcement suppressed", () => {
  const first=enqueueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE,"Hello"); assert.same(enqueueAnnouncement(first,"Hello"),first);
});
await test("queue preserves ordering", () => {
  const queue=enqueueAnnouncement(enqueueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE,"One"),"Two");
  assert.equal(queue.pending[0]?.message,"One"); assert.equal(queue.pending[1]?.message,"Two");
});
await test("dequeue preserves remainder", () => {
  const queue=enqueueAnnouncement(enqueueAnnouncement(EMPTY_ANNOUNCEMENT_QUEUE,"One"),"Two");
  const result=dequeueAnnouncement(queue); assert.equal(result.announcement?.message,"One"); assert.equal(result.queue.pending[0]?.message,"Two");
});
await test("missing persistence uses defaults", async () => {
  const storage={getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};
  assert.same(await loadDevicePreferences(storage),base);
});
await test("invalid persistence uses defaults", async () => {
  const storage={getItem:async()=>"{bad",setItem:async()=>{},removeItem:async()=>{}};
  assert.same(await loadDevicePreferences(storage),base);
});
await test("preferences save deterministically", async () => {
  let saved=""; const storage={getItem:async()=>saved||null,setItem:async(_k:string,v:string)=>{saved=v;},removeItem:async()=>{}};
  await saveDevicePreferences(storage,updateDevicePreferences(base,{soundEnabled:false}));
  assert.equal((await loadDevicePreferences(storage)).soundEnabled,false);
});
await test("services perform all enabled channels", async () => {
  const calls:string[]=[];
  const h:HapticsDriver={trigger:async token=>{calls.push(`h:${token}`);}};
  const a:AudioDriver={play:async token=>{calls.push(`a:${token}`);}};
  const x:AccessibilityDriver={announce:m=>calls.push(`x:${m}`),focus:id=>calls.push(`f:${id}`)};
  await new DeviceFeelServices(h,a,x).perform(deviceFeelCue({kind:"victory",targetId:"42"},base,0));
  assert.ok(calls.includes("h:celebration")); assert.ok(calls.includes("a:victory")); assert.ok(calls.includes("x:Puzzle completed.")); assert.ok(calls.includes("f:42"));
});
await test("service failures degrade to no-op", async () => {
  const h:HapticsDriver={trigger:async()=>{throw new Error("unsupported");}};
  const a:AudioDriver={play:async()=>{throw new Error("missing");}};
  const x:AccessibilityDriver={announce:()=>{}};
  await new DeviceFeelServices(h,a,x).perform(deviceFeelCue({kind:"victory"},base,0));
  assert.ok(true);
});
console.log(`${passed}/41 milestone-2.4.3 device-feel tests passed.`);
}
void main();
