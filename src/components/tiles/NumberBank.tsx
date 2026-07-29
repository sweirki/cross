import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { NumberBankTile } from "../../types/Puzzle";
import { GameplayAnimatedView, type GameplayMotionCue } from "../../ui/motion";
import { resolveBoardLayout, resolveTileVisual, resolveVisualPalette } from "../../ui/visual-refresh";
import { useTheme } from "../../ui/theme";

interface NumberBankProps {
  readonly tiles: readonly NumberBankTile[];
  readonly availableTileIds: readonly string[];
  readonly selectedTileId: string | null;
  readonly onSelect: (tileId: string) => void;
  readonly motionCue?: GameplayMotionCue | null;
}

export function NumberBank({
  tiles,
  availableTileIds,
  selectedTileId,
  onSelect,
  motionCue = null,
}: NumberBankProps) {
  const available = new Set(availableTileIds);
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");
  const layout = resolveBoardLayout(width);

  return (
    <GameplayAnimatedView
      cue={motionCue}
      style={[
        styles.panel,
        {
          backgroundColor: palette.tray,
          borderColor: palette.boardBorder,
          shadowColor: palette.shadow,
        },
      ]}
      testID="number-bank-motion"
    >
      <View accessibilityLabel="Number tray">
        <Text style={[styles.label, { color: palette.textMuted }]}>NUMBER TRAY</Text>
        <View style={[styles.container, { gap: layout.trayGap }]}>
          {tiles.map(tile => {
            const enabled = available.has(tile.id);
            const selected = selectedTileId === tile.id;
            const state = !enabled ? "used" : selected ? "selected" : "idle";
            const recipe = resolveTileVisual(palette, "number", state);

            return (
              <Pressable
                accessibilityLabel={`Number ${tile.value}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled, selected }}
                disabled={!enabled}
                key={tile.id}
                onPress={() => onSelect(tile.id)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    minHeight: layout.trayTileHeight,
                    backgroundColor: recipe.backgroundColor,
                    borderColor: recipe.borderColor,
                    borderWidth: recipe.borderWidth,
                    opacity: recipe.opacity,
                    elevation: recipe.elevation,
                    shadowColor: palette.shadow,
                    transform: [{ scale: pressed && enabled ? 0.96 : recipe.scale }],
                  },
                ]}
              >
                <Text style={[styles.value, { color: palette.textStrong }]}>{tile.value}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GameplayAnimatedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: "stretch",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: "center",
  },
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tile: {
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  value: { fontSize: 17, fontWeight: "900" },
});
