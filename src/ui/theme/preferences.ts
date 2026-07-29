import { THEME_PREFERENCES_SCHEMA_VERSION, type ContrastMode, type ThemeMode, type ThemePreferences } from "./types";

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = Object.freeze({
  schemaVersion: THEME_PREFERENCES_SCHEMA_VERSION, mode: "system", contrast: "standard", responsiveType: true,
});
const modes = new Set<ThemeMode>(["system", "light", "dark"]);
const contrasts = new Set<ContrastMode>(["standard", "high"]);

export function parseThemePreferences(value: unknown): ThemePreferences {
  if (!value || typeof value !== "object") return DEFAULT_THEME_PREFERENCES;
  const candidate = value as Partial<ThemePreferences>;
  return Object.freeze({
    schemaVersion: THEME_PREFERENCES_SCHEMA_VERSION,
    mode: modes.has(candidate.mode as ThemeMode) ? candidate.mode as ThemeMode : "system",
    contrast: contrasts.has(candidate.contrast as ContrastMode) ? candidate.contrast as ContrastMode : "standard",
    responsiveType: typeof candidate.responsiveType === "boolean" ? candidate.responsiveType : true,
  });
}
export function updateThemePreferences(current: ThemePreferences, patch: Partial<Omit<ThemePreferences, "schemaVersion">>): ThemePreferences {
  return parseThemePreferences({ ...current, ...patch });
}
