import { MOTION_TOKENS } from "./tokens";
import type { MotionLevel, ResolvedMotionPreferences } from "./types";

export type MotionAnimationName = "fade" | "slide" | "pop" | "shake" | "glow" | "confetti";

export interface MotionAnimation {
  readonly name: MotionAnimationName;
  readonly durationMs: number;
  readonly distance: number;
  readonly scale: number;
  readonly enabled: boolean;
}

const durations: Readonly<Record<MotionAnimationName, number>> = {
  fade: MOTION_TOKENS.duration.standard,
  slide: MOTION_TOKENS.duration.standard,
  pop: MOTION_TOKENS.duration.fast,
  shake: MOTION_TOKENS.duration.fast,
  glow: MOTION_TOKENS.duration.slow,
  confetti: MOTION_TOKENS.duration.celebration,
};

function allowed(name: MotionAnimationName, level: MotionLevel): boolean {
  if (level === "none") return false;
  if (level === "full") return true;
  return name === "fade" || name === "glow";
}

export function motionAnimation(
  name: MotionAnimationName,
  preferences: ResolvedMotionPreferences,
): MotionAnimation {
  const enabled = allowed(name, preferences.level);
  return Object.freeze({
    name,
    durationMs: enabled ? Math.round(durations[name] * preferences.durationScale) : 0,
    distance: enabled && preferences.level === "full" ? MOTION_TOKENS.distance.standard : 0,
    scale: enabled && preferences.level === "full" ? MOTION_TOKENS.scale.pop : 1,
    enabled,
  });
}
