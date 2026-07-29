import { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BUNDLED_LIBRARY } from "../data/bundledLibrary";
import { LEARNING_CONTENT } from "../data/learningContent";
import {
  createStudioTemplateDocument,
  runStudioQa,
} from "../services/CrossMathStudio";

export function StudioScreen() {
  const templates = useMemo(
    () => LEARNING_CONTENT.templates.map(createStudioTemplateDocument),
    [],
  );
  const qa = useMemo(
    () => runStudioQa(LEARNING_CONTENT, BUNDLED_LIBRARY),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <Text style={styles.eyebrow}>INTERNAL TOOL</Text>
          <Text style={styles.title}>CrossMath Studio</Text>
          <Text style={styles.subtitle}>
            Inspect templates, curriculum structure, and content quality before release.
          </Text>
        </View>

        <View style={styles.metrics}>
          <Metric label="Templates" value={qa.summary.templateCount} />
          <Metric label="Lessons" value={qa.summary.lessonCount} />
          <Metric label="Puzzles" value={qa.summary.puzzleCount} />
          <Metric label="QA errors" value={qa.issues.filter((item) => item.severity === "error").length} />
        </View>

        <SectionTitle title="Topology library" />
        {templates.map((document) => (
          <View key={document.template.id} style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>{document.template.title}</Text>
              <Text style={styles.badge}>
                {document.template.recommendedDifficulty.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.meta}>
              {document.analysis.equationCount} equations ·{" "}
              {document.analysis.intersectionCount} intersections · depth{" "}
              {document.analysis.graphDepth}
            </Text>
            <TemplateMiniature document={document} />
            <Text style={styles.meta}>
              Complexity {document.analysis.estimatedComplexity} ·{" "}
              {Math.round(document.analysis.boardUtilization * 100)}% board utilization
            </Text>
          </View>
        ))}

        <SectionTitle title="Automated QA" />
        <View style={[styles.card, qa.valid ? styles.passCard : styles.warningCard]}>
          <Text style={styles.cardTitle}>
            {qa.valid ? "Content passed required checks" : "Content needs attention"}
          </Text>
          <Text style={styles.meta}>
            {qa.summary.nonUniquePuzzleCount} non-unique ·{" "}
            {qa.summary.invalidPuzzleCount} invalid ·{" "}
            {qa.summary.difficultyMismatchCount} difficulty warnings
          </Text>
          {qa.issues.slice(0, 8).map((item, index) => (
            <Text key={`${item.code}-${index}`} style={styles.issue}>
              {item.severity === "error" ? "●" : "○"} {item.code}: {item.message}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateMiniature({
  document,
}: {
  readonly document: ReturnType<typeof createStudioTemplateDocument>;
}) {
  const cells = new Map(
    document.preview.cells.map((cell) => [`${cell.row}:${cell.column}`, cell] as const),
  );
  return (
    <View
      accessibilityLabel={`${document.template.title} topology preview`}
      style={[
        styles.preview,
        { aspectRatio: document.preview.width / document.preview.height },
      ]}
    >
      {Array.from({ length: document.preview.height }, (_, row) => (
        <View key={row} style={styles.previewRow}>
          {Array.from({ length: document.preview.width }, (_, column) => {
            const cell = cells.get(`${row}:${column}`);
            return (
              <View
                key={column}
                style={[
                  styles.previewCell,
                  cell?.kind === "number" && styles.numberCell,
                  cell?.kind === "operator" && styles.symbolCell,
                  cell?.kind === "equals" && styles.equalsCell,
                  cell?.shared === true && styles.sharedCell,
                ]}
              >
                <Text style={styles.previewText}>
                  {cell?.kind === "operator" ? "＋" : cell?.kind === "equals" ? "=" : ""}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { readonly title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F5" },
  container: { padding: 16, paddingBottom: 36, gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "#277A84" },
  title: { marginTop: 4, fontSize: 30, fontWeight: "900", color: "#17221E" },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "#52635D" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    minWidth: 76,
    flexGrow: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DDDA",
  },
  metricValue: { fontSize: 22, fontWeight: "900", color: "#17221E" },
  metricLabel: { marginTop: 2, fontSize: 10, fontWeight: "700", color: "#64746E" },
  sectionTitle: { marginTop: 6, fontSize: 16, fontWeight: "900", color: "#17221E" },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DDDA",
    gap: 8,
  },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#17221E" },
  badge: {
    alignSelf: "flex-start",
    fontSize: 9,
    fontWeight: "900",
    color: "#1E6D7A",
    backgroundColor: "#DDF0F2",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  meta: { fontSize: 12, lineHeight: 17, color: "#64746E" },
  preview: { width: "100%", maxHeight: 220, gap: 2 },
  previewRow: { flex: 1, flexDirection: "row", gap: 2 },
  previewCell: { flex: 1, borderRadius: 3, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  numberCell: { backgroundColor: "#B8DEC9" },
  symbolCell: { backgroundColor: "#F2E7CD" },
  equalsCell: { backgroundColor: "#E8E1D5" },
  sharedCell: { borderWidth: 2, borderColor: "#277A84" },
  previewText: { fontSize: 11, fontWeight: "800", color: "#315B50" },
  passCard: { borderColor: "#80B39F", backgroundColor: "#F3FBF7" },
  warningCard: { borderColor: "#D3AA63", backgroundColor: "#FFF9EC" },
  issue: { fontSize: 11, lineHeight: 16, color: "#52635D" },
});
