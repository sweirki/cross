import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccessibilityInfo } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motionAnimation } from "./animations";
import { MotionContext } from "./MotionContext";
import { DEFAULT_MOTION_PREFERENCES, resolveMotionPreferences, updateMotionPreferences } from "./preferences";
import { loadMotionPreferences, saveMotionPreferences } from "./persistence";
import { motionTransition } from "./transitions";
import type { MotionPreferences, MotionPreferenceStorage } from "./types";

const defaultStorage: MotionPreferenceStorage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};

export function MotionProvider({
  children,
  storage = defaultStorage,
}: {
  readonly children: React.ReactNode;
  readonly storage?: MotionPreferenceStorage;
}) {
  const [preferences, setState] = useState(DEFAULT_MOTION_PREFERENCES);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void loadMotionPreferences(storage).then(value => {
      if (active) { setState(value); setHydrated(true); }
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setSystemReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, [storage]);

  const setPreferences = useCallback(async (value: MotionPreferences) => {
    const next = updateMotionPreferences(value, {});
    await saveMotionPreferences(storage, next);
    setState(next);
  }, [storage]);

  const updatePreferences = useCallback(async (
    patch: Partial<Omit<MotionPreferences, "schemaVersion">>,
  ) => {
    const next = updateMotionPreferences(preferences, patch);
    await saveMotionPreferences(storage, next);
    setState(next);
  }, [preferences, storage]);

  const resolved = useMemo(
    () => resolveMotionPreferences(preferences, systemReduceMotion),
    [preferences, systemReduceMotion],
  );
  const value = useMemo(() => ({
    preferences,
    resolved,
    hydrated,
    setPreferences,
    updatePreferences,
    animation: (name: Parameters<typeof motionAnimation>[0]) => motionAnimation(name, resolved),
    transition: (name: Parameters<typeof motionTransition>[0]) => motionTransition(name, resolved),
  }), [preferences, resolved, hydrated, setPreferences, updatePreferences]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
