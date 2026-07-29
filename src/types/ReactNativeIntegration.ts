import type { RuntimeAction, RuntimeEvent, RuntimeState } from "./GameRuntime";
import type { GameView } from "./Game";
import type { Puzzle } from "./Puzzle";

export type AppRoute = "home" | "play" | "academy" | "studio" | "profile";

export interface AppRuntimeState {
  readonly schemaVersion: 1;
  readonly playerId: string;
  readonly route: AppRoute;
  readonly activePuzzleId: string | null;
  readonly game: RuntimeState | null;
  readonly recentPuzzleIds: readonly string[];
  readonly hydrated: boolean;
  readonly revision: number;
}

export type AppRuntimeEvent =
  | { readonly type: "app-created"; readonly playerId: string }
  | { readonly type: "app-hydrated"; readonly restored: boolean }
  | { readonly type: "route-changed"; readonly route: AppRoute }
  | { readonly type: "puzzle-started"; readonly puzzleId: string; readonly resumed: boolean }
  | { readonly type: "puzzle-closed"; readonly puzzleId: string }
  | { readonly type: "game-event"; readonly event: RuntimeEvent };

export interface AppRuntimeTransition {
  readonly state: AppRuntimeState;
  readonly view: GameView | null;
  readonly events: readonly AppRuntimeEvent[];
}

export interface AppPuzzleLibrary {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly puzzles: readonly Puzzle[];
}

export interface AppStringStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface CrossMathAppRuntimeContract {
  create(playerId: string): AppRuntimeTransition;
  hydrate(playerId: string, serialized: string | null, library: AppPuzzleLibrary): AppRuntimeTransition;
  navigate(state: AppRuntimeState, route: AppRoute, library: AppPuzzleLibrary): AppRuntimeTransition;
  startPuzzle(state: AppRuntimeState, puzzleId: string, library: AppPuzzleLibrary): AppRuntimeTransition;
  dispatchGame(state: AppRuntimeState, action: RuntimeAction, library: AppPuzzleLibrary): AppRuntimeTransition;
  closePuzzle(state: AppRuntimeState, library: AppPuzzleLibrary): AppRuntimeTransition;
  serialize(state: AppRuntimeState): string;
  restore(playerId: string, serialized: string, library: AppPuzzleLibrary): AppRuntimeState;
}
