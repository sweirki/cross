import { DEFAULT_DEVICE_PREFERENCES, parseDevicePreferences } from "./preferences";
import type { DevicePreferenceStorage, DevicePreferences } from "./types";

export const DEVICE_PREFERENCES_STORAGE_KEY = "crossmath.device-preferences.v1";

export async function loadDevicePreferences(storage: DevicePreferenceStorage): Promise<DevicePreferences> {
  try {
    const raw = await storage.getItem(DEVICE_PREFERENCES_STORAGE_KEY);
    return raw === null ? DEFAULT_DEVICE_PREFERENCES : parseDevicePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_DEVICE_PREFERENCES;
  }
}

export async function saveDevicePreferences(
  storage: DevicePreferenceStorage,
  preferences: DevicePreferences,
): Promise<void> {
  await storage.setItem(DEVICE_PREFERENCES_STORAGE_KEY, JSON.stringify(parseDevicePreferences(preferences)));
}
