import type { BoardLayoutSpec, VisualBreakpoint } from "./types";

export function resolveVisualBreakpoint(width: number): VisualBreakpoint {
  if (!Number.isFinite(width) || width <= 0) throw new Error("Viewport width must be a positive finite number.");
  if (width < 600) return "phone";
  if (width < 1000) return "tablet";
  return "wide";
}

export function resolveBoardLayout(width: number): BoardLayoutSpec {
  const breakpoint = resolveVisualBreakpoint(width);
  if (breakpoint === "phone") {
    return Object.freeze({
      breakpoint, pagePadding: 12, boardPadding: 10, boardRadius: 18,
      cellGap: 3, minCellSize: 28, maxCellSize: 44,
      trayGap: 7, trayTileHeight: 42, hudCompact: true,
    });
  }
  if (breakpoint === "tablet") {
    return Object.freeze({
      breakpoint, pagePadding: 24, boardPadding: 18, boardRadius: 22,
      cellGap: 4, minCellSize: 34, maxCellSize: 54,
      trayGap: 9, trayTileHeight: 48, hudCompact: false,
    });
  }
  return Object.freeze({
    breakpoint, pagePadding: 32, boardPadding: 22, boardRadius: 24,
    cellGap: 5, minCellSize: 38, maxCellSize: 58,
    trayGap: 10, trayTileHeight: 52, hudCompact: false,
  });
}

export function fitBoardCellSize(
  viewportWidth: number,
  viewportHeight: number,
  columns: number,
  rows: number,
): number {
  if (!Number.isInteger(columns) || columns <= 0 || !Number.isInteger(rows) || rows <= 0) {
    throw new Error("Board dimensions must be positive integers.");
  }
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Viewport height must be a positive finite number.");
  }
  const layout = resolveBoardLayout(viewportWidth);
  const usableWidth = viewportWidth - layout.pagePadding * 2 - layout.boardPadding * 2;
  const usableHeight = viewportHeight * 0.52 - layout.boardPadding * 2;
  const byWidth = (usableWidth - layout.cellGap * (columns - 1)) / columns;
  const byHeight = (usableHeight - layout.cellGap * (rows - 1)) / rows;
  return Math.max(layout.minCellSize, Math.min(layout.maxCellSize, byWidth, byHeight));
}
