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
const v1_1 = require("../../src/progression/v1");
const runtime = new v1_1.CrossMathProgressionRuntime();
let passed = 0;
function test(name, run) {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
}
const base = {
    puzzleId: "p1",
    completedAt: "2026-01-01T12:00:00.000Z",
    stars: 3,
    moves: 4,
    hintsUsed: 0,
    mistakes: 0,
    elapsedMs: 45_000,
    mode: "lesson",
};
test("create starts at level one", () => assert.equal(runtime.create("p").level, 1));
test("create starts with zero xp", () => assert.equal(runtime.create("p").totalXp, 0));
test("create rejects empty player", () => assert.throws(() => runtime.create(" ")));
test("level one threshold is zero", () => assert.equal(runtime.xpForLevel(1), 0));
test("level two threshold is one hundred", () => assert.equal(runtime.xpForLevel(2), 100));
test("level three threshold is three hundred", () => assert.equal(runtime.xpForLevel(3), 300));
test("invalid level throws", () => assert.throws(() => runtime.xpForLevel(0)));
test("xp maps to level one", () => assert.equal(runtime.levelForXp(99), 1));
test("xp maps to level two", () => assert.equal(runtime.levelForXp(100), 2));
test("negative xp throws", () => assert.throws(() => runtime.levelForXp(-1)));
test("completion awards xp", () => assert.ok(runtime.recordCompletion(runtime.create("p"), base).xpEarned > 0));
test("completion increments puzzles", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.stats.puzzlesCompleted, 1));
test("completion records stars", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.stats.totalStars, 3));
test("perfect solve increments perfect count", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.stats.perfectSolves, 1));
test("hint-free solve increments hint-free count", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.stats.hintFreeSolves, 1));
test("fastest solve is recorded", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.stats.fastestSolveMs, 45_000));
test("first completion starts streak", () => assert.equal(runtime.recordCompletion(runtime.create("p"), base).state.currentStreak, 1));
test("consecutive date extends streak", () => {
    const first = runtime.recordCompletion(runtime.create("p"), base).state;
    const second = runtime.recordCompletion(first, { ...base, puzzleId: "p2", completedAt: "2026-01-02T12:00:00.000Z" }).state;
    assert.equal(second.currentStreak, 2);
});
test("same date preserves streak", () => {
    const first = runtime.recordCompletion(runtime.create("p"), base).state;
    const second = runtime.recordCompletion(first, { ...base, puzzleId: "p2", completedAt: "2026-01-01T18:00:00.000Z" }).state;
    assert.equal(second.currentStreak, 1);
});
test("missed date resets streak", () => {
    const first = runtime.recordCompletion(runtime.create("p"), base).state;
    const second = runtime.recordCompletion(first, { ...base, puzzleId: "p2", completedAt: "2026-01-04T12:00:00.000Z" }).state;
    assert.equal(second.currentStreak, 1);
});
test("longest streak is retained", () => {
    let state = runtime.create("p");
    state = runtime.recordCompletion(state, base).state;
    state = runtime.recordCompletion(state, { ...base, puzzleId: "p2", completedAt: "2026-01-02T12:00:00.000Z" }).state;
    state = runtime.recordCompletion(state, { ...base, puzzleId: "p3", completedAt: "2026-01-05T12:00:00.000Z" }).state;
    assert.equal(state.longestStreak, 2);
});
test("daily completion increments daily count", () => {
    const result = runtime.recordCompletion(runtime.create("p"), { ...base, mode: "daily" });
    assert.equal(result.state.stats.dailyChallengesCompleted, 1);
});
test("lesson completion increments lesson count", () => {
    const result = runtime.recordCompletion(runtime.create("p"), { ...base, lessonCompleted: true });
    assert.equal(result.state.stats.lessonsCompleted, 1);
});
test("campaign completion increments campaign count", () => {
    const result = runtime.recordCompletion(runtime.create("p"), { ...base, campaignCompleted: true });
    assert.equal(result.state.stats.campaignsCompleted, 1);
});
test("first solve achievement unlocks", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).newlyUnlocked.includes("first-solve"));
});
test("perfect achievement unlocks", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).newlyUnlocked.includes("perfect-solve"));
});
test("hint-free achievement unlocks", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).newlyUnlocked.includes("hint-free"));
});
test("fast achievement unlocks", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).newlyUnlocked.includes("fast-solve"));
});
test("achievement does not unlock twice", () => {
    const first = runtime.recordCompletion(runtime.create("p"), base).state;
    const second = runtime.recordCompletion(first, { ...base, puzzleId: "p2", completedAt: "2026-01-02T12:00:00.000Z" });
    assert.ok(!second.newlyUnlocked.includes("first-solve"));
});
test("duplicate completion is idempotent", () => {
    const first = runtime.recordCompletion(runtime.create("p"), base);
    const second = runtime.recordCompletion(first.state, base);
    assert.equal(second.state, first.state);
    assert.equal(second.xpEarned, 0);
});
test("reward queue begins with xp", () => {
    assert.equal(runtime.recordCompletion(runtime.create("p"), base).rewards[0]?.kind, "xp");
});
test("level up reward is queued", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).rewards.some(item => item.kind === "level-up"));
});
test("achievement reward is queued", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).rewards.some(item => item.kind === "achievement"));
});
test("badge reward is queued", () => {
    assert.ok(runtime.recordCompletion(runtime.create("p"), base).rewards.some(item => item.kind === "badge"));
});
test("dismiss first reward", () => {
    const state = runtime.recordCompletion(runtime.create("p"), base).state;
    assert.equal(runtime.dismissReward(state).rewardQueue.length, state.rewardQueue.length - 1);
});
test("dismiss missing reward changes nothing", () => {
    const state = runtime.recordCompletion(runtime.create("p"), base).state;
    assert.equal(runtime.dismissReward(state, "missing"), state);
});
test("clear rewards empties queue", () => {
    const state = runtime.recordCompletion(runtime.create("p"), base).state;
    assert.equal(runtime.clearRewards(state).rewardQueue.length, 0);
});
test("average solve time is null initially", () => assert.equal(runtime.averageSolveTimeMs(runtime.create("p")), null));
test("average solve time is calculated", () => {
    let state = runtime.recordCompletion(runtime.create("p"), base).state;
    state = runtime.recordCompletion(state, { ...base, puzzleId: "p2", completedAt: "2026-01-02T12:00:00.000Z", elapsedMs: 75_000 }).state;
    assert.equal(runtime.averageSolveTimeMs(state), 60_000);
});
test("level progress is bounded", () => {
    const progress = runtime.levelProgress(runtime.recordCompletion(runtime.create("p"), base).state);
    assert.ok(progress.percent >= 0 && progress.percent <= 100);
});
test("achievement catalog has unique ids", () => {
    assert.equal(new Set(v1_1.ACHIEVEMENTS.map(item => item.id)).size, v1_1.ACHIEVEMENTS.length);
});
test("unknown achievement throws", () => assert.throws(() => runtime.achievement("missing")));
test("serialization is deterministic", () => {
    const state = runtime.recordCompletion(runtime.create("p"), base).state;
    assert.equal(runtime.serialize(state), runtime.serialize(state));
});
test("restore round trips", () => {
    const state = runtime.recordCompletion(runtime.create("p"), base).state;
    assert.equal(runtime.serialize(runtime.restore("p", runtime.serialize(state))), runtime.serialize(state));
});
test("restore rejects invalid json", () => assert.throws(() => runtime.restore("p", "{")));
test("restore rejects another player", () => assert.throws(() => runtime.restore("q", runtime.serialize(runtime.create("p")))));
test("invalid puzzle id throws", () => assert.throws(() => runtime.recordCompletion(runtime.create("p"), { ...base, puzzleId: "" })));
test("invalid date throws", () => assert.throws(() => runtime.recordCompletion(runtime.create("p"), { ...base, completedAt: "bad" })));
test("invalid moves throw", () => assert.throws(() => runtime.recordCompletion(runtime.create("p"), { ...base, moves: -1 })));
test("invalid elapsed time throws", () => assert.throws(() => runtime.recordCompletion(runtime.create("p"), { ...base, elapsedMs: -1 })));
console.log(`${passed}/50 milestone-2.3 progression tests passed.`);
