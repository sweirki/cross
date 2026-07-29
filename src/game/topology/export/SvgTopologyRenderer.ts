import type { BoardTopology, TopologyNode } from "../../../types/Topology";

export interface SvgRenderOptions {
  readonly cellSize?: number;
  readonly padding?: number;
  readonly numberLabel?: (node: Extract<TopologyNode, { kind: "number" }>) => string;
}

const OPERATOR_SYMBOLS = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
} as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function labelFor(
  node: TopologyNode,
  options: SvgRenderOptions,
): string {
  if (node.kind === "number") return options.numberLabel?.(node) ?? "?";
  if (node.kind === "equals") return "=";
  return OPERATOR_SYMBOLS[node.operator];
}

/** Produces deterministic standalone SVG suitable for QA snapshots. */
export function renderTopologySvg(
  topology: BoardTopology,
  options: SvgRenderOptions = {},
): string {
  const cellSize = options.cellSize ?? 48;
  const padding = options.padding ?? 12;
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new Error("SVG cell size must be positive.");
  }
  if (!Number.isFinite(padding) || padding < 0) {
    throw new Error("SVG padding cannot be negative.");
  }

  if (topology.nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" viewBox="0 0 0 0"></svg>`;
  }

  const minRow = Math.min(...topology.nodes.map((node) => node.position.row));
  const maxRow = Math.max(...topology.nodes.map((node) => node.position.row));
  const minColumn = Math.min(...topology.nodes.map((node) => node.position.column));
  const maxColumn = Math.max(...topology.nodes.map((node) => node.position.column));
  const columns = maxColumn - minColumn + 1;
  const rows = maxRow - minRow + 1;
  const width = columns * cellSize + padding * 2;
  const height = rows * cellSize + padding * 2;

  const elements = [...topology.nodes]
    .sort(
      (left, right) =>
        left.position.row - right.position.row ||
        left.position.column - right.position.column ||
        left.id.localeCompare(right.id),
    )
    .map((node) => {
      const x = padding + (node.position.column - minColumn) * cellSize;
      const y = padding + (node.position.row - minRow) * cellSize;
      const centerX = x + cellSize / 2;
      const centerY = y + cellSize / 2;
      const label = escapeXml(labelFor(node, options));
      if (node.kind === "number") {
        return `<g data-node="${escapeXml(node.id)}"><rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${Math.round(cellSize * 0.16)}" fill="white" stroke="currentColor"/><text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="${Math.round(cellSize * 0.42)}">${label}</text></g>`;
      }
      return `<text data-node="${escapeXml(node.id)}" x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="${Math.round(cellSize * 0.42)}">${label}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="CrossMath topology preview">${elements}</svg>`;
}
