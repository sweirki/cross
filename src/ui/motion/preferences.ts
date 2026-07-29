import type {
  MotionPreferences,
  MotionPreference,
  MotionSpeed,
  ResolvedMotionPreferences,
} from "./types";

export const DEFAULT_MOTION_PREFERENCES: MotionPreferences = Object.freeze({
  schemaVersion: 1,
  motion: "system",
  speed: "standard",
  animationsEnabled: true,
});

const MOTION_VALUES = new Set<MotionPreference>(["system", "reduce", "full"]);
const SPEED_VALUES = new Set<MotionSpeed>(["slow", "standard", "fast"]);

export function validateMotionPreferences(value: MotionPreferences): MotionPreferences {
  if (value.schemaVersion !== 1) throw new Error("Unsupported motion preferences schema.");
  if (!MOTION_VALUES.has(value.motion)) throw new Error("Invalid motion preference.");
  if (!SPEED_VALUES.has(value.speed)) throw new Error("Invalid motion speed.");
  if (typeof value.animationsEnabled !== "boolean") throw new Error("Invalid animation preference.");
  return Object.freeze({ ...value });
}

export function resolveMotionPreferences(
  preferences: MotionPreferences,
  systemReduceMotion: boolean,
): ResolvedMotionPreferences {
  validateMotionPreferences(preferences);
  const reduced = preferences.motion === "reduce" ||
    (preferences.motion === "system" && systemReduceMotion);
  const durationScale = preferences.speed === "slow" ? 1.25 :
    preferences.speed === "fast" ? 0.75 : 1;
  return Object.freeze({
    level: !preferences.animationsEnabled ? "none" : reduced ? "reduced" : "full",
    durationScale,
    animationsEnabled: preferences.animationsEnabled,
    systemReduceMotion,
  });
}

export function updateMotionPreferences(
  current: MotionPreferences,
  patch: Partial<Omit<MotionPreferences, "schemaVersion">>,
): MotionPreferences {
  return validateMotionPreferences({ ...current, ...patch, schemaVersion: 1 });
}
