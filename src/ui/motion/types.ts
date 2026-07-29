export type MotionPreference = "system" | "reduce" | "full";
export type MotionSpeed = "slow" | "standard" | "fast";
export type MotionLevel = "none" | "reduced" | "full";

export interface MotionPreferences {
  readonly schemaVersion: 1;
  readonly motion: MotionPreference;
  readonly speed: MotionSpeed;
  readonly animationsEnabled: boolean;
}

export interface ResolvedMotionPreferences {
  readonly level: MotionLevel;
  readonly durationScale: number;
  readonly animationsEnabled: boolean;
  readonly systemReduceMotion: boolean;
}

export interface MotionPreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
