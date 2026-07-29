"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = {
    equal(actual, expected) {
        if (actual !== expected)
            throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
    },
    ok(value) {
        if (!value)
            throw new Error("Expected a truthy value.");
    },
    deepEqual(actual, expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error("Values are not deeply equal.");
    },
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
const CrossMathGameplayPolish_1 = require("../../src/application/v1/CrossMathGameplayPolish");
const runtime = new CrossMathGameplayPolish_1.CrossMathGameplayPolish();
let passed = 0;
function test(name, run) {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
}
const base = {
    puzzleId: "p1",
    lessonId: "l1",
    moves: 4,
    hintsUsed: 0,
    mistakes: 0,
    elapsedMs: 45_000,
    previousBestMoves: null,
};
test("default preferences enable sound", () => assert.equal(runtime.defaultPreferences().soundEnabled, true));
test("default preferences enable haptics", () => assert.equal(runtime.defaultPreferences().hapticsEnabled, true));
test("default preferences do not reduce motion", () => assert.equal(runtime.defaultPreferences().reducedMotion, false));
test("perfect solve earns three stars", () => assert.equal(runtime.reward(base).stars, 3));
test("perfect solve has perfect performance", () => assert.equal(runtime.reward(base).performance, "perfect"));
test("first solve is personal best", () => assert.equal(runtime.reward(base).personalBest, true));
test("faster move count is personal best", () => assert.equal(runtime.reward({ ...base, previousBestMoves: 5 }).personalBest, true));
test("equal move count is not personal best", () => assert.equal(runtime.reward({ ...base, previousBestMoves: 4 }).personalBest, false));
test("one hint and one mistake earns two stars", () => assert.equal(runtime.reward({ ...base, hintsUsed: 1, mistakes: 1 }).stars, 2));
test("two hints earns one star", () => assert.equal(runtime.reward({ ...base, hintsUsed: 2 }).stars, 1));
test("two mistakes earns one star", () => assert.equal(runtime.reward({ ...base, mistakes: 2 }).stars, 1));
test("accuracy is calculated", () => assert.equal(runtime.reward({ ...base, moves: 5, mistakes: 1 }).accuracyPercent, 80));
test("accuracy does not go below zero", () => assert.equal(runtime.reward({ ...base, moves: 1, mistakes: 3 }).accuracyPercent, 0));
test("zero moves has full accuracy", () => assert.equal(runtime.reward({ ...base, moves: 0 }).accuracyPercent, 100));
test("fast solve receives speed bonus", () => assert.ok(runtime.reward(base).xp > runtime.reward({ ...base, elapsedMs: 300_000 }).xp));
test("hint-free solve receives bonus", () => assert.ok(runtime.reward(base).xp > runtime.reward({ ...base, hintsUsed: 1 }).xp));
test("elapsed time formats seconds", () => assert.equal(runtime.formatElapsed(9_000), "0:09"));
test("elapsed time formats minutes", () => assert.equal(runtime.formatElapsed(125_000), "2:05"));
test("invalid elapsed time throws", () => assert.throws(() => runtime.formatElapsed(-1)));
test("invalid moves throw", () => assert.throws(() => runtime.reward({ ...base, moves: -1 })));
test("invalid hints throw", () => assert.throws(() => runtime.reward({ ...base, hintsUsed: -1 })));
test("invalid mistakes throw", () => assert.throws(() => runtime.reward({ ...base, mistakes: -1 })));
test("tile placement feedback selects", () => assert.equal(runtime.feedback("tile-placed").haptic, "selection"));
test("mistake feedback errors", () => assert.equal(runtime.feedback("mistake").haptic, "error"));
test("victory feedback succeeds", () => assert.equal(runtime.feedback("victory").haptic, "success"));
test("victory feedback celebrates", () => assert.equal(runtime.feedback("victory").animation, "celebrate"));
test("reduced motion suppresses animation", () => assert.equal(runtime.feedback("victory", true).animation, "none"));
test("feedback includes announcement", () => assert.ok(runtime.feedback("hint").announcement.length > 0));
test("preference patch preserves untouched values", () => {
    const next = runtime.mergePreferences(runtime.defaultPreferences(), { soundEnabled: false });
    assert.deepEqual(next, { soundEnabled: false, hapticsEnabled: true, reducedMotion: false });
});
test("preference patch can enable reduced motion", () => {
    assert.equal(runtime.mergePreferences(runtime.defaultPreferences(), { reducedMotion: true }).reducedMotion, true);
});
console.log(`${passed}/30 milestone-2.2 gameplay-polish tests passed.`);
