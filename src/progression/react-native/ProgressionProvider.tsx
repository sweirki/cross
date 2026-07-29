
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  progressionRuntime,
  type ProgressionCompletionInput,
  type ProgressionResult,
  type ProgressionState,
} from "../v1";

interface ProgressionValue {
  readonly progression: ProgressionState;
  readonly hydrated: boolean;
  readonly recordProgressionCompletion: (input: ProgressionCompletionInput) => ProgressionResult;
  readonly dismissReward: (rewardId?: string) => void;
  readonly clearRewards: () => void;
}

const ProgressionContext = createContext<ProgressionValue | null>(null);

export function ProgressionProvider({
  playerId,
  children,
}: PropsWithChildren<{ readonly playerId: string }>) {
  const [progression, setProgression] = useState(() => progressionRuntime.create(playerId));
  const [hydrated, setHydrated] = useState(false);
  const key = `crossmath.progression.v1:${playerId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then(serialized => {
        if (!active) return;
        if (serialized !== null) {
          try { setProgression(progressionRuntime.restore(playerId, serialized)); }
          catch { setProgression(progressionRuntime.create(playerId)); }
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
    return () => { active = false; };
  }, [key, playerId]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(key, progressionRuntime.serialize(progression));
  }, [hydrated, key, progression]);

  const recordProgressionCompletion = useCallback((input: ProgressionCompletionInput): ProgressionResult => {
    let result: ProgressionResult | null = null;
    setProgression(current => {
      result = progressionRuntime.recordCompletion(current, input);
      return result.state;
    });
    // React executes functional updates synchronously in the event/effect path used here.
    return result ?? { state: progression, xpEarned: 0, rewards: [], newlyUnlocked: [] };
  }, [progression]);

  const dismissReward = useCallback((rewardId?: string) => {
    setProgression(current => progressionRuntime.dismissReward(current, rewardId));
  }, []);

  const clearRewards = useCallback(() => {
    setProgression(current => progressionRuntime.clearRewards(current));
  }, []);

  const value = useMemo(
    () => ({ progression, hydrated, recordProgressionCompletion, dismissReward, clearRewards }),
    [progression, hydrated, recordProgressionCompletion, dismissReward, clearRewards],
  );
  return <ProgressionContext.Provider value={value}>{children}</ProgressionContext.Provider>;
}

export function useProgression(): ProgressionValue {
  const value = useContext(ProgressionContext);
  if (value === null) throw new Error("useProgression must be used inside ProgressionProvider.");
  return value;
}
