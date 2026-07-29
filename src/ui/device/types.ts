export const DEVICE_PREFERENCES_SCHEMA_VERSION = 1 as const;

export type AnnouncementVerbosity = "minimal" | "standard" | "detailed";
export type DeviceFeelEventKind =
  | "tile-select" | "tile-place" | "invalid" | "equation-complete"
  | "victory" | "achievement" | "level-up";

export interface DevicePreferences {
  readonly schemaVersion: typeof DEVICE_PREFERENCES_SCHEMA_VERSION;
  readonly hapticsEnabled: boolean;
  readonly soundEnabled: boolean;
  readonly screenReaderOptimizations: boolean;
  readonly announcementVerbosity: AnnouncementVerbosity;
}

export interface DevicePreferenceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface DeviceFeelEvent {
  readonly kind: DeviceFeelEventKind;
  readonly targetId?: string;
  readonly message?: string;
}

export type HapticToken = "selection" | "light" | "warning" | "success" | "celebration";
export type SoundToken = "tap" | "place" | "error" | "success" | "victory" | "reward";
export type AccessibilityPoliteness = "polite" | "assertive";

export interface DeviceFeelCue {
  readonly sequence: number;
  readonly kind: DeviceFeelEventKind;
  readonly targetId: string | null;
  readonly haptic: HapticToken | null;
  readonly sound: SoundToken | null;
  readonly announcement: string | null;
  readonly politeness: AccessibilityPoliteness;
}

export interface HapticsDriver { trigger(token: HapticToken): Promise<void>; }
export interface AudioDriver { play(token: SoundToken): Promise<void>; }
export interface AccessibilityDriver {
  announce(message: string): void;
  focus?(targetId: string): void;
}
