import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveVisualPalette } from "../../ui/visual-refresh";
import { useTheme } from "../../ui/theme";

interface GameHudProps {
  readonly label: string;
  readonly title: string;
  readonly moves: number;
  readonly hints: number;
  readonly elapsedMs: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onBack: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

function formatTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function GameHud({
  label,
  title,
  moves,
  hints,
  elapsedMs,
  canUndo,
  canRedo,
  onBack,
  onUndo,
  onRedo,
}: GameHudProps) {
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");

  return (
    <View
      accessibilityLabel={`${label}. ${title}. ${moves} moves, ${hints} hints, ${formatTime(elapsedMs)}`}
      style={[
        styles.shell,
        {
          backgroundColor: palette.hud,
          borderColor: palette.boardBorder,
          shadowColor: palette.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel="Back to home"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Text style={[styles.icon, { color: palette.accent }]}>‹</Text>
        </Pressable>

        <View style={styles.titleGroup}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{label}</Text>
          <Text numberOfLines={1} style={[styles.title, { color: palette.textStrong }]}>
            {title}
          </Text>
        </View>

        <View style={styles.history}>
          <Pressable
            accessibilityLabel="Undo last move"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canUndo }}
            disabled={!canUndo}
            hitSlop={8}
            onPress={onUndo}
            style={({ pressed }) => [styles.iconButton, !canUndo && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={[styles.actionIcon, { color: palette.accent }]}>↶</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Redo last move"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRedo }}
            disabled={!canRedo}
            hitSlop={8}
            onPress={onRedo}
            style={({ pressed }) => [styles.iconButton, !canRedo && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={[styles.actionIcon, { color: palette.accent }]}>↷</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: palette.accentSoft }]}>
          <Text style={[styles.statValue, { color: palette.textStrong }]}>{moves}</Text>
          <Text style={[styles.statLabel, { color: palette.textMuted }]}>MOVES</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: palette.accentSoft }]}>
          <Text style={[styles.statValue, { color: palette.textStrong }]}>{hints}</Text>
          <Text style={[styles.statLabel, { color: palette.textMuted }]}>HINTS</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: palette.accentSoft }]}>
          <Text style={[styles.statValue, { color: palette.textStrong }]}>{formatTime(elapsedMs)}</Text>
          <Text style={[styles.statLabel, { color: palette.textMuted }]}>TIME</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleGroup: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { fontSize: 18, fontWeight: "900", marginTop: 1 },
  history: { flexDirection: "row", gap: 2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 34, lineHeight: 36, fontWeight: "500" },
  actionIcon: { fontSize: 23, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 7, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "900" },
  statLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, marginTop: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.25 },
});
