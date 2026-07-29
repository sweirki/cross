import { motionAnimation, type MotionAnimation } from "./animations";
import type { ResolvedMotionPreferences } from "./types";

export type MotionTransitionName = "screen-enter" | "screen-exit" | "board-change" | "overlay";

export interface MotionTransition {
  readonly name: MotionTransitionName;
  readonly animation: MotionAnimation;
}

export function motionTransition(
  name: MotionTransitionName,
  preferences: ResolvedMotionPreferences,
): MotionTransition {
  const animationName = name === "overlay" ? "fade" :
    name === "board-change" ? "fade" : "slide";
  return Object.freeze({ name, animation: motionAnimation(animationName, preferences) });
}
