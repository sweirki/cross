import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DeviceContext } from "./DeviceContext";
import {
  expoHapticsDriver,
  noOpAudioDriver,
  reactNativeAccessibilityDriver,
} from "./drivers";
import { loadDevicePreferences, saveDevicePreferences } from "./persistence";
import {
  DEFAULT_DEVICE_PREFERENCES,
  parseDevicePreferences,
  updateDevicePreferences,
} from "./preferences";
import { DeviceFeelServices } from "./services";
import type {
  AccessibilityDriver,
  AudioDriver,
  DeviceFeelCue,
  DevicePreferenceStorage,
  DevicePreferences,
  HapticsDriver,
} from "./types";

const defaultStorage: DevicePreferenceStorage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};

export function DeviceProvider({
  children,
  storage = defaultStorage,
  haptics = expoHapticsDriver,
  audio = noOpAudioDriver,
  accessibility = reactNativeAccessibilityDriver,
}: {
  readonly children: React.ReactNode;
  readonly storage?: DevicePreferenceStorage;
  readonly haptics?: HapticsDriver;
  readonly audio?: AudioDriver;
  readonly accessibility?: AccessibilityDriver;
}) {
  const [preferences, setState] = useState(DEFAULT_DEVICE_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void loadDevicePreferences(storage).then(value => {
      if (active) {
        setState(value);
        setHydrated(true);
      }
    });
    return () => { active = false; };
  }, [storage]);

  const services = useMemo(
    () => new DeviceFeelServices(haptics, audio, accessibility),
    [haptics, audio, accessibility],
  );

  const setPreferences = useCallback(async (value: DevicePreferences) => {
    const next = parseDevicePreferences(value);
    await saveDevicePreferences(storage, next);
    setState(next);
  }, [storage]);

  const updatePreferences = useCallback(async (
    patch: Partial<Omit<DevicePreferences, "schemaVersion">>,
  ) => {
    const next = updateDevicePreferences(preferences, patch);
    await saveDevicePreferences(storage, next);
    setState(next);
  }, [preferences, storage]);

  const perform = useCallback(
    (cue: DeviceFeelCue) => services.perform(cue),
    [services],
  );

  const value = useMemo(() => ({
    preferences,
    hydrated,
    setPreferences,
    updatePreferences,
    perform,
  }), [preferences, hydrated, setPreferences, updatePreferences, perform]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}
