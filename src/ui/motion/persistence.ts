import { DEFAULT_MOTION_PREFERENCES, validateMotionPreferences } from "./preferences";
import type { MotionPreferences, MotionPreferenceStorage } from "./types";

export const MOTION_PREFERENCES_STORAGE_KEY = "crossmath:motion-preferences:v1";

export function serializeMotionPreferences(preferences: MotionPreferences): string {
  const valid = validateMotionPreferences(preferences);
  return JSON.stringify({
    schemaVersion: valid.schemaVersion,
    motion: valid.motion,
    speed: valid.speed,
    animationsEnabled: valid.animationsEnabled,
  });
}

export function parseMotionPreferences(serialized: string): MotionPreferences {
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { throw new Error("Motion preferences are not valid JSON."); }
  if (typeof value !== "object" || value === null) throw new Error("Motion preferences must be an object.");
  return validateMotionPreferences(value as MotionPreferences);
}

export async function loadMotionPreferences(
  storage: MotionPreferenceStorage,
): Promise<MotionPreferences> {
  const value = await storage.getItem(MOTION_PREFERENCES_STORAGE_KEY);
  return value === null ? DEFAULT_MOTION_PREFERENCES : parseMotionPreferences(value);
}

export async function saveMotionPreferences(
  storage: MotionPreferenceStorage,
  preferences: MotionPreferences,
): Promise<void> {
  await storage.setItem(MOTION_PREFERENCES_STORAGE_KEY, serializeMotionPreferences(preferences));
}

export async function clearMotionPreferences(storage: MotionPreferenceStorage): Promise<void> {
  await storage.removeItem(MOTION_PREFERENCES_STORAGE_KEY);
}
