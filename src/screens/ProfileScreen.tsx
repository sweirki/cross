
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplicationProgress } from "../application/react-native";
import { ACHIEVEMENTS, progressionRuntime } from "../progression/v1";
import { useProgression } from "../progression/react-native";

export function ProfileScreen() {
  const router = useRouter();
  const { progress } = useApplicationProgress();
  const { progression } = useProgression();
  const items = Object.values(progress.puzzleProgress);
  const level = progressionRuntime.levelProgress(progression);
  const average = progressionRuntime.averageSolveTimeMs(progression);
  const unlocked = new Set(progression.achievements.map(item => item.id));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Home</Text></Pressable>
        <Text style={styles.eyebrow}>PLAYER PROFILE</Text>
        <View style={styles.hero}>
          <View style={styles.levelBadge}><Text style={styles.levelNumber}>{progression.level}</Text></View>
          <View style={styles.heroText}>
            <Text style={styles.title}>Level {progression.level}</Text>
            <Text style={styles.subtitle}>{progression.totalXp} total XP</Text>
          </View>
          <View style={styles.streak}><Text style={styles.streakValue}>🔥 {progression.currentStreak}</Text><Text style={styles.streakLabel}>day streak</Text></View>
        </View>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: level.required, now: level.current }}>
          <View style={[styles.progressFill, { width: `${level.percent}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{level.current} / {level.required} XP to level {progression.level + 1}</Text>

        <View style={styles.grid}>
          <Metric label="Puzzles" value={progression.stats.puzzlesCompleted} />
          <Metric label="Stars" value={progression.stats.totalStars} />
          <Metric label="Best streak" value={progression.longestStreak} />
          <Metric label="Achievements" value={`${progression.achievements.length}/${ACHIEVEMENTS.length}`} />
          <Metric label="Perfect solves" value={progression.stats.perfectSolves} />
          <Metric label="Avg. solve" value={average === null ? "—" : formatDuration(average)} />
        </View>

        <Text style={styles.section}>Badges</Text>
        <View style={styles.badges}>
          {ACHIEVEMENTS.map(achievement => {
            const earned = unlocked.has(achievement.id);
            return (
              <View key={achievement.id} style={[styles.badge, !earned && styles.badgeLocked]} accessible accessibilityLabel={`${achievement.name}, ${earned ? "earned" : "locked"}`}>
                <Text style={styles.badgeIcon}>{earned ? "◆" : "◇"}</Text>
                <Text style={styles.badgeName}>{achievement.name}</Text>
                <Text style={styles.badgeDescription}>{achievement.description}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Recent activity</Text>
        {items.length === 0
          ? <Text style={styles.empty}>Complete a puzzle to begin your history.</Text>
          : items
              .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
              .slice(0, 8)
              .map(item => (
                <View key={item.puzzleId} style={styles.row}>
                  <Text style={styles.rowTitle}>{item.puzzleId}</Text>
                  <Text style={styles.rowMeta}>{item.stars} stars · {item.bestMoves ?? 0} moves</Text>
                </View>
              ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string | number }) {
  return <View style={styles.metric}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  container: { padding: 16, paddingBottom: 36, gap: 12 },
  back: { fontSize: 16, fontWeight: "800", color: "#277A84" },
  eyebrow: { marginTop: 8, fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: "#277A84" },
  hero: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D7DDDA" },
  levelBadge: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#277A84" },
  levelNumber: { color: "#FFFFFF", fontSize: 25, fontWeight: "900" },
  heroText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 25, fontWeight: "900", color: "#17221E" },
  subtitle: { marginTop: 2, color: "#64746E" },
  streak: { alignItems: "center" },
  streakValue: { fontSize: 18, fontWeight: "900", color: "#17221E" },
  streakLabel: { fontSize: 10, color: "#64746E" },
  progressTrack: { height: 12, borderRadius: 6, backgroundColor: "#DCE6E1", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6, backgroundColor: "#277A84" },
  progressLabel: { fontSize: 11, fontWeight: "700", color: "#52635D", textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "48%", padding: 16, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D7DDDA" },
  value: { fontSize: 24, fontWeight: "900", color: "#17221E" },
  label: { marginTop: 3, fontSize: 11, color: "#64746E" },
  section: { marginTop: 8, fontSize: 18, fontWeight: "900", color: "#17221E" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: { width: "48%", minHeight: 132, padding: 14, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#BFD8CE" },
  badgeLocked: { opacity: 0.45 },
  badgeIcon: { fontSize: 25, color: "#277A84" },
  badgeName: { marginTop: 6, fontSize: 13, fontWeight: "900", color: "#17221E" },
  badgeDescription: { marginTop: 4, fontSize: 10, lineHeight: 14, color: "#64746E" },
  empty: { color: "#64746E" },
  row: { padding: 14, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D7DDDA" },
  rowTitle: { fontWeight: "800", color: "#17221E" },
  rowMeta: { marginTop: 3, fontSize: 11, color: "#64746E" },
});
