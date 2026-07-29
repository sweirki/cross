import type { CompositionPlan } from "../contracts/GenerationContracts";

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function calculateCompositionMetrics(
  rows: number,
  columns: number,
  occupied: CompositionPlan["occupiedCells"],
  clusters: CompositionPlan["clusters"],
): Readonly<Record<string, number>> {
  const area = Math.max(1, rows * columns);
  const occupiedCount = occupied.length;
  const density = occupiedCount / area;
  const centerRow = (rows - 1) / 2;
  const centerCol = (columns - 1) / 2;
  const meanRow = occupiedCount === 0 ? centerRow :
    occupied.reduce((sum, cell) => sum + cell.position.row, 0) / occupiedCount;
  const meanCol = occupiedCount === 0 ? centerCol :
    occupied.reduce((sum, cell) => sum + cell.position.col, 0) / occupiedCount;
  const centerOffset = Math.hypot(meanRow - centerRow, meanCol - centerCol) /
    Math.max(1, Math.hypot(centerRow, centerCol));

  const mirroredHorizontal = new Set(
    occupied.map((cell) => `${cell.position.row}:${columns - 1 - cell.position.col}`),
  );
  const mirroredVertical = new Set(
    occupied.map((cell) => `${rows - 1 - cell.position.row}:${cell.position.col}`),
  );
  const positionSet = new Set(occupied.map((cell) => `${cell.position.row}:${cell.position.col}`));
  const horizontalSymmetry = occupiedCount === 0 ? 1 :
    [...mirroredHorizontal].filter((key) => positionSet.has(key)).length / occupiedCount;
  const verticalSymmetry = occupiedCount === 0 ? 1 :
    [...mirroredVertical].filter((key) => positionSet.has(key)).length / occupiedCount;

  const quadrants = [0, 0, 0, 0];
  for (const cell of occupied) {
    const index = (cell.position.row > centerRow ? 2 : 0) + (cell.position.col > centerCol ? 1 : 0);
    quadrants[index] += 1;
  }
  const expected = occupiedCount / 4;
  const quadrantImbalance = expected === 0 ? 0 :
    quadrants.reduce((sum, count) => sum + Math.abs(count - expected), 0) / (2 * occupiedCount);

  const compactness = occupiedCount / Math.max(1, rows * columns);
  const aspectRatio = Math.max(rows, columns) / Math.max(1, Math.min(rows, columns));
  const whitespace = 1 - density;

  return Object.freeze({
    rows,
    columns,
    area,
    occupiedCellCount: occupiedCount,
    clusterCount: clusters.length,
    density: round(density),
    whitespace: round(whitespace),
    compactness: round(compactness),
    aspectRatio: round(aspectRatio),
    centerOffset: round(centerOffset),
    horizontalSymmetry: round(horizontalSymmetry),
    verticalSymmetry: round(verticalSymmetry),
    quadrantImbalance: round(quadrantImbalance),
    visualBalance: round(Math.max(0, 1 - centerOffset * 0.6 - quadrantImbalance * 0.4)),
  });
}
