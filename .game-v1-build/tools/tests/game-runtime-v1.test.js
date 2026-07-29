"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("../../src/game/runtime");
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
function equal(actual, expected, message) {
    if (actual !== expected)
        throw new Error(`${message} Expected ${String(expected)}, got ${String(actual)}.`);
}
const puzzle = {
    schemaVersion: 1,
    id: "runtime-v1",
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
const runtime = new runtime_1.CrossMathGameRuntime();
let count = 0;
function test(name, body) {
    body();
    count += 1;
    console.log(`PASS ${name}`);
}
test("creates deterministic state", () => {
    const one = runtime.create(puzzle);
    const two = runtime.create(puzzle);
    equal(runtime.serialize(one.state), runtime.serialize(two.state), "Initial states differ.");
    equal(one.state.status, "playing", "Wrong status.");
    equal(one.state.revision, 0, "Wrong revision.");
});
test("selects and places a tile", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "select-tile", tileId: "two" });
    equal(result.state.selectedTileId, "two", "Selection failed.");
    equal(result.events[0]?.type, "tile-selected", "Selection event missing.");
    result = runtime.dispatch(puzzle, result.state, { type: "place-selected", cellId: "a" });
    equal(result.state.history.present.placements.a, "two", "Placement failed.");
    equal(result.state.selectedTileId, null, "Selection was not cleared.");
});
test("rejects unknown selections", () => {
    let threw = false;
    try {
        runtime.dispatch(puzzle, runtime.create(puzzle).state, { type: "select-tile", tileId: "missing" });
    }
    catch {
        threw = true;
    }
    assert(threw, "Unknown tile accepted.");
});
test("tracks deterministic elapsed time", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "advance-time", milliseconds: 1250 });
    equal(result.state.clock.elapsedMs, 1250, "Clock did not advance.");
    result = runtime.dispatch(puzzle, result.state, { type: "pause" });
    result = runtime.dispatch(puzzle, result.state, { type: "advance-time", milliseconds: 500 });
    equal(result.state.clock.elapsedMs, 1250, "Paused clock advanced.");
    result = runtime.dispatch(puzzle, result.state, { type: "resume" });
    result = runtime.dispatch(puzzle, result.state, { type: "advance-time", milliseconds: 250 });
    equal(result.state.clock.elapsedMs, 1500, "Resumed clock failed.");
});
test("rejects invalid time", () => {
    let threw = false;
    try {
        runtime.dispatch(puzzle, runtime.create(puzzle).state, { type: "advance-time", milliseconds: -1 });
    }
    catch {
        threw = true;
    }
    assert(threw, "Negative time accepted.");
});
test("records incorrect completed equations as mistakes", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "a", tileId: "five" });
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "c", tileId: "two" });
    equal(result.state.mistakes, 1, "Mistake was not recorded.");
    assert(result.events.some((event) => event.type === "mistake-recorded"), "Mistake event missing.");
});
test("emits equation and puzzle completion events", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "advance-time", milliseconds: 4000 });
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "a", tileId: "two" });
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "c", tileId: "five" });
    equal(result.state.status, "completed", "Puzzle did not complete.");
    equal(result.state.clock.paused, true, "Clock did not pause.");
    assert(result.events.some((event) => event.type === "equation-completed"), "Equation event missing.");
    const completion = result.events.find((event) => event.type === "puzzle-completed");
    assert(completion?.type === "puzzle-completed", "Completion event missing.");
    equal(completion.elapsedMs, 4000, "Completion time mismatch.");
});
test("supports undo and redo", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "a", tileId: "two" });
    result = runtime.dispatch(puzzle, result.state, { type: "undo" });
    equal(result.state.history.present.placements.a, undefined, "Undo failed.");
    result = runtime.dispatch(puzzle, result.state, { type: "redo" });
    equal(result.state.history.present.placements.a, "two", "Redo failed.");
});
test("supports deterministic hints", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "hint" });
    equal(result.state.history.present.hintsUsed, 1, "Hint counter failed.");
    assert(result.events.some((event) => event.type === "hint-used"), "Hint event missing.");
});
test("resets session state", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "a", tileId: "five" });
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "c", tileId: "two" });
    result = runtime.dispatch(puzzle, result.state, { type: "reset" });
    equal(result.state.history.present.moves, 0, "Moves were not reset.");
    equal(result.state.mistakes, 0, "Mistakes were not reset.");
    assert(result.events.some((event) => event.type === "session-reset"), "Reset event missing.");
});
test("serializes canonically and restores safely", () => {
    let result = runtime.create(puzzle);
    result = runtime.dispatch(puzzle, result.state, { type: "advance-time", milliseconds: 2000 });
    result = runtime.dispatch(puzzle, result.state, { type: "place", cellId: "a", tileId: "two" });
    const serialized = runtime.serialize(result.state);
    const restored = runtime.restore(puzzle, serialized);
    equal(runtime.serialize(restored.state), serialized, "Round trip changed state.");
    equal(restored.migrated, false, "Unexpected migration.");
});
test("rejects corrupt persistence", () => {
    let threw = false;
    try {
        runtime.restore(puzzle, "{bad");
    }
    catch {
        threw = true;
    }
    assert(threw, "Corrupt JSON accepted.");
    const valid = JSON.parse(runtime.serialize(runtime.create(puzzle).state));
    valid.clock.elapsedMs = -1;
    threw = false;
    try {
        runtime.restore(puzzle, JSON.stringify(valid));
    }
    catch {
        threw = true;
    }
    assert(threw, "Invalid persisted clock accepted.");
});
console.log(`\n${count}/${count} phase-7 runtime tests passed.`);
