import { createContext } from "react";
import type { CrossMathTheme, LayoutMetrics, ThemePreferences } from "./types";
export interface ThemeContextValue {
  readonly preferences: ThemePreferences; readonly theme: CrossMathTheme; readonly layout: LayoutMetrics; readonly hydrated: boolean;
  setPreferences(value: ThemePreferences): Promise<void>;
  updatePreferences(patch: Partial<Omit<ThemePreferences, "schemaVersion">>): Promise<void>;
}
export const ThemeContext = createContext<ThemeContextValue | null>(null);
