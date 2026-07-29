import * as Haptics from "expo-haptics";
import { AccessibilityInfo } from "react-native";
import { useCallback } from "react";
import { gameplayPolish, type GameplayFeedbackKind } from "../v1";

export function useGameplayFeedback(reducedMotion = false, hapticsEnabled = true) {
  return useCallback((kind: GameplayFeedbackKind) => {
    const feedback = gameplayPolish.feedback(kind, reducedMotion);
    AccessibilityInfo.announceForAccessibility(feedback.announcement);
    if (!hapticsEnabled) return feedback;
    switch (feedback.haptic) {
      case "selection":
        void Haptics.selectionAsync();
        break;
      case "success":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case "none":
        break;
    }
    return feedback;
  }, [hapticsEnabled, reducedMotion]);
}
