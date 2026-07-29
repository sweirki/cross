import * as Haptics from "expo-haptics";
import { AccessibilityInfo, findNodeHandle } from "react-native";
import type {
  AccessibilityDriver, AudioDriver, HapticToken, HapticsDriver, SoundToken,
} from "./types";

const hapticMap: Record<HapticToken, () => Promise<void>> = {
  selection: () => Haptics.selectionAsync(),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  celebration: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

export const expoHapticsDriver: HapticsDriver = {
  trigger: token => hapticMap[token](),
};

export const noOpAudioDriver: AudioDriver = {
  async play(_token: SoundToken): Promise<void> {
    // Sound assets are intentionally injected by the app; absent assets degrade to no-op.
  },
};

export const reactNativeAccessibilityDriver: AccessibilityDriver = {
  announce(message) {
    AccessibilityInfo.announceForAccessibility(message);
  },
  focus(targetId) {
    const numericTag = Number(targetId);
    if (Number.isInteger(numericTag) && numericTag > 0) {
      AccessibilityInfo.setAccessibilityFocus(numericTag);
    }
  },
};

export function focusReactNativeRef(ref: unknown): void {
  const handle = findNodeHandle(ref as never);
  if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
}
