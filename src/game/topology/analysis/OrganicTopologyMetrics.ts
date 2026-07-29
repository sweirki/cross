import type { BoardTopology, EquationId, GridPosition } from "../../../types/Topology";
import { analyzeTopologyShape } from "../../board";

export interface EquationConnectivity {
  readonly equationId: EquationId;
  readonly degree: number;
  readonly deadEnd: boolean;
  readonly branching: boolean;
}

export interface OrganicTopologyMetrics {
  readonly equationCount: number;
  readonly intersectionCount: number;
  readonly middleIntersectionRatio: number;
  readonly endpointIntersectionRatio: number;
  readonly averageEquationDegree: number;
  readonly branchingEquationRatio: number;
  readonly deadEndCount: number;
  readonly deadEndRatio: number;
  readonly boundingWidth: number;
  readonly boundingHeight: number;
  readonly aspectRatio: number;
  readonly occupiedCellCount: number;
  readonly density: number;
  readonly horizontalSymmetry: number;
  readonly verticalSymmetry: number;
  readonly symmetry: number;
  readonly irregularity: number;
  readonly connectivity: readonly EquationConnectivity[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function coordinateKey(position: GridPosition): string {
  return `${position.row}:${position.column}`;
}

function symmetryRatio(
  positions: readonly GridPosition[],
  axis: "horizontal" | "vertical",
): number {
  if (positions.length === 0) return 1;

  const rows = positions.map((position) => position.row);
  const columns = positions.map((position) => position.column);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minColumn = Math.min(...columns);
  const maxColumn = Math.max(...columns);
  const occupied = new Set(positions.map(coordinateKey));

  let matches = 0;
  for (const position of positions) {
    const reflected =
      axis === "horizontal"
        ? { row: maxRow - (position.row - minRow), column: position.column }
        : { row: position.row, column: maxColumn - (position.column - minColumn) };
    if (occupied.has(coordinateKey(reflected))) matches += 1;
  }

  return clamp01(matches / positions.length);
}

/**
 * Derives deterministic layout-quality metrics from canonical topology data.
 * No generation state, arithmetic values, or runtime state is required.
 */
export function analyzeOrganicTopology(
  topology: BoardTopology,
): OrganicTopologyMetrics {
  const shape = analyzeTopologyShape(topology);
  const degreeByEquation = new Map<EquationId, number>(
    topology.equations.map((equation) => [equation.id, 0]),
  );

  for (const intersection of shape.intersections) {
    for (const equationId of intersection.equationIds) {
      degreeByEquation.set(
        equationId,
        (degreeByEquation.get(equationId) ?? 0) + 1,
      );
    }
  }

  const connectivity = [...degreeByEquation.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([equationId, degree]) => ({
      equationId,
      degree,
      deadEnd: degree <= 1,
      branching: degree >= 2,
    }));

  const deadEndCount = connectivity.filter((entry) => entry.deadEnd).length;
  const middleIntersectionRatio =
    shape.intersectionCount === 0
      ? 0
      : shape.middleIntersectionCount / shape.intersectionCount;
  const endpointIntersectionRatio =
    shape.intersectionCount === 0
      ? 0
      : shape.endpointOnlyIntersectionCount / shape.intersectionCount;
  const averageEquationDegree =
    shape.equationCount === 0
      ? 0
      : connectivity.reduce((sum, entry) => sum + entry.degree, 0) /
        shape.equationCount;
  const horizontalSymmetry = symmetryRatio(
    topology.nodes.map((node) => node.position),
    "horizontal",
  );
  const verticalSymmetry = symmetryRatio(
    topology.nodes.map((node) => node.position),
    "vertical",
  );
  const symmetry = Math.max(horizontalSymmetry, verticalSymmetry);

  return {
    equationCount: shape.equationCount,
    intersectionCount: shape.intersectionCount,
    middleIntersectionRatio,
    endpointIntersectionRatio,
    averageEquationDegree,
    branchingEquationRatio:
      shape.equationCount === 0
        ? 0
        : shape.branchingEquationCount / shape.equationCount,
    deadEndCount,
    deadEndRatio:
      shape.equationCount === 0 ? 0 : deadEndCount / shape.equationCount,
    boundingWidth: shape.boundingWidth,
    boundingHeight: shape.boundingHeight,
    aspectRatio:
      shape.boundingWidth === 0 || shape.boundingHeight === 0
        ? 0
        : Math.max(shape.boundingWidth, shape.boundingHeight) /
          Math.min(shape.boundingWidth, shape.boundingHeight),
    occupiedCellCount: shape.occupiedCellCount,
    density: shape.boundingDensity,
    horizontalSymmetry,
    verticalSymmetry,
    symmetry,
    irregularity: 1 - symmetry,
    connectivity,
  };
}

export function serializeOrganicTopologyMetrics(
  metrics: OrganicTopologyMetrics,
): string {
  return JSON.stringify(metrics);
}
