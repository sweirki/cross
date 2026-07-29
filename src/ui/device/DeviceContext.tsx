import { createContext } from "react";
import type { DeviceFeelCue, DevicePreferences } from "./types";

export interface DeviceContextValue {
  readonly preferences: DevicePreferences;
  readonly hydrated: boolean;
  readonly setPreferences: (preferences: DevicePreferences) => Promise<void>;
  readonly updatePreferences: (
    patch: Partial<Omit<DevicePreferences, "schemaVersion">>,
  ) => Promise<void>;
  readonly perform: (cue: DeviceFeelCue) => Promise<void>;
}

export const DeviceContext = createContext<DeviceContextValue | null>(null);
