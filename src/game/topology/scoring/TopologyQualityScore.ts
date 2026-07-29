import type { OrganicTopologyMetrics } from "../analysis/OrganicTopologyMetrics";

export interface TopologyQualityComponents {
  readonly middleCrossings: number;
  readonly branching: number;
  readonly density: number;
  readonly boundingShape: number;
  readonly asymmetry: number;
  readonly deadEndBalance: number;
}

export interface TopologyQualityScore {
  readonly total: number;
  readonly grade: "excellent" | "good" | "acceptable" | "weak";
  readonly components: TopologyQualityComponents;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rangeScore(
  value: number,
  idealMinimum: number,
  idealMaximum: number,
  hardMinimum: number,
  hardMaximum: number,
): number {
  if (value >= idealMinimum && value <= idealMaximum) return 1;
  if (value < idealMinimum) {
    return clamp((value - hardMinimum) / (idealMinimum - hardMinimum));
  }
  return clamp((hardMaximum - value) / (hardMaximum - idealMaximum));
}

export function scoreOrganicTopology(
  metrics: OrganicTopologyMetrics,
): TopologyQualityScore {
  const middleCrossings = 30 * metrics.middleIntersectionRatio;
  const branching =
    20 * rangeScore(metrics.averageEquationDegree, 1.6, 2.5, 0.8, 3.5);
  const density =
    15 * rangeScore(metrics.density, 0.22, 0.58, 0.08, 0.85);
  const boundingShape =
    15 * rangeScore(metrics.aspectRatio, 1.2, 2.2, 1, 3.5);
  const asymmetry = 10 * metrics.irregularity;
  const deadEndBalance =
    10 * rangeScore(metrics.deadEndRatio, 0.2, 0.55, 0, 0.9);

  const components: TopologyQualityComponents = {
    middleCrossings: round(middleCrossings),
    branching: round(branching),
    density: round(density),
    boundingShape: round(boundingShape),
    asymmetry: round(asymmetry),
    deadEndBalance: round(deadEndBalance),
  };
  const total = round(
    Object.values(components).reduce((sum, component) => sum + component, 0),
  );

  return {
    total,
    grade:
      total >= 85
        ? "excellent"
        : total >= 70
          ? "good"
          : total >= 55
            ? "acceptable"
            : "weak",
    components,
  };
}

export function serializeTopologyQualityScore(
  score: TopologyQualityScore,
): string {
  return JSON.stringify(score);
}
