import { CrossMathGameRuntime } from "../../game/runtime";
import { buildGameView } from "../../game/engine";
import type {
  AppPuzzleLibrary,
  AppRoute,
  AppRuntimeEvent,
  AppRuntimeState,
  AppRuntimeTransition,
  CrossMathAppRuntimeContract,
} from "../../types/ReactNativeIntegration";
import type { RuntimeAction } from "../../types/GameRuntime";
import type { Puzzle } from "../../types/Puzzle";

const ROUTES: readonly AppRoute[] = ["home", "play", "academy", "studio", "profile"];
const MAX_RECENT = 20;

function canonical<T>(value: T): T {
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      output[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return output as T;
  }
  return value;
}

function requirePlayerId(value: string): void {
  if (value.trim().length === 0) throw new Error("Player ID must not be empty.");
}

function validateLibrary(library: AppPuzzleLibrary): void {
  if (library.schemaVersion !== 1 || library.id.trim().length === 0) {
    throw new Error("Puzzle library is invalid.");
  }
  const ids = new Set<string>();
  for (const puzzle of library.puzzles) {
    if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle ID: ${puzzle.id}.`);
    ids.add(puzzle.id);
  }
}

function puzzleById(library: AppPuzzleLibrary, puzzleId: string): Puzzle {
  const puzzle = library.puzzles.find((candidate) => candidate.id === puzzleId);
  if (puzzle === undefined) throw new Error(`Unknown puzzle: ${puzzleId}.`);
  return puzzle;
}

function currentPuzzle(state: AppRuntimeState, library: AppPuzzleLibrary): Puzzle {
  if (state.activePuzzleId === null || state.game === null) {
    throw new Error("No puzzle is active.");
  }
  return puzzleById(library, state.activePuzzleId);
}

function recent(ids: readonly string[], puzzleId: string): readonly string[] {
  return [puzzleId, ...ids.filter((id) => id !== puzzleId)].slice(0, MAX_RECENT);
}

function transition(
  state: AppRuntimeState,
  library: AppPuzzleLibrary,
  events: readonly AppRuntimeEvent[],
): AppRuntimeTransition {
  const view = state.game === null ? null :
    buildGameView(currentPuzzle(state, library), state.game.history.present);
  return { state, view, events };
}

function assertState(state: AppRuntimeState, library: AppPuzzleLibrary): void {
  requirePlayerId(state.playerId);
  if (state.schemaVersion !== 1) throw new Error("Unsupported app runtime schema.");
  if (!ROUTES.includes(state.route)) throw new Error("Saved route is invalid.");
  if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
    throw new Error("Saved app revision is invalid.");
  }
  if (state.activePuzzleId === null !== (state.game === null)) {
    throw new Error("Saved active puzzle state is inconsistent.");
  }
  if (state.activePuzzleId !== null) {
    const puzzle = puzzleById(library, state.activePuzzleId);
    if (state.game?.puzzleId !== puzzle.id) throw new Error("Saved game does not match its puzzle.");
  }
  const unique = new Set(state.recentPuzzleIds);
  if (unique.size !== state.recentPuzzleIds.length || state.recentPuzzleIds.length > MAX_RECENT) {
    throw new Error("Saved recent puzzle history is invalid.");
  }
  for (const id of state.recentPuzzleIds) puzzleById(library, id);
}

export class CrossMathAppRuntime implements CrossMathAppRuntimeContract {
  private readonly game = new CrossMathGameRuntime();

  public create(playerId: string): AppRuntimeTransition {
    requirePlayerId(playerId);
    const state: AppRuntimeState = {
      schemaVersion: 1,
      playerId,
      route: "home",
      activePuzzleId: null,
      game: null,
      recentPuzzleIds: [],
      hydrated: false,
      revision: 0,
    };
    return { state, view: null, events: [{ type: "app-created", playerId }] };
  }

  public hydrate(
    playerId: string,
    serialized: string | null,
    library: AppPuzzleLibrary,
  ): AppRuntimeTransition {
    validateLibrary(library);
    const restored = serialized !== null;
    const state = restored
      ? { ...this.restore(playerId, serialized, library), hydrated: true }
      : { ...this.create(playerId).state, hydrated: true };
    return transition(state, library, [{ type: "app-hydrated", restored }]);
  }

  public navigate(
    state: AppRuntimeState,
    route: AppRoute,
    library: AppPuzzleLibrary,
  ): AppRuntimeTransition {
    assertState(state, library);
    if (!ROUTES.includes(route)) throw new Error("Unknown app route.");
    if (route === "play" && state.game === null) throw new Error("Cannot open play without an active puzzle.");
    if (state.route === route) return transition(state, library, []);
    const next = { ...state, route, revision: state.revision + 1 };
    return transition(next, library, [{ type: "route-changed", route }]);
  }

  public startPuzzle(
    state: AppRuntimeState,
    puzzleId: string,
    library: AppPuzzleLibrary,
  ): AppRuntimeTransition {
    assertState(state, library);
    const puzzle = puzzleById(library, puzzleId);
    const resumed = state.activePuzzleId === puzzleId && state.game !== null;
    const game = resumed ? state.game! : this.game.create(puzzle).state;
    const next: AppRuntimeState = {
      ...state,
      route: "play",
      activePuzzleId: puzzleId,
      game,
      recentPuzzleIds: recent(state.recentPuzzleIds, puzzleId),
      revision: state.revision + 1,
    };
    return {
      state: next,
      view: buildGameView(puzzle, game.history.present),
      events: [{ type: "puzzle-started", puzzleId, resumed }],
    };
  }

  public dispatchGame(
    state: AppRuntimeState,
    action: RuntimeAction,
    library: AppPuzzleLibrary,
  ): AppRuntimeTransition {
    assertState(state, library);
    const puzzle = currentPuzzle(state, library);
    const result = this.game.dispatch(puzzle, state.game!, action);
    const next: AppRuntimeState = {
      ...state,
      route: "play",
      game: result.state,
      revision: state.revision + 1,
    };
    return {
      state: next,
      view: result.view,
      events: result.events.map((event) => ({ type: "game-event", event })),
    };
  }

  public closePuzzle(
    state: AppRuntimeState,
    library: AppPuzzleLibrary,
  ): AppRuntimeTransition {
    assertState(state, library);
    if (state.activePuzzleId === null) return transition(state, library, []);
    const puzzleId = state.activePuzzleId;
    const next: AppRuntimeState = {
      ...state,
      route: "home",
      activePuzzleId: null,
      game: null,
      revision: state.revision + 1,
    };
    return { state: next, view: null, events: [{ type: "puzzle-closed", puzzleId }] };
  }

  public serialize(state: AppRuntimeState): string {
    return JSON.stringify(canonical(state));
  }

  public restore(
    playerId: string,
    serialized: string,
    library: AppPuzzleLibrary,
  ): AppRuntimeState {
    validateLibrary(library);
    requirePlayerId(playerId);
    let parsed: unknown;
    try { parsed = JSON.parse(serialized); } catch {
      throw new Error("Saved app state is not valid JSON.");
    }
    if (parsed === null || typeof parsed !== "object") throw new Error("Saved app state is invalid.");
    const input = parsed as AppRuntimeState;
    if (input.playerId !== playerId) throw new Error("Saved app state belongs to another player.");
    assertState(input, library);
    let game = input.game;
    if (input.activePuzzleId !== null && game !== null) {
      const puzzle = puzzleById(library, input.activePuzzleId);
      game = this.game.restore(puzzle, this.game.serialize(game)).state;
    }
    return { ...input, game };
  }
}

export const appRuntime = new CrossMathAppRuntime();
