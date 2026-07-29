import type { CellVisualKind, TileVisualState, VisualRefreshPalette } from "./types";

export interface TileVisualRecipe {
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly opacity: number;
  readonly scale: number;
  readonly elevation: number;
}

export function resolveTileVisual(
  palette: VisualRefreshPalette,
  kind: CellVisualKind,
  state: TileVisualState,
): TileVisualRecipe {
  let backgroundColor =
    kind === "operator" ? palette.tileOperator :
    kind === "result" ? palette.tileResult :
    palette.tileNumber;
  let borderColor = palette.boardBorder;
  let borderWidth = 1;
  let opacity = 1;
  let scale = 1;
  let elevation = 1;

  if (state === "given") backgroundColor = palette.tileGiven;
  if (state === "empty") backgroundColor = palette.tileEmpty;
  if (state === "selected") {
    backgroundColor = palette.tileSelected;
    borderColor = palette.accent;
    borderWidth = 2;
    scale = 1.06;
    elevation = 4;
  }
  if (state === "correct") {
    backgroundColor = palette.tileCorrect;
    borderColor = palette.accent;
  }
  if (state === "incorrect") {
    backgroundColor = palette.tileIncorrect;
    borderColor = "#B94E48";
    borderWidth = 2;
  }
  if (state === "used") {
    opacity = 0.18;
    elevation = 0;
  }

  return Object.freeze({ backgroundColor, borderColor, borderWidth, opacity, scale, elevation });
}

export const visualMotion = Object.freeze({
  pressScale: 0.96,
  selectionScale: 1.06,
  snapDurationMs: 160,
  solvedPulseDurationMs: 280,
  scoreDurationMs: 220,
});
