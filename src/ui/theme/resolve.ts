import { darkColors, highContrastDarkColors, highContrastLightColors, lightColors } from "./themes/palettes";
import type { CrossMathTheme, ResolvedThemeMode, ThemePreferences } from "./types";
export function resolveThemeMode(preference: ThemePreferences["mode"], systemDark: boolean): ResolvedThemeMode {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
export function resolveTheme(preferences: ThemePreferences, systemDark: boolean): CrossMathTheme {
  const mode = resolveThemeMode(preferences.mode, systemDark);
  const colors = preferences.contrast === "high"
    ? (mode === "dark" ? highContrastDarkColors : highContrastLightColors)
    : (mode === "dark" ? darkColors : lightColors);
  return Object.freeze({ mode, contrast: preferences.contrast, colors });
}
