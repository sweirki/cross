import { CrossMathAppRuntime } from "../../src/integration/v1";
import { DEMO_PUZZLE } from "../../src/data/demoPuzzle";
import type { AppPuzzleLibrary } from "../../src/types/ReactNativeIntegration";

const library: AppPuzzleLibrary = {
  schemaVersion: 1,
  id: "integration-test-library",
  puzzles: [DEMO_PUZZLE],
};

let passed = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
function equal<T>(actual: T, expected: T): void {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`);
}
function throws(run: () => void): void {
  let didThrow = false;
  try { run(); } catch { didThrow = true; }
  if (!didThrow) throw new Error("Expected operation to throw.");
}

const runtime = new CrossMathAppRuntime();

test("creates deterministic app state", () => {
  equal(runtime.serialize(runtime.create("player-1").state), runtime.serialize(runtime.create("player-1").state));
});
test("starts on home", () => equal(runtime.create("player-1").state.route, "home"));
test("starts unhydrated", () => equal(runtime.create("player-1").state.hydrated, false));
test("rejects empty player IDs", () => throws(() => runtime.create(" ")));
test("hydrates a new player", () => {
  const result = runtime.hydrate("player-1", null, library);
  equal(result.state.hydrated, true);
  equal(result.events[0]?.type, "app-hydrated");
});
test("starts a puzzle", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  const result = runtime.startPuzzle(initial, DEMO_PUZZLE.id, library);
  equal(result.state.route, "play");
  equal(result.state.activePuzzleId, DEMO_PUZZLE.id);
  equal(result.events[0]?.type, "puzzle-started");
});
test("rejects unknown puzzles", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  throws(() => runtime.startPuzzle(initial, "missing", library));
});
test("resumes an active puzzle", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  const first = runtime.startPuzzle(initial, DEMO_PUZZLE.id, library);
  const second = runtime.startPuzzle(first.state, DEMO_PUZZLE.id, library);
  equal(second.events[0]?.type, "puzzle-started");
  if (second.events[0]?.type === "puzzle-started") equal(second.events[0].resumed, true);
});
test("tracks recent puzzles without duplicates", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  const first = runtime.startPuzzle(initial, DEMO_PUZZLE.id, library);
  const second = runtime.startPuzzle(first.state, DEMO_PUZZLE.id, library);
  equal(second.state.recentPuzzleIds.length, 1);
});
test("dispatches game actions", () => {
  const initial = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library);
  const result = runtime.dispatchGame(initial.state, { type: "advance-time", milliseconds: 1000 }, library);
  equal(result.state.game?.clock.elapsedMs, 1000);
});
test("wraps game events", () => {
  const initial = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library);
  const tile = DEMO_PUZZLE.numberBank[0];
  if (tile === undefined) throw new Error("Demo puzzle needs a number tile.");
  const result = runtime.dispatchGame(initial.state, { type: "select-tile", tileId: tile.id }, library);
  equal(result.events[0]?.type, "game-event");
});
test("rejects game actions without a puzzle", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  throws(() => runtime.dispatchGame(initial, { type: "advance-time", milliseconds: 1 }, library));
});
test("navigates to academy", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  equal(runtime.navigate(initial, "academy", library).state.route, "academy");
});
test("navigates to studio", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  equal(runtime.navigate(initial, "studio", library).state.route, "studio");
});
test("navigates to profile", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  equal(runtime.navigate(initial, "profile", library).state.route, "profile");
});
test("rejects play navigation without puzzle", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  throws(() => runtime.navigate(initial, "play", library));
});
test("does not revise unchanged navigation", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  equal(runtime.navigate(initial, "home", library).state.revision, initial.revision);
});
test("closes an active puzzle", () => {
  const initial = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library);
  const result = runtime.closePuzzle(initial.state, library);
  equal(result.state.route, "home");
  equal(result.state.game, null);
  equal(result.events[0]?.type, "puzzle-closed");
});
test("closing without a puzzle is idempotent", () => {
  const initial = runtime.hydrate("player-1", null, library).state;
  equal(runtime.closePuzzle(initial, library).state.revision, initial.revision);
});
test("serializes canonically", () => {
  const state = runtime.hydrate("player-1", null, library).state;
  equal(runtime.serialize(state), runtime.serialize(state));
});
test("restores active games", () => {
  const active = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library).state;
  const restored = runtime.restore("player-1", runtime.serialize(active), library);
  equal(restored.activePuzzleId, DEMO_PUZZLE.id);
  equal(restored.game?.puzzleId, DEMO_PUZZLE.id);
});
test("hydrates saved state", () => {
  const active = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library).state;
  const hydrated = runtime.hydrate("player-1", runtime.serialize(active), library);
  equal(hydrated.state.hydrated, true);
  if (hydrated.events[0]?.type === "app-hydrated") equal(hydrated.events[0].restored, true);
});
test("rejects corrupt JSON", () => throws(() => runtime.restore("player-1", "{", library)));
test("rejects cross-player saves", () => {
  const state = runtime.hydrate("player-1", null, library).state;
  throws(() => runtime.restore("player-2", runtime.serialize(state), library));
});
test("rejects unsupported schemas", () => {
  const state = runtime.hydrate("player-1", null, library).state;
  const saved = JSON.parse(runtime.serialize(state)) as Record<string, unknown>;
  saved.schemaVersion = 2;
  throws(() => runtime.restore("player-1", JSON.stringify(saved), library));
});
test("rejects invalid routes", () => {
  const state = runtime.hydrate("player-1", null, library).state;
  const saved = JSON.parse(runtime.serialize(state)) as Record<string, unknown>;
  saved.route = "nowhere";
  throws(() => runtime.restore("player-1", JSON.stringify(saved), library));
});
test("rejects inconsistent active state", () => {
  const state = runtime.hydrate("player-1", null, library).state;
  const saved = JSON.parse(runtime.serialize(state)) as Record<string, unknown>;
  saved.activePuzzleId = DEMO_PUZZLE.id;
  throws(() => runtime.restore("player-1", JSON.stringify(saved), library));
});
test("rejects duplicate library IDs", () => {
  const invalid: AppPuzzleLibrary = { ...library, puzzles: [DEMO_PUZZLE, DEMO_PUZZLE] };
  throws(() => runtime.hydrate("player-1", null, invalid));
});
test("preserves deterministic replay", () => {
  let a = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library).state;
  let b = runtime.startPuzzle(runtime.hydrate("player-1", null, library).state, DEMO_PUZZLE.id, library).state;
  for (const action of [
    { type: "advance-time", milliseconds: 250 } as const,
    { type: "pause" } as const,
    { type: "resume" } as const,
  ]) {
    a = runtime.dispatchGame(a, action, library).state;
    b = runtime.dispatchGame(b, action, library).state;
  }
  equal(runtime.serialize(a), runtime.serialize(b));
});

console.log(`\n${passed}/${passed} phase-13 React Native integration tests passed.`);
