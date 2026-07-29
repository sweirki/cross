import { createContext } from "react";
import type { MotionAnimation, MotionAnimationName } from "./animations";
import type { MotionPreferences, ResolvedMotionPreferences } from "./types";
import type { MotionTransition, MotionTransitionName } from "./transitions";

export interface MotionContextValue {
  readonly preferences: MotionPreferences;
  readonly resolved: ResolvedMotionPreferences;
  readonly hydrated: boolean;
  readonly setPreferences: (preferences: MotionPreferences) => Promise<void>;
  readonly updatePreferences: (patch: Partial<Omit<MotionPreferences, "schemaVersion">>) => Promise<void>;
  readonly animation: (name: MotionAnimationName) => MotionAnimation;
  readonly transition: (name: MotionTransitionName) => MotionTransition;
}

export const MotionContext = createContext<MotionContextValue | null>(null);
