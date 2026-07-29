import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveVisualPalette } from "../ui/visual-refresh";
import { useTheme, type ContrastMode, type ThemeMode } from "../ui/theme";

export function SettingsScreen() {
  const router = useRouter();
  const { theme, preferences, updatePreferences } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.canvas }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Header title="Settings" onBack={() => router.back()} palette={palette} />

        <Section title="Appearance" palette={palette}>
          <Text style={[styles.label, { color: palette.textMuted }]}>Theme</Text>
          <ChoiceRow
            values={["system", "light", "dark"] as const}
            selected={preferences.mode}
            onSelect={(mode: ThemeMode) => void updatePreferences({ mode })}
            palette={palette}
          />
          <Text style={[styles.label, { color: palette.textMuted }]}>Contrast</Text>
          <ChoiceRow
            values={["standard", "high"] as const}
            selected={preferences.contrast}
            onSelect={(contrast: ContrastMode) => void updatePreferences({ contrast })}
            palette={palette}
          />
        </Section>

        <Section title="Layout" palette={palette}>
          <Pressable
            onPress={() => void updatePreferences({ responsiveType: !preferences.responsiveType })}
            style={styles.toggleRow}
          >
            <View style={styles.toggleCopy}>
              <Text style={[styles.rowTitle, { color: palette.textStrong }]}>Responsive text</Text>
              <Text style={[styles.rowBody, { color: palette.textMuted }]}>Scale typography for the current device.</Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: preferences.responsiveType ? palette.accent : palette.boardBorder }]}>
              <View style={[styles.toggleThumb, preferences.responsiveType && styles.toggleThumbOn]} />
            </View>
          </Pressable>
        </Section>

        <Text style={[styles.note, { color: palette.textMuted }]}>
          Motion, sound, haptics, and accessibility preferences remain managed by their existing providers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack, palette }: { readonly title: string; readonly onBack: () => void; readonly palette: ReturnType<typeof resolveVisualPalette> }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={[styles.back, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
        <Text style={[styles.backText, { color: palette.textStrong }]}>‹</Text>
      </Pressable>
      <Text style={[styles.title, { color: palette.textStrong }]}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

function Section({ title, palette, children }: { readonly title: string; readonly palette: ReturnType<typeof resolveVisualPalette>; readonly children: ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: palette.board, borderColor: palette.boardBorder }]}>
      <Text style={[styles.sectionTitle, { color: palette.textStrong }]}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceRow<T extends string>({
  values,
  selected,
  onSelect,
  palette,
}: {
  readonly values: readonly T[];
  readonly selected: T;
  readonly onSelect: (value: T) => void;
  readonly palette: ReturnType<typeof resolveVisualPalette>;
}) {
  return (
    <View style={styles.choiceRow}>
      {values.map(value => {
        const active = value === selected;
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[
              styles.choice,
              {
                backgroundColor: active ? palette.accent : palette.canvas,
                borderColor: active ? palette.accent : palette.boardBorder,
              },
            ]}
          >
            <Text style={[styles.choiceText, { color: active ? "#FFFFFF" : palette.textStrong }]}>
              {value[0]!.toUpperCase() + value.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center", padding: 20, paddingBottom: 40, gap: 16 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 30, lineHeight: 31 },
  title: { fontSize: 25, fontWeight: "900" },
  section: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, justifyContent: "center" },
  choiceText: { fontSize: 13, fontWeight: "800" },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  toggleCopy: { flex: 1, paddingRight: 14 },
  rowTitle: { fontSize: 15, fontWeight: "900" },
  rowBody: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  toggle: { width: 50, height: 30, borderRadius: 15, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF" },
  toggleThumbOn: { alignSelf: "flex-end" },
  note: { paddingHorizontal: 6, fontSize: 12, lineHeight: 18, textAlign: "center" },
});
