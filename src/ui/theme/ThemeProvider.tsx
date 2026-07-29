import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Appearance, PixelRatio, useWindowDimensions } from "react-native";
import { ThemeContext } from "./ThemeContext";
import { loadThemePreferences, saveThemePreferences } from "./persistence";
import { DEFAULT_THEME_PREFERENCES, parseThemePreferences, updateThemePreferences } from "./preferences";
import { resolveTheme } from "./resolve";
import { resolveLayoutMetrics } from "./responsive/layout";
import type { ThemePreferenceStorage, ThemePreferences } from "./types";
const defaultStorage: ThemePreferenceStorage = { getItem: k => AsyncStorage.getItem(k), setItem: (k,v) => AsyncStorage.setItem(k,v), removeItem: k => AsyncStorage.removeItem(k) };
export function ThemeProvider({ children, storage = defaultStorage }: { readonly children: React.ReactNode; readonly storage?: ThemePreferenceStorage }) {
  const [preferences, setState] = useState(DEFAULT_THEME_PREFERENCES);
  const [systemDark, setSystemDark] = useState(Appearance.getColorScheme() === "dark");
  const [hydrated, setHydrated] = useState(false);
  const { width } = useWindowDimensions();
  useEffect(() => { let active = true; void loadThemePreferences(storage).then(v => { if (active) { setState(v); setHydrated(true); } });
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemDark(colorScheme === "dark")); return () => { active = false; sub.remove(); }; }, [storage]);
  const setPreferences = useCallback(async (value: ThemePreferences) => { const next = parseThemePreferences(value); await saveThemePreferences(storage,next); setState(next); }, [storage]);
  const updatePreferences = useCallback(async (patch: Partial<Omit<ThemePreferences,"schemaVersion">>) => { const next = updateThemePreferences(preferences,patch); await saveThemePreferences(storage,next); setState(next); }, [preferences,storage]);
  const theme = useMemo(() => resolveTheme(preferences, systemDark), [preferences,systemDark]);
  const layout = useMemo(() => resolveLayoutMetrics(width, PixelRatio.getFontScale(), preferences.responsiveType), [width,preferences.responsiveType]);
  const value = useMemo(() => ({ preferences,theme,layout,hydrated,setPreferences,updatePreferences }), [preferences,theme,layout,hydrated,setPreferences,updatePreferences]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
