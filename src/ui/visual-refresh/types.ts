export type VisualBreakpoint = "phone" | "tablet" | "wide";
export type TileVisualState = "idle" | "selected" | "given" | "empty" | "correct" | "incorrect" | "used";
export type CellVisualKind = "number" | "operator" | "result";

export interface VisualRefreshPalette {
  readonly canvas: string;
  readonly board: string;
  readonly boardBorder: string;
  readonly tileNumber: string;
  readonly tileOperator: string;
  readonly tileResult: string;
  readonly tileEmpty: string;
  readonly tileGiven: string;
  readonly tileSelected: string;
  readonly tileCorrect: string;
  readonly tileIncorrect: string;
  readonly textStrong: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly tray: string;
  readonly hud: string;
  readonly shadow: string;
}

export interface BoardLayoutSpec {
  readonly breakpoint: VisualBreakpoint;
  readonly pagePadding: number;
  readonly boardPadding: number;
  readonly boardRadius: number;
  readonly cellGap: number;
  readonly minCellSize: number;
  readonly maxCellSize: number;
  readonly trayGap: number;
  readonly trayTileHeight: number;
  readonly hudCompact: boolean;
}
