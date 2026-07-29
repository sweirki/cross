"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("../../src/game/runtime");
const v1_1 = require("../../src/learning/v1");
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
function equal(actual, expected, message) {
    if (actual !== expected)
        throw new Error(`${message} Expected ${String(expected)}, got ${String(actual)}.`);
}
function throws(body, message) {
    let failed = false;
    try {
        body();
    }
    catch {
        failed = true;
    }
    assert(failed, message);
}
const puzzle = {
    schemaVersion: 1,
    id: "learning-puzzle",
    difficulty: "easy",
    width: 5,
    height: 1,
    cells: [
        { id: "a", kind: "number", position: { row: 0, col: 0 }, value: null, solution: 2, given: false, editable: true },
        { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
        { id: "b", kind: "number", position: { row: 0, col: 2 }, value: 3, solution: 3, given: true, editable: false },
        { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
        { id: "c", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
    ],
    equations: [{ id: "e", orientation: "horizontal", cellIds: ["a", "op", "b", "eq", "c"], operator: "+" }],
    numberBank: [{ id: "two", value: 2 }, { id: "five", value: 5 }],
};
const lesson = {
    schemaVersion: 1,
    id: "lesson-1",
    title: "First equation",
    puzzleId: puzzle.id,
    minimumStarsToMaster: 3,
    objectives: [
        { id: "place", type: "place-tiles", count: 2 },
        { id: "equation", type: "complete-equations", count: 1 },
        { id: "solve", type: "solve-puzzle" },
        { id: "no-hints", type: "finish-without-hints" },
        { id: "moves", type: "finish-within-moves", maxMoves: 2 },
        { id: "time", type: "finish-within-time", maxElapsedMs: 5000 },
    ],
};
const lesson2 = {
    schemaVersion: 1,
    id: "lesson-2",
    title: "Second equation",
    puzzleId: puzzle.id,
    minimumStarsToMaster: 1,
    objectives: [{ id: "solve", type: "solve-puzzle" }],
};
const campaign = {
    schemaVersion: 1,
    id: "campaign",
    title: "Starter campaign",
    chapters: [
        { id: "chapter-1", title: "Start", lessonIds: ["lesson-1"] },
        { id: "chapter-2", title: "Continue", lessonIds: ["lesson-2"] },
    ],
    lessons: [lesson, lesson2],
};
const gameRuntime = new runtime_1.CrossMathGameRuntime();
const runtime = new v1_1.CrossMathLearningRuntime();
let count = 0;
function test(name, body) {
    body();
    count += 1;
    console.log(`PASS ${name}`);
}
function completeLesson(definition = lesson) {
    let learning = runtime.createLesson(definition);
    let game = gameRuntime.create(puzzle);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "advance-time", milliseconds: 3000 });
    learning = runtime.observe(definition, learning.state, game);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "a", tileId: "two" });
    learning = runtime.observe(definition, learning.state, game);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "c", tileId: "five" });
    learning = runtime.observe(definition, learning.state, game);
    return learning.state;
}
test("validates lesson definitions", () => {
    (0, v1_1.validateLessonDefinition)(lesson);
    throws(() => (0, v1_1.validateLessonDefinition)({ ...lesson, objectives: [] }), "Empty lesson accepted.");
    throws(() => (0, v1_1.validateLessonDefinition)({
        ...lesson,
        objectives: [{ id: "x", type: "place-tiles", count: 0 }],
    }), "Invalid objective count accepted.");
});
test("rejects duplicate objective IDs", () => {
    throws(() => (0, v1_1.validateLessonDefinition)({
        ...lesson,
        objectives: [
            { id: "same", type: "solve-puzzle" },
            { id: "same", type: "finish-without-hints" },
        ],
    }), "Duplicate objectives accepted.");
});
test("validates campaign definitions", () => {
    (0, v1_1.validateCampaignDefinition)(campaign);
    throws(() => (0, v1_1.validateCampaignDefinition)({
        ...campaign,
        chapters: [{ id: "bad", title: "Bad", lessonIds: ["missing"] }],
    }), "Missing campaign lesson accepted.");
});
test("creates deterministic lesson state", () => {
    const one = runtime.createLesson(lesson);
    const two = runtime.createLesson(lesson);
    equal(runtime.serializeLesson(one.state), runtime.serializeLesson(two.state), "Initial lesson state differs.");
    equal(one.events[0]?.type, "lesson-started", "Start event missing.");
    equal(one.state.attempt, 1, "Wrong initial attempt.");
});
test("tracks placement objectives", () => {
    let learning = runtime.createLesson(lesson);
    let game = gameRuntime.create(puzzle);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "a", tileId: "two" });
    learning = runtime.observe(lesson, learning.state, game);
    equal(learning.state.objectives[0]?.current, 1, "Placement was not counted.");
    equal(learning.state.objectives[0]?.completed, false, "Placement objective completed too early.");
});
test("completes equation and solve objectives", () => {
    const state = completeLesson();
    equal(state.objectives[1]?.completed, true, "Equation objective incomplete.");
    equal(state.objectives[2]?.completed, true, "Solve objective incomplete.");
    equal(state.status, "completed", "Lesson did not complete.");
});
test("awards three stars for all objectives", () => {
    const state = completeLesson();
    equal(state.stars, 3, "Perfect lesson did not earn three stars.");
});
test("emits objective, star, and completion events", () => {
    let learning = runtime.createLesson(lesson);
    let game = gameRuntime.create(puzzle);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "a", tileId: "two" });
    learning = runtime.observe(lesson, learning.state, game);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "c", tileId: "five" });
    learning = runtime.observe(lesson, learning.state, game);
    assert(learning.events.some((event) => event.type === "objective-completed"), "Objective event missing.");
    assert(learning.events.some((event) => event.type === "star-earned"), "Star event missing.");
    assert(learning.events.some((event) => event.type === "lesson-completed"), "Completion event missing.");
});
test("does not complete no-hint objective after a hint", () => {
    let learning = runtime.createLesson(lesson);
    let game = gameRuntime.create(puzzle);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "hint" });
    learning = runtime.observe(lesson, learning.state, game);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "place", cellId: "c", tileId: "five" });
    learning = runtime.observe(lesson, learning.state, game);
    const noHints = learning.state.objectives.find((item) => item.objectiveId === "no-hints");
    equal(noHints?.completed, false, "No-hint objective completed after hint.");
    equal(learning.state.status, "in-progress", "Optional failure incorrectly completed lesson.");
});
test("tracks deterministic elapsed time", () => {
    let learning = runtime.createLesson(lesson);
    let game = gameRuntime.create(puzzle);
    game = gameRuntime.dispatch(puzzle, game.state, { type: "advance-time", milliseconds: 2500 });
    learning = runtime.observe(lesson, learning.state, game);
    equal(learning.state.metrics.elapsedMs, 2500, "Elapsed time mismatch.");
});
test("rejects a mismatched puzzle", () => {
    const game = gameRuntime.create({ ...puzzle, id: "other" });
    throws(() => runtime.observe(lesson, runtime.createLesson(lesson).state, game), "Mismatched puzzle accepted.");
});
test("restarts lessons deterministically", () => {
    const complete = completeLesson();
    const restarted = runtime.restartLesson(lesson, complete);
    equal(restarted.state.attempt, 2, "Attempt did not increment.");
    equal(restarted.state.stars, 0, "Stars were not reset.");
    equal(restarted.state.metrics.placedTiles, 0, "Metrics were not reset.");
    equal(restarted.events[0]?.type, "lesson-restarted", "Restart event missing.");
});
test("serializes and restores lessons", () => {
    const state = completeLesson();
    const serialized = runtime.serializeLesson(state);
    const restored = runtime.restoreLesson(lesson, serialized);
    equal(runtime.serializeLesson(restored), serialized, "Lesson round trip changed state.");
});
test("rejects corrupt lesson saves", () => {
    throws(() => runtime.restoreLesson(lesson, "{bad"), "Corrupt lesson JSON accepted.");
    const parsed = JSON.parse(runtime.serializeLesson(runtime.createLesson(lesson).state));
    parsed.attempt = 0;
    throws(() => runtime.restoreLesson(lesson, JSON.stringify(parsed)), "Invalid lesson save accepted.");
});
test("creates campaign with first lesson unlocked", () => {
    const transition = runtime.createCampaign(campaign);
    equal(transition.state.lessons[0]?.unlocked, true, "First lesson is locked.");
    equal(transition.state.lessons[1]?.unlocked, false, "Second lesson is unlocked too early.");
});
test("unlocks the next lesson", () => {
    const initial = runtime.createCampaign(campaign);
    const transition = runtime.recordLesson(campaign, initial.state, completeLesson());
    equal(transition.state.lessons[1]?.unlocked, true, "Next lesson was not unlocked.");
    assert(transition.events.some((event) => event.type === "lesson-unlocked"), "Unlock event missing.");
});
test("preserves best stars and attempts", () => {
    let campaignState = runtime.createCampaign(campaign).state;
    const completed = completeLesson();
    campaignState = runtime.recordLesson(campaign, campaignState, completed).state;
    const restarted = runtime.restartLesson(lesson, completed).state;
    campaignState = runtime.recordLesson(campaign, campaignState, restarted).state;
    equal(campaignState.lessons[0]?.bestStars, 3, "Best stars regressed.");
    equal(campaignState.lessons[0]?.attempts, 2, "Attempt count did not advance.");
});
test("rejects progress for locked lessons", () => {
    const lessonState = runtime.createLesson(lesson2).state;
    throws(() => runtime.recordLesson(campaign, runtime.createCampaign(campaign).state, lessonState), "Locked lesson progress accepted.");
});
test("completes campaign and emits event", () => {
    let campaignState = runtime.createCampaign(campaign).state;
    campaignState = runtime.recordLesson(campaign, campaignState, completeLesson()).state;
    const secondComplete = {
        ...runtime.createLesson(lesson2).state,
        status: "completed",
        objectives: [{ objectiveId: "solve", current: 1, target: 1, completed: true }],
        activeObjectiveIndex: 1,
        stars: 3,
    };
    const transition = runtime.recordLesson(campaign, campaignState, secondComplete);
    equal(transition.state.completed, true, "Campaign did not complete.");
    assert(transition.events.some((event) => event.type === "campaign-completed"), "Campaign event missing.");
});
test("serializes and restores campaigns", () => {
    const state = runtime.createCampaign(campaign).state;
    const serialized = runtime.serializeCampaign(state);
    const restored = runtime.restoreCampaign(campaign, serialized);
    equal(runtime.serializeCampaign(restored), serialized, "Campaign round trip changed state.");
});
test("rejects corrupt campaign saves", () => {
    throws(() => runtime.restoreCampaign(campaign, "[]"), "Invalid campaign save accepted.");
    const parsed = JSON.parse(runtime.serializeCampaign(runtime.createCampaign(campaign).state));
    parsed.lessons[0].bestStars = 9;
    throws(() => runtime.restoreCampaign(campaign, JSON.stringify(parsed)), "Invalid stars accepted.");
});
test("produces deterministic replay", () => {
    const first = completeLesson();
    const second = completeLesson();
    equal(runtime.serializeLesson(first), runtime.serializeLesson(second), "Replay was not deterministic.");
});
console.log(`\n${count}/${count} phase-8 learning tests passed.`);
