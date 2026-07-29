import { DEFAULT_THEME_PREFERENCES, parseThemePreferences } from "./preferences";
import type { ThemePreferenceStorage, ThemePreferences } from "./types";
export const THEME_PREFERENCES_STORAGE_KEY = "crossmath.theme-preferences.v1";
export function serializeThemePreferences(value: ThemePreferences): string {
  const valid = parseThemePreferences(value);
  return JSON.stringify({ schemaVersion: valid.schemaVersion, mode: valid.mode, contrast: valid.contrast, responsiveType: valid.responsiveType });
}
export function parseSerializedThemePreferences(raw: string): ThemePreferences {
  try { return parseThemePreferences(JSON.parse(raw)); } catch { return DEFAULT_THEME_PREFERENCES; }
}
export async function loadThemePreferences(storage: ThemePreferenceStorage): Promise<ThemePreferences> {
  try { const raw = await storage.getItem(THEME_PREFERENCES_STORAGE_KEY); return raw === null ? DEFAULT_THEME_PREFERENCES : parseSerializedThemePreferences(raw); }
  catch { return DEFAULT_THEME_PREFERENCES; }
}
export async function saveThemePreferences(storage: ThemePreferenceStorage, value: ThemePreferences): Promise<void> {
  await storage.setItem(THEME_PREFERENCES_STORAGE_KEY, serializeThemePreferences(value));
}
