import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from "react";
import type { RuntimeAction } from "../../types/GameRuntime";
import type {
  AppPuzzleLibrary,
  AppRoute,
  AppRuntimeState,
  AppRuntimeTransition,
} from "../../types/ReactNativeIntegration";
import { CrossMathAppRuntime } from "../v1";

const STORAGE_PREFIX = "crossmath.app.v1";

interface AppContextValue {
  readonly transition: AppRuntimeTransition;
  readonly startPuzzle: (puzzleId: string) => void;
  readonly dispatchGame: (action: RuntimeAction) => void;
  readonly navigate: (route: AppRoute) => void;
  readonly closePuzzle: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface ProviderProps extends PropsWithChildren {
  readonly playerId: string;
  readonly library: AppPuzzleLibrary;
}

type ProviderAction =
  | { readonly type: "replace"; readonly transition: AppRuntimeTransition }
  | { readonly type: "navigate"; readonly route: AppRoute }
  | { readonly type: "start"; readonly puzzleId: string }
  | { readonly type: "game"; readonly action: RuntimeAction }
  | { readonly type: "close" };

export function CrossMathAppProvider({
  playerId,
  library,
  children,
}: ProviderProps) {
  const runtime = useMemo(() => new CrossMathAppRuntime(), []);
  const initial = useMemo(() => runtime.create(playerId), [playerId, runtime]);
  const [transition, dispatch] = useReducer(
    (current: AppRuntimeTransition, action: ProviderAction): AppRuntimeTransition => {
      switch (action.type) {
        case "replace":
          return action.transition;
        case "navigate":
          return runtime.navigate(current.state, action.route, library);
        case "start":
          return runtime.startPuzzle(current.state, action.puzzleId, library);
        case "game":
          return runtime.dispatchGame(current.state, action.action, library);
        case "close":
          return runtime.closePuzzle(current.state, library);
      }
    },
    initial,
  );

  const storageKey = `${STORAGE_PREFIX}:${playerId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((serialized) => {
        if (active) {
          dispatch({
            type: "replace",
            transition: runtime.hydrate(playerId, serialized, library),
          });
        }
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: "replace",
            transition: runtime.hydrate(playerId, null, library),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [library, playerId, runtime, storageKey]);

  useEffect(() => {
    if (!transition.state.hydrated) return;
    void AsyncStorage.setItem(storageKey, runtime.serialize(transition.state));
  }, [runtime, storageKey, transition.state]);

  const startPuzzle = useCallback((puzzleId: string) => {
    dispatch({ type: "start", puzzleId });
  }, []);
  const dispatchGame = useCallback((action: RuntimeAction) => {
    dispatch({ type: "game", action });
  }, []);
  const navigate = useCallback((route: AppRoute) => {
    dispatch({ type: "navigate", route });
  }, []);
  const closePuzzle = useCallback(() => {
    dispatch({ type: "close" });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    transition,
    startPuzzle,
    dispatchGame,
    navigate,
    closePuzzle,
  }), [closePuzzle, dispatchGame, navigate, startPuzzle, transition]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useCrossMathApp(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) {
    throw new Error("useCrossMathApp must be used inside CrossMathAppProvider.");
  }
  return value;
}
