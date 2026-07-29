import type { BoardTopology, TopologyNode } from "../../../types/Topology";

export interface AsciiRenderOptions {
  readonly empty?: string;
  readonly number?: string;
  readonly horizontalGap?: string;
  readonly trim?: boolean;
  readonly numberLabel?: (node: Extract<TopologyNode, { kind: "number" }>) => string;
}

const OPERATOR_SYMBOLS = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
} as const;

function tokenFor(
  node: TopologyNode,
  options: AsciiRenderOptions,
): string {
  if (node.kind === "number") {
    return options.numberLabel?.(node) ?? options.number ?? "□";
  }
  if (node.kind === "equals") return "=";
  return OPERATOR_SYMBOLS[node.operator];
}

/** Renders a stable, compact text preview of the topology's occupied bounds. */
export function renderTopologyAscii(
  topology: BoardTopology,
  options: AsciiRenderOptions = {},
): string {
  if (topology.nodes.length === 0) return "";

  const minRow = Math.min(...topology.nodes.map((node) => node.position.row));
  const maxRow = Math.max(...topology.nodes.map((node) => node.position.row));
  const minColumn = Math.min(...topology.nodes.map((node) => node.position.column));
  const maxColumn = Math.max(...topology.nodes.map((node) => node.position.column));
  const empty = options.empty ?? " ";
  const gap = options.horizontalGap ?? " ";
  const tokens = new Map(
    topology.nodes.map((node) => [
      `${node.position.row}:${node.position.column}`,
      tokenFor(node, options),
    ]),
  );
  const width = Math.max(
    1,
    ...[...tokens.values()].map((token) => [...token].length),
  );

  const lines: string[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    const cells: string[] = [];
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const token = tokens.get(`${row}:${column}`) ?? empty;
      cells.push(token.padStart(width, empty));
    }
    const line = cells.join(gap);
    lines.push(options.trim === false ? line : line.trimEnd());
  }

  if (options.trim === false) return lines.join("\n");
  while (lines.length > 0 && lines[0]!.trim().length === 0) lines.shift();
  while (lines.length > 0 && lines.at(-1)!.trim().length === 0) lines.pop();
  return lines.join("\n");
}
