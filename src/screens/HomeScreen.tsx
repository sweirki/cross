import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { applicationRuntime } from "../application/v1";
import { useApplicationProgress } from "../application/react-native";
import { BUNDLED_LIBRARY } from "../data/bundledLibrary";
import { COMMERCIAL_PUZZLES } from "../data/commercialPuzzles";
import { useCrossMathApp } from "../integration/react-native";
import { resolveVisualPalette } from "../ui/visual-refresh";
import { useTheme } from "../ui/theme";

type Difficulty = "easy" | "medium" | "hard" | "expert";
const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard", "expert"];
const DIFFICULTY_COPY: Readonly<Record<Difficulty, string>> = {
  easy: "3 equations · + and − · generous clues",
  medium: "5 equations · introduces × · 3 puzzle islands",
  hard: "7 equations · all operators · fewer clues",
  expert: "10 equations · all operators · 4 puzzle islands",
};

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");
  const { progress, hydrated } = useApplicationProgress();
  const { transition } = useCrossMathApp();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  if (!hydrated || !transition.state.hydrated) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}>
        <View style={styles.loading}><ActivityIndicator size="large" /></View>
      </SafeAreaView>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const daily = applicationRuntime.dailyPuzzle(COMMERCIAL_PUZZLES, today);
  const resumeId = transition.state.activePuzzleId ?? progress.lastPuzzleId;
  const completed = Object.values(progress.puzzleProgress).filter(item => item.completed).length;
  const stars = Object.values(progress.puzzleProgress).reduce((sum, item) => sum + item.stars, 0);

  const exact = COMMERCIAL_PUZZLES.filter(
    puzzle => puzzle.difficulty === difficulty,
  );
  const pool = exact.length > 0 ? exact : COMMERCIAL_PUZZLES;
  const seed = completed + stars + DIFFICULTIES.indexOf(difficulty);
  const newPuzzle = pool[seed % pool.length]!;

  const startPuzzle = (puzzleId: string, mode: "practice" | "daily", date?: string) => {
    router.push({
      pathname: "/play",
      params: { puzzleId, mode, ...(date ? { date } : {}) },
    });
  };

  const compact = width < 390;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { maxWidth: compact ? undefined : 560 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: palette.accent }]}>CROSSMATH</Text>
            <Text style={[styles.title, { color: palette.textStrong }]}>Ready for a puzzle?</Text>
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              {completed} solved · {stars} stars
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push("/settings")}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.board, borderColor: palette.boardBorder },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.iconText, { color: palette.textStrong }]}>⚙</Text>
          </Pressable>
        </View>

        {resumeId !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={() => startPuzzle(resumeId, "practice")}
            style={({ pressed }) => [
              styles.continueCard,
              { backgroundColor: palette.board, borderColor: palette.boardBorder },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.continueCopy}>
              <Text style={[styles.kicker, { color: palette.accent }]}>CONTINUE</Text>
              <Text style={[styles.cardTitle, { color: palette.textStrong }]}>Resume puzzle</Text>
              <Text style={[styles.cardBody, { color: palette.textMuted }]}>Pick up exactly where you stopped.</Text>
            </View>
            <View style={[styles.roundArrow, { backgroundColor: palette.accent }]}>
              <Text style={styles.roundArrowText}>›</Text>
            </View>
          </Pressable>
        )}

        <View style={[styles.newGameCard, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
          <Text style={[styles.kicker, { color: palette.accent }]}>NEW PUZZLE</Text>
          <Text style={[styles.cardTitle, { color: palette.textStrong }]}>Choose your challenge</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map(option => {
              const selected = option === difficulty;
              return (
                <Pressable
                  key={option}
                  onPress={() => setDifficulty(option)}
                  style={({ pressed }) => [
                    styles.difficultyChip,
                    {
                      backgroundColor: selected ? palette.accent : palette.canvas,
                      borderColor: selected ? palette.accent : palette.boardBorder,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.difficultyText, { color: selected ? "#FFFFFF" : palette.textStrong }]}>
                    {option[0]!.toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.difficultyCopy, { color: palette.textMuted }]}>
            {DIFFICULTY_COPY[difficulty]}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => startPuzzle(newPuzzle.id, "practice")}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Start puzzle</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => startPuzzle(daily.id, "daily", today)}
          style={({ pressed }) => [
            styles.dailyCard,
            { backgroundColor: palette.board, borderColor: palette.boardBorder },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.dailyBadge}><Text style={styles.dailyBadgeText}>☀</Text></View>
          <View style={styles.dailyCopy}>
            <Text style={[styles.cardTitleSmall, { color: palette.textStrong }]}>Daily puzzle</Text>
            <Text style={[styles.cardBody, { color: palette.textMuted }]}>
              {progress.dailyChallengeDates.includes(today) ? "Completed today" : "A fresh challenge is waiting"}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: palette.accent }]}>›</Text>
        </Pressable>

        <View style={styles.footerNav}>
          <FooterButton label="Statistics" symbol="▥" onPress={() => router.push("/stats")} palette={palette} />
          <FooterButton label="Learn" symbol="◈" onPress={() => router.push("/campaign")} palette={palette} />
          <FooterButton label="Profile" symbol="●" onPress={() => router.push("/profile")} palette={palette} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FooterButton({
  label,
  symbol,
  onPress,
  palette,
}: {
  readonly label: string;
  readonly symbol: string;
  readonly onPress: () => void;
  readonly palette: ReturnType<typeof resolveVisualPalette>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.footerButton,
        { backgroundColor: palette.board, borderColor: palette.boardBorder },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.footerSymbol, { color: palette.accent }]}>{symbol}</Text>
      <Text style={[styles.footerLabel, { color: palette.textStrong }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { width: "100%", alignSelf: "center", padding: 20, paddingBottom: 40, gap: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 },
  brand: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },
  title: { marginTop: 6, fontSize: 30, lineHeight: 36, fontWeight: "900" },
  subtitle: { marginTop: 5, fontSize: 14 },
  iconButton: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 20, fontWeight: "800" },
  continueCard: { minHeight: 132, borderRadius: 24, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center" },
  continueCopy: { flex: 1, paddingRight: 12 },
  kicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  cardTitle: { marginTop: 5, fontSize: 22, lineHeight: 28, fontWeight: "900" },
  cardTitleSmall: { fontSize: 17, fontWeight: "900" },
  cardBody: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  roundArrow: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  roundArrowText: { color: "#FFFFFF", fontSize: 30, lineHeight: 31, marginTop: -2 },
  newGameCard: { borderRadius: 24, borderWidth: 1, padding: 20 },
  difficultyRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  difficultyChip: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  difficultyText: { fontSize: 13, fontWeight: "800" },
  difficultyCopy: { marginTop: 12, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 52, marginTop: 18, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  dailyCard: { minHeight: 94, borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center" },
  dailyBadge: { width: 50, height: 50, borderRadius: 17, backgroundColor: "#FFF1C7", alignItems: "center", justifyContent: "center" },
  dailyBadgeText: { fontSize: 23 },
  dailyCopy: { flex: 1, paddingHorizontal: 14 },
  chevron: { fontSize: 28 },
  footerNav: { flexDirection: "row", gap: 10 },
  footerButton: { flex: 1, minHeight: 82, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  footerSymbol: { fontSize: 19, fontWeight: "900" },
  footerLabel: { fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
});
