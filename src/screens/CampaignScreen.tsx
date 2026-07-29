import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApplicationProgress } from "../application/react-native";
import {
  campaignExperience,
  type CampaignChapterView,
  type CampaignLessonView,
} from "../application/v1";
import { LEARNING_CONTENT } from "../data/learningContent";

export function CampaignScreen() {
  const router = useRouter();
  const { progress } = useApplicationProgress();
  const campaign = useMemo(
    () => campaignExperience.build(LEARNING_CONTENT, progress),
    [progress],
  );

  const openLesson = (lessonId: string) => {
    router.push({
      pathname: "/lesson/[lessonId]",
      params: { lessonId },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>

        <View>
          <Text style={styles.eyebrow}>CAMPAIGN</Text>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.subtitle}>
            Build your CrossMath skills one lesson at a time.
          </Text>
        </View>

        <CampaignSummary
          completedLessons={campaign.completedLessons}
          completionPercent={campaign.completionPercent}
          earnedStars={campaign.earnedStars}
          maximumStars={campaign.maximumStars}
          totalLessons={campaign.totalLessons}
        />

        {campaign.resumeLessonId !== null && (
          <ResumeCard
            lesson={campaign.chapters
              .flatMap((chapter) => chapter.lessons)
              .find((item) => item.id === campaign.resumeLessonId)!}
            onPress={() => openLesson(campaign.resumeLessonId!)}
          />
        )}

        {campaign.campaignCompleted && (
          <View accessibilityRole="summary" style={styles.completeCard}>
            <Text style={styles.completeEyebrow}>CAMPAIGN COMPLETE</Text>
            <Text style={styles.completeTitle}>You finished the learning path</Text>
            <Text style={styles.completeBody}>
              Replay lessons to improve your stars or continue with practice.
            </Text>
          </View>
        )}

        {campaign.chapters.map((chapter, index) => (
          <ChapterCard
            chapter={chapter}
            chapterNumber={index + 1}
            key={chapter.id}
            onLessonPress={openLesson}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CampaignSummary({
  completedLessons,
  completionPercent,
  earnedStars,
  maximumStars,
  totalLessons,
}: {
  readonly completedLessons: number;
  readonly completionPercent: number;
  readonly earnedStars: number;
  readonly maximumStars: number;
  readonly totalLessons: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View>
          <Text style={styles.summaryLabel}>OVERALL PROGRESS</Text>
          <Text style={styles.summaryValue}>{completionPercent}%</Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryStat}>
            {completedLessons}/{totalLessons} lessons
          </Text>
          <Text style={styles.summaryStat}>
            ★ {earnedStars}/{maximumStars}
          </Text>
        </View>
      </View>
      <AnimatedProgress percent={completionPercent} />
    </View>
  );
}

function ResumeCard({
  lesson,
  onPress,
}: {
  readonly lesson: CampaignLessonView;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint="Opens the lesson you most recently started"
      accessibilityLabel={`Resume ${lesson.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resumeCard, pressed && styles.pressed]}
    >
      <View style={styles.resumeIcon}>
        <Text style={styles.resumeIconText}>▶</Text>
      </View>
      <View style={styles.resumeCopy}>
        <Text style={styles.resumeLabel}>RESUME LESSON</Text>
        <Text style={styles.resumeTitle}>{lesson.title}</Text>
        <Text style={styles.resumeMeta}>{lesson.completionPercent}% complete</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function ChapterCard({
  chapter,
  chapterNumber,
  onLessonPress,
}: {
  readonly chapter: CampaignChapterView;
  readonly chapterNumber: number;
  readonly onLessonPress: (lessonId: string) => void;
}) {
  const statusText =
    chapter.status === "completed"
      ? "Complete"
      : chapter.status === "locked"
        ? "Locked"
        : "In progress";

  return (
    <View
      accessibilityLabel={`${chapter.title}, ${chapter.completionPercent}% complete`}
      style={[
        styles.chapterCard,
        chapter.status === "locked" && styles.chapterLocked,
      ]}
    >
      <View style={styles.chapterHeader}>
        <View style={styles.chapterBadge}>
          <Text style={styles.chapterBadgeText}>{chapterNumber}</Text>
        </View>
        <View style={styles.chapterHeaderCopy}>
          <Text style={styles.chapterEyebrow}>CHAPTER {chapterNumber}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            chapter.status === "completed" && styles.statusPillComplete,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              chapter.status === "completed" && styles.statusTextComplete,
            ]}
          >
            {statusText}
          </Text>
        </View>
      </View>

      <Text style={styles.chapterDescription}>{chapter.description}</Text>

      <View style={styles.chapterProgressRow}>
        <Text style={styles.chapterProgressText}>
          {chapter.completedLessons}/{chapter.totalLessons} lessons
        </Text>
        <Text style={styles.chapterProgressText}>
          ★ {chapter.earnedStars}/{chapter.maximumStars}
        </Text>
      </View>
      <AnimatedProgress percent={chapter.completionPercent} compact />

      <View style={styles.map}>
        {chapter.lessons.map((lesson, index) => (
          <View key={lesson.id}>
            <LessonNode lesson={lesson} onPress={() => onLessonPress(lesson.id)} />
            {index < chapter.lessons.length - 1 && (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.pathSegment,
                  lesson.status === "completed"
                    ? styles.pathSegmentComplete
                    : styles.pathSegmentLocked,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function LessonNode({
  lesson,
  onPress,
}: {
  readonly lesson: CampaignLessonView;
  readonly onPress: () => void;
}) {
  const locked = lesson.status === "locked";
  const completed = lesson.status === "completed";
  const statusLabel =
    lesson.status === "completed"
      ? `Completed with ${lesson.earnedStars} of ${lesson.maximumStars} stars`
      : lesson.status === "in-progress"
        ? `${lesson.completionPercent}% complete`
        : lesson.status === "available"
          ? "Available"
          : "Locked";

  return (
    <Pressable
      accessibilityHint={locked ? "Complete the previous lesson to unlock" : "Opens lesson details"}
      accessibilityLabel={`Lesson ${lesson.order}: ${lesson.title}. ${statusLabel}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lessonRow,
        lesson.isResumeTarget && styles.lessonResume,
        pressed && !locked && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.lessonNode,
          locked && styles.lessonNodeLocked,
          completed && styles.lessonNodeComplete,
          lesson.status === "in-progress" && styles.lessonNodeCurrent,
        ]}
      >
        <Text
          style={[
            styles.lessonNodeText,
            completed && styles.lessonNodeTextComplete,
          ]}
        >
          {completed ? "✓" : locked ? "🔒" : lesson.order}
        </Text>
      </View>

      <View style={styles.lessonCopy}>
        <View style={styles.lessonTitleRow}>
          <Text style={[styles.lessonTitle, locked && styles.lessonTitleLocked]}>
            {lesson.title}
          </Text>
          {lesson.isResumeTarget && (
            <View style={styles.resumePill}>
              <Text style={styles.resumePillText}>RESUME</Text>
            </View>
          )}
        </View>
        <Text style={styles.lessonMeta}>{statusLabel}</Text>
        {!locked && (
          <View style={styles.stars}>
            {[1, 2, 3].map((star) => (
              <Text
                key={star}
                style={[
                  styles.star,
                  star <= lesson.earnedStars && styles.starEarned,
                ]}
              >
                ★
              </Text>
            ))}
          </View>
        )}
      </View>

      {!locked && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

function AnimatedProgress({
  percent,
  compact = false,
}: {
  readonly percent: number;
  readonly compact?: boolean;
}) {
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      duration: 450,
      toValue: Math.max(0, Math.min(100, percent)),
      useNativeDriver: false,
    }).start();
  }, [animated, percent]);

  const width = animated.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      accessibilityLabel={`${percent}% complete`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.progressTrack, compact && styles.progressTrackCompact]}
    >
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  container: { padding: 16, paddingBottom: 44, gap: 14 },
  back: { fontSize: 16, fontWeight: "800", color: "#277A84" },
  eyebrow: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#277A84",
  },
  title: { marginTop: 4, fontSize: 30, fontWeight: "900", color: "#17221E" },
  subtitle: { marginTop: 6, color: "#64746E", lineHeight: 20 },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#183D36",
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "#A9D5C4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  summaryValue: { marginTop: 2, color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  summaryStats: { alignItems: "flex-end", gap: 3 },
  summaryStat: { color: "#DDF3E8", fontSize: 12, fontWeight: "700" },
  progressTrack: {
    marginTop: 12,
    height: 9,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "#315B50",
  },
  progressTrackCompact: {
    marginTop: 8,
    height: 6,
    backgroundColor: "#E1E8E5",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#68C69F",
  },
  resumeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#E8F6F0",
    borderWidth: 1,
    borderColor: "#A9D5C4",
  },
  resumeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#277A84",
  },
  resumeIconText: { marginLeft: 2, color: "#FFFFFF", fontSize: 14 },
  resumeCopy: { flex: 1 },
  resumeLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#277A84",
  },
  resumeTitle: { marginTop: 2, fontSize: 16, fontWeight: "900", color: "#17221E" },
  resumeMeta: { marginTop: 2, fontSize: 11, color: "#52635D" },
  chevron: { fontSize: 28, color: "#688079" },
  completeCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFF7D6",
    borderWidth: 1,
    borderColor: "#E3C85F",
  },
  completeEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#806B13",
  },
  completeTitle: { marginTop: 4, fontSize: 18, fontWeight: "900", color: "#3A3110" },
  completeBody: { marginTop: 5, color: "#6B5B1E", lineHeight: 19 },
  chapterCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DDDA",
  },
  chapterLocked: { opacity: 0.72 },
  chapterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chapterBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF3E8",
  },
  chapterBadgeText: { fontSize: 15, fontWeight: "900", color: "#315B50" },
  chapterHeaderCopy: { flex: 1 },
  chapterEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#70817B",
  },
  chapterTitle: { marginTop: 2, fontSize: 20, fontWeight: "900", color: "#17221E" },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EDF1EF",
  },
  statusPillComplete: { backgroundColor: "#DDF3E8" },
  statusText: { fontSize: 10, fontWeight: "900", color: "#64746E" },
  statusTextComplete: { color: "#277A60" },
  chapterDescription: { marginTop: 10, color: "#64746E", lineHeight: 19 },
  chapterProgressRow: {
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chapterProgressText: { fontSize: 11, fontWeight: "700", color: "#64746E" },
  map: { marginTop: 14 },
  lessonRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  lessonResume: { backgroundColor: "#F0F8F5" },
  lessonNode: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF3E8",
    borderWidth: 2,
    borderColor: "#68A98E",
  },
  lessonNodeLocked: {
    backgroundColor: "#EEF1F0",
    borderColor: "#CDD5D2",
  },
  lessonNodeComplete: {
    backgroundColor: "#277A60",
    borderColor: "#277A60",
  },
  lessonNodeCurrent: {
    backgroundColor: "#E5F4F7",
    borderColor: "#277A84",
  },
  lessonNodeText: { fontSize: 15, fontWeight: "900", color: "#315B50" },
  lessonNodeTextComplete: { color: "#FFFFFF" },
  lessonCopy: { flex: 1 },
  lessonTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  lessonTitle: { flexShrink: 1, fontSize: 15, fontWeight: "900", color: "#17221E" },
  lessonTitleLocked: { color: "#83918C" },
  lessonMeta: { marginTop: 3, fontSize: 11, color: "#64746E" },
  resumePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#277A84",
  },
  resumePillText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#FFFFFF",
  },
  stars: { marginTop: 4, flexDirection: "row", gap: 2 },
  star: { fontSize: 13, color: "#D4DBD8" },
  starEarned: { color: "#E4B528" },
  pathSegment: {
    width: 4,
    height: 18,
    marginLeft: 24,
    borderRadius: 2,
  },
  pathSegmentComplete: { backgroundColor: "#68A98E" },
  pathSegmentLocked: { backgroundColor: "#D7DDDA" },
  pressed: { opacity: 0.65 },
});
