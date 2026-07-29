import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { applicationRuntime, type ApplicationProgressState } from "../v1";

interface Value {
  readonly progress: ApplicationProgressState;
  readonly hydrated: boolean;
  readonly recordStarted: (puzzleId: string, lessonId: string | null) => void;
  readonly recordCompleted: (puzzleId: string, moves: number, hintsUsed: number) => void;
  readonly markDailyComplete: (date: string) => void;
}

const Context = createContext<Value | null>(null);

export function ApplicationProgressProvider({ playerId, children }: PropsWithChildren<{ readonly playerId: string }>) {
  const [progress, setProgress] = useState(() => applicationRuntime.create(playerId));
  const [hydrated, setHydrated] = useState(false);
  const key = `crossmath.application.v1:${playerId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(serialized => {
      if (!active) return;
      if (serialized !== null) {
        try { setProgress(applicationRuntime.restore(playerId, serialized)); } catch { setProgress(applicationRuntime.create(playerId)); }
      }
      setHydrated(true);
    }).catch(() => setHydrated(true));
    return () => { active = false; };
  }, [key, playerId]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(key, applicationRuntime.serialize(progress));
  }, [hydrated, key, progress]);

  const recordStarted = useCallback((puzzleId: string, lessonId: string | null) => {
    setProgress(current => applicationRuntime.recordPuzzleStarted(current, puzzleId, lessonId));
  }, []);
  const recordCompleted = useCallback((puzzleId: string, moves: number, hintsUsed: number) => {
    setProgress(current => applicationRuntime.recordPuzzleCompleted(current, puzzleId, moves, hintsUsed, new Date().toISOString()));
  }, []);
  const markDailyComplete = useCallback((date: string) => {
    setProgress(current => applicationRuntime.markDailyComplete(current, date));
  }, []);

  const value = useMemo(() => ({ progress, hydrated, recordStarted, recordCompleted, markDailyComplete }), [progress, hydrated, recordStarted, recordCompleted, markDailyComplete]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApplicationProgress(): Value {
  const value = useContext(Context);
  if (value === null) throw new Error("useApplicationProgress must be used inside ApplicationProgressProvider.");
  return value;
}
