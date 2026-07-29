import {
  DEVICE_PREFERENCES_SCHEMA_VERSION,
  type AnnouncementVerbosity,
  type DevicePreferences,
} from "./types";

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferences = Object.freeze({
  schemaVersion: DEVICE_PREFERENCES_SCHEMA_VERSION,
  hapticsEnabled: true,
  soundEnabled: true,
  screenReaderOptimizations: true,
  announcementVerbosity: "standard",
});

const verbosities = new Set<AnnouncementVerbosity>(["minimal", "standard", "detailed"]);

export function parseDevicePreferences(value: unknown): DevicePreferences {
  if (!value || typeof value !== "object") return DEFAULT_DEVICE_PREFERENCES;
  const candidate = value as Partial<DevicePreferences>;
  return Object.freeze({
    schemaVersion: DEVICE_PREFERENCES_SCHEMA_VERSION,
    hapticsEnabled: typeof candidate.hapticsEnabled === "boolean" ? candidate.hapticsEnabled : true,
    soundEnabled: typeof candidate.soundEnabled === "boolean" ? candidate.soundEnabled : true,
    screenReaderOptimizations: typeof candidate.screenReaderOptimizations === "boolean"
      ? candidate.screenReaderOptimizations : true,
    announcementVerbosity: verbosities.has(candidate.announcementVerbosity as AnnouncementVerbosity)
      ? candidate.announcementVerbosity as AnnouncementVerbosity : "standard",
  });
}

export function updateDevicePreferences(
  current: DevicePreferences,
  patch: Partial<Omit<DevicePreferences, "schemaVersion">>,
): DevicePreferences {
  return parseDevicePreferences({ ...current, ...patch });
}
