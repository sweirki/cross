export const THEME_PREFERENCES_SCHEMA_VERSION = 1 as const;

export type ThemeMode = "system" | "light" | "dark";
export type ContrastMode = "standard" | "high";
export type ResolvedThemeMode = "light" | "dark";
export type Breakpoint = "compact" | "medium" | "expanded";

export interface ThemePreferences {
  readonly schemaVersion: typeof THEME_PREFERENCES_SCHEMA_VERSION;
  readonly mode: ThemeMode;
  readonly contrast: ContrastMode;
  readonly responsiveType: boolean;
}

export interface ThemePreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface ColorTokens {
  readonly background: string;
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly text: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly border: string;
  readonly focus: string;
  readonly overlay: string;
}

export interface CrossMathTheme {
  readonly mode: ResolvedThemeMode;
  readonly contrast: ContrastMode;
  readonly colors: ColorTokens;
}

export interface LayoutMetrics {
  readonly breakpoint: Breakpoint;
  readonly columns: 1 | 2 | 3;
  readonly gutter: number;
  readonly contentMaxWidth: number;
  readonly typeScale: number;
}
