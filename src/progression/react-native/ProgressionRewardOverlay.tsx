
import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { RewardItem } from "../v1";

interface Props {
  readonly reward: RewardItem | null;
  readonly reducedMotion?: boolean;
  readonly onDismiss: () => void;
}

const ICONS: Record<RewardItem["kind"], string> = {
  xp: "✦",
  "level-up": "↑",
  achievement: "★",
  badge: "◆",
  streak: "🔥",
};

export function ProgressionRewardOverlay({ reward, reducedMotion = false, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reward === null || reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 13, stiffness: 170, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, reducedMotion, reward, scale]);

  return (
    <Modal
      visible={reward !== null}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        {reward !== null && (
          <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
            <Text style={styles.icon}>{ICONS[reward.kind]}</Text>
            <Text style={styles.kicker}>{reward.kind.replace("-", " ").toUpperCase()}</Text>
            <Text style={styles.title}>{reward.title}</Text>
            <Text style={styles.detail}>{reward.detail}</Text>
            <Pressable
              style={styles.button}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={`Continue after ${reward.title}`}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(14,27,22,0.68)" },
  card: { alignItems: "center", borderRadius: 24, padding: 24, backgroundColor: "#FFFFFF", elevation: 12 },
  icon: { fontSize: 48 },
  kicker: { marginTop: 8, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, color: "#277A84" },
  title: { marginTop: 8, fontSize: 27, fontWeight: "900", color: "#17221E", textAlign: "center" },
  detail: { marginTop: 8, color: "#52635D", textAlign: "center", lineHeight: 20 },
  button: { alignSelf: "stretch", marginTop: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: "#277A84", alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
