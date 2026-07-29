import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplicationProgress } from "../application/react-native";
import { resolveVisualPalette } from "../ui/visual-refresh";
import { useTheme } from "../ui/theme";

export function StatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");
  const { progress, hydrated } = useApplicationProgress();

  if (!hydrated) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}><View style={styles.loading}><ActivityIndicator size="large" /></View></SafeAreaView>;
  }

  const records = Object.values(progress.puzzleProgress);
  const completed = records.filter(item => item.completed).length;
  const stars = records.reduce((sum, item) => sum + item.stars, 0);
  const bestMoves = records.map(item => item.bestMoves).filter((value): value is number => value !== null);
  const best = bestMoves.length > 0 ? Math.min(...bestMoves) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
            <Text style={[styles.backText, { color: palette.textStrong }]}>‹</Text>
          </Pressable>
          <Text style={[styles.title, { color: palette.textStrong }]}>Statistics</Text>
          <View style={styles.back} />
        </View>

        <View style={styles.grid}>
          <Stat label="Puzzles solved" value={String(completed)} palette={palette} />
          <Stat label="Stars earned" value={String(stars)} palette={palette} />
          <Stat label="Daily puzzles" value={String(progress.dailyChallengeDates.length)} palette={palette} />
          <Stat label="Best moves" value={best === null ? "—" : String(best)} palette={palette} />
        </View>

        <View style={[styles.card, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textStrong }]}>Keep going</Text>
          <Text style={[styles.cardBody, { color: palette.textMuted }]}>
            Every completed puzzle improves your number sense and adds to these totals.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={[styles.primary, { backgroundColor: palette.accent }]}>
            <Text style={styles.primaryText}>Back to puzzles</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, palette }: { readonly label: string; readonly value: string; readonly palette: ReturnType<typeof resolveVisualPalette> }) {
  return (
    <View style={[styles.stat, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
      <Text style={[styles.statValue, { color: palette.textStrong }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { width: "100%", maxWidth: 620, alignSelf: "center", padding: 20, paddingBottom: 40, gap: 16 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 30, lineHeight: 31 },
  title: { fontSize: 25, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { width: "48%", minHeight: 126, borderRadius: 22, borderWidth: 1, padding: 18, justifyContent: "center" },
  statValue: { fontSize: 31, fontWeight: "900" },
  statLabel: { marginTop: 5, fontSize: 13 },
  card: { borderRadius: 22, borderWidth: 1, padding: 20 },
  cardTitle: { fontSize: 19, fontWeight: "900" },
  cardBody: { marginTop: 6, fontSize: 13, lineHeight: 20 },
  primary: { marginTop: 16, minHeight: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
