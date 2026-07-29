import { useEffect, useMemo, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { gameplayPolish, type GameplayCompletionInput } from "../v1";

interface Props {
  readonly visible: boolean;
  readonly input: GameplayCompletionInput;
  readonly reducedMotion?: boolean;
  readonly continueLabel: string;
  readonly onContinue: () => void;
  readonly onReplay: () => void;
  readonly onExit: () => void;
}

export function VictoryOverlay({
  visible,
  input,
  reducedMotion = false,
  continueLabel,
  onContinue,
  onReplay,
  onExit,
}: Props) {
  const reward = useMemo(() => gameplayPolish.reward(input), [input]);
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.86)).current;
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return;
    }
    scale.setValue(0.86);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 160 }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, reducedMotion, scale, visible]);

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={onExit}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.kicker}>PUZZLE COMPLETE</Text>
          <Text style={styles.title}>{reward.title}</Text>
          <View style={styles.stars} accessibilityLabel={`${reward.stars} out of 3 stars`}>
            {[1, 2, 3].map(star => <Text key={star} style={[styles.star, star > reward.stars && styles.starEmpty]}>★</Text>)}
          </View>
          <Text style={styles.message}>{reward.message}</Text>
          <View style={styles.stats}>
            <Stat label="XP earned" value={`+${reward.xp}`} />
            <Stat label="Time" value={gameplayPolish.formatElapsed(input.elapsedMs)} />
            <Stat label="Moves" value={String(input.moves)} />
            <Stat label="Accuracy" value={`${reward.accuracyPercent}%`} />
            <Stat label="Hints" value={String(input.hintsUsed)} />
            <Stat label="Mistakes" value={String(input.mistakes)} />
          </View>
          {reward.personalBest && <View style={styles.best}><Text style={styles.bestText}>New personal best</Text></View>}
          <Pressable style={styles.primary} onPress={onContinue} accessibilityRole="button">
            <Text style={styles.primaryText}>{continueLabel}</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable style={styles.secondary} onPress={onReplay}><Text style={styles.secondaryText}>Replay</Text></Pressable>
            <Pressable style={styles.secondary} onPress={onExit}><Text style={styles.secondaryText}>Exit</Text></Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(14,27,22,0.66)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 24, elevation: 12 },
  kicker: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5, color: "#277A84" },
  title: { marginTop: 8, fontSize: 29, fontWeight: "900", color: "#17221E", textAlign: "center" },
  stars: { flexDirection: "row", marginTop: 12, gap: 7 },
  star: { fontSize: 39, color: "#F1B93A" },
  starEmpty: { color: "#D8DEDB" },
  message: { marginTop: 10, color: "#52635D", lineHeight: 20, textAlign: "center" },
  stats: { width: "100%", marginTop: 18, flexDirection: "row", flexWrap: "wrap", backgroundColor: "#F4F7F5", borderRadius: 14, paddingVertical: 8 },
  stat: { width: "33.333%", alignItems: "center", paddingVertical: 9 },
  statValue: { fontSize: 18, fontWeight: "900", color: "#17221E" },
  statLabel: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "#6B7B75" },
  best: { marginTop: 13, borderRadius: 999, backgroundColor: "#DDF3E8", paddingHorizontal: 13, paddingVertical: 7 },
  bestText: { color: "#175C47", fontWeight: "900", fontSize: 12 },
  primary: { alignSelf: "stretch", marginTop: 18, borderRadius: 12, paddingVertical: 14, backgroundColor: "#277A84", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  secondaryRow: { alignSelf: "stretch", flexDirection: "row", gap: 10, marginTop: 10 },
  secondary: { flex: 1, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: "#A8B9B2", alignItems: "center" },
  secondaryText: { color: "#315B50", fontWeight: "900" },
});
