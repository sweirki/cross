import type { AccessibilityPreferences } from "../types/PremiumGameplay";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  textScale: 1,
  highContrast: false,
  reducedMotion: false,
  screenReaderOptimized: false,
};

export function normalizeAccessibilityPreferences(
  value: Partial<AccessibilityPreferences>,
): AccessibilityPreferences {
  const textScale = value.textScale ?? 1;
  if (!Number.isFinite(textScale) || textScale < 0.8 || textScale > 2) {
    throw new Error("Text scale must be between 0.8 and 2.");
  }
  return {
    textScale,
    highContrast: value.highContrast ?? false,
    reducedMotion: value.reducedMotion ?? false,
    screenReaderOptimized: value.screenReaderOptimized ?? false,
  };
}

export function motionLevel(
  preferences: AccessibilityPreferences,
): "none" | "subtle" | "full" {
  if (preferences.screenReaderOptimized) return "none";
  return preferences.reducedMotion ? "subtle" : "full";
}

export function numberCellAccessibilityLabel(
  value: number | null,
  row: number,
  column: number,
  shared: boolean,
): string {
  const state = value === null ? "empty" : `value ${value}`;
  return `Number cell, row ${row + 1}, column ${column + 1}, ${state}${shared ? ", shared by multiple equations" : ""}.`;
}
