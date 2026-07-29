import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { EquationState, GameView } from "../../types/Game";
import { GameplayAnimatedView, type GameplayMotionCue } from "../../ui/motion";
import { fitBoardCellSize, resolveBoardLayout, resolveTileVisual, resolveVisualPalette } from "../../ui/visual-refresh";
import { useTheme } from "../../ui/theme";

interface PuzzleBoardProps {
  readonly view: GameView;
  readonly selectedTileId: string | null;
  readonly onCellPress: (cellId: string) => void;
  readonly motionCue?: GameplayMotionCue | null;
}

function feedbackForCells(view: GameView): Map<string, EquationState> {
  const priority: Record<EquationState, number> = {
    incomplete: 0,
    correct: 1,
    incorrect: 2,
  };
  const result = new Map<string, EquationState>();
  for (const feedback of view.equations) {
    const equation = view.puzzle.equations.find(candidate => candidate.id === feedback.equationId);
    if (equation === undefined) continue;
    for (const cellId of equation.cellIds) {
      const current = result.get(cellId);
      if (current === undefined || priority[feedback.state] > priority[current]) {
        result.set(cellId, feedback.state);
      }
    }
  }
  return result;
}

export function PuzzleBoard({
  view,
  selectedTileId,
  onCellPress,
  motionCue = null,
}: PuzzleBoardProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { theme } = useTheme();
  const palette = resolveVisualPalette(theme.mode, theme.contrast === "high");
  const layout = resolveBoardLayout(viewportWidth);
  const cellSize = fitBoardCellSize(
    viewportWidth,
    viewportHeight,
    view.puzzle.width,
    view.puzzle.height,
  );

  const runtimeById = new Map(view.cells.map(cell => [cell.cellId, cell]));
  const cellByPosition = new Map(
    view.puzzle.cells.map(cell => [`${cell.position.row}:${cell.position.col}`, cell]),
  );
  const feedbackByCell = feedbackForCells(view);

  return (
    <GameplayAnimatedView
      cue={motionCue}
      style={[
        styles.frame,
        {
          padding: layout.boardPadding,
          borderRadius: layout.boardRadius,
          backgroundColor: palette.board,
          borderColor: palette.boardBorder,
          shadowColor: palette.shadow,
        },
      ]}
      testID="gameplay-board-motion"
    >
      <View accessibilityLabel="CrossMath equation board">
        <View style={[styles.board, { gap: layout.cellGap }]}>
          {Array.from({ length: view.puzzle.height }, (_, row) => (
            <View key={row} style={[styles.row, { gap: layout.cellGap }]}>
              {Array.from({ length: view.puzzle.width }, (_, col) => {
                const cell = cellByPosition.get(`${row}:${col}`);
                const dimensions = { width: cellSize, height: cellSize };
                if (cell === undefined) return <View key={col} style={dimensions} />;

                const feedback = feedbackByCell.get(cell.id);
                if (cell.kind === "number") {
                  const runtime = runtimeById.get(cell.id);
                  const hasTile = runtime?.source === "tile";
                  const isEmpty = runtime?.value === null;
                  const state =
                    feedback === "incorrect" ? "incorrect" :
                    feedback === "correct" ? "correct" :
                    isEmpty ? "empty" :
                    cell.given ? "given" :
                    "idle";
                  const recipe = resolveTileVisual(palette, "number", state);

                  return (
                    <Pressable
                      accessibilityHint={
                        hasTile && selectedTileId === null
                          ? "Removes this number"
                          : "Places the selected number"
                      }
                      accessibilityLabel={`Number cell row ${row + 1}, column ${col + 1}`}
                      accessibilityRole="button"
                      disabled={!cell.editable || (!hasTile && selectedTileId === null)}
                      key={cell.id}
                      onPress={() => onCellPress(cell.id)}
                      style={({ pressed }) => [
                        styles.numberCell,
                        dimensions,
                        {
                          backgroundColor: recipe.backgroundColor,
                          borderColor: recipe.borderColor,
                          borderWidth: recipe.borderWidth,
                          opacity: recipe.opacity,
                          elevation: recipe.elevation,
                          shadowColor: palette.shadow,
                          transform: [{ scale: pressed ? 0.96 : recipe.scale }],
                        },
                      ]}
                    >
                      <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={[
                          styles.number,
                          { fontSize: cellSize * 0.38, color: palette.textStrong },
                        ]}
                      >
                        {runtime?.value ?? ""}
                      </Text>
                    </Pressable>
                  );
                }

                const kind = cell.kind === "operator" ? "operator" : "result";
                const state =
                  feedback === "incorrect" ? "incorrect" :
                  feedback === "correct" ? "correct" :
                  "idle";
                const recipe = resolveTileVisual(palette, kind, state);
                return (
                  <View
                    key={cell.id}
                    style={[
                      styles.symbolCell,
                      dimensions,
                      {
                        backgroundColor: recipe.backgroundColor,
                        borderColor: recipe.borderColor,
                        borderWidth: recipe.borderWidth,
                      },
                    ]}
                  >
                    <Text style={[styles.symbol, { fontSize: cellSize * 0.34, color: palette.textStrong }]}>
                      {cell.kind === "operator" ? cell.operator : "="}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </GameplayAnimatedView>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  board: { alignItems: "center" },
  row: { flexDirection: "row" },
  numberCell: {
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  symbolCell: {
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  number: { fontWeight: "900", maxWidth: "90%" },
  symbol: { fontWeight: "800" },
});
