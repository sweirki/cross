import { useMemo } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ACADEMY_SKILL_GRAPH } from "../data/academySkillGraph";
import { LEARNING_CONTENT } from "../data/learningContent";
import {
  buildAdaptiveCurriculum,
  calculateMasteryProfile,
} from "../services/CrossMathAcademy";
import { buildLearnerAcademyDashboard } from "../services/AcademyPresentation";

const DEMO_NOW = "2026-01-01T00:00:00.000Z";

export function AcademyScreen() {
  const router = useRouter();
  const dashboard = useMemo(() => {
    const mastery = calculateMasteryProfile(ACADEMY_SKILL_GRAPH, [], DEMO_NOW);
    const curriculum = buildAdaptiveCurriculum(
      LEARNING_CONTENT,
      ACADEMY_SKILL_GRAPH,
      mastery,
      DEMO_NOW,
    );
    return buildLearnerAcademyDashboard(ACADEMY_SKILL_GRAPH, mastery, curriculum);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CROSSMATH ACADEMY</Text>
            <Text style={styles.title}>Your learning path</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View>
            <Text style={styles.heroLabel}>OVERALL MASTERY</Text>
            <Text style={styles.heroScore}>{dashboard.summary.overallScore}%</Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaValue}>
              {dashboard.summary.masteredCount}/{dashboard.summary.totalSkills}
            </Text>
            <Text style={styles.heroMetaLabel}>skills mastered</Text>
          </View>
        </View>

        <View style={styles.activity}>
          <Text style={styles.activityEyebrow}>RECOMMENDED NEXT</Text>
          <Text style={styles.activityTitle}>{dashboard.nextActivity.title}</Text>
          <Text style={styles.activityMessage}>{dashboard.nextActivity.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{dashboard.nextActivity.actionLabel}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Skill map</Text>
        <View style={styles.skillList}>
          {dashboard.skills.map((skill) => (
            <View
              accessibilityLabel={`${skill.title}, ${skill.score} percent mastery, ${skill.unlocked ? "unlocked" : "locked"}`}
              key={skill.concept}
              style={[styles.skillCard, !skill.unlocked && styles.lockedCard]}
            >
              <View style={styles.skillHeading}>
                <View style={[styles.levelBadge, !skill.unlocked && styles.lockedBadge]}>
                  <Text style={styles.levelText}>{skill.unlocked ? skill.level + 1 : "•"}</Text>
                </View>
                <View style={styles.skillCopy}>
                  <Text style={styles.skillTitle}>{skill.title}</Text>
                  <Text style={styles.skillDescription}>{skill.description}</Text>
                </View>
                <Text style={styles.skillScore}>{skill.score}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${skill.score}%` }]} />
              </View>
              {!skill.unlocked && (
                <Text style={styles.lockedText}>
                  Complete prerequisite skills to unlock
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F5" },
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 34, color: "#1E6D7A", lineHeight: 38 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "#277A84" },
  title: { marginTop: 2, fontSize: 24, fontWeight: "900", color: "#17221E" },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#153F47",
  },
  heroLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#A9D8D6" },
  heroScore: { marginTop: 4, fontSize: 42, fontWeight: "900", color: "#FFFFFF" },
  heroMeta: { alignItems: "flex-end", paddingBottom: 4 },
  heroMetaValue: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  heroMetaLabel: { marginTop: 2, fontSize: 11, color: "#C6DCDA" },
  activity: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DDDA",
  },
  activityEyebrow: { fontSize: 10, fontWeight: "800", color: "#4E9B7B", letterSpacing: 1 },
  activityTitle: { marginTop: 5, fontSize: 20, fontWeight: "900", color: "#17221E" },
  activityMessage: { marginTop: 5, fontSize: 13, lineHeight: 19, color: "#52635D" },
  primaryButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#277A84",
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  pressed: { opacity: 0.7 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#17221E" },
  skillList: { gap: 10 },
  skillCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DDDA",
  },
  lockedCard: { opacity: 0.6 },
  skillHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF3E8",
  },
  lockedBadge: { backgroundColor: "#E4E8E6" },
  levelText: { fontWeight: "900", color: "#315B50" },
  skillCopy: { flex: 1 },
  skillTitle: { fontSize: 15, fontWeight: "800", color: "#17221E" },
  skillDescription: { marginTop: 2, fontSize: 11, lineHeight: 15, color: "#64746E" },
  skillScore: { fontSize: 14, fontWeight: "900", color: "#277A84" },
  track: { marginTop: 10, height: 5, borderRadius: 3, backgroundColor: "#E4E8E6", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#4E9B7B" },
  lockedText: { marginTop: 8, fontSize: 10, fontWeight: "700", color: "#7A8580" },
});
