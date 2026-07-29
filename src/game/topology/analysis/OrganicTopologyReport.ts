import type { BoardTopology } from "../../../types/Topology";
import {
  selectOrganicTopologyArchetype,
  type OrganicTopologyArchetype,
} from "../../board/TopologySkeletonGenerator";
import { analyzeOrganicTopology, type OrganicTopologyMetrics } from "./OrganicTopologyMetrics";
import { scoreOrganicTopology, type TopologyQualityScore } from "../scoring/TopologyQualityScore";

export interface TopologySample {
  readonly seed: number;
  readonly profile: "classic" | "organic";
  readonly difficulty?: string;
  readonly archetype?: OrganicTopologyArchetype;
  readonly topology: BoardTopology;
}

export interface TopologySampleReport {
  readonly seed: number;
  readonly profile: "classic" | "organic";
  readonly difficulty: string | null;
  readonly archetype: OrganicTopologyArchetype | null;
  readonly metrics: OrganicTopologyMetrics;
  readonly score: TopologyQualityScore;
}

export interface TopologyBatchSummary {
  readonly sampleCount: number;
  readonly averageScore: number;
  readonly minimumScore: number;
  readonly maximumScore: number;
  readonly scoreStandardDeviation: number;
  readonly uniqueMetricSignatures: number;
  readonly archetypeCounts: Readonly<Record<OrganicTopologyArchetype, number>>;
  readonly averageMiddleIntersectionRatio: number;
  readonly averageEndpointIntersectionRatio: number;
  readonly averageDensity: number;
  readonly averageEquationDegree: number;
  readonly averageAspectRatio: number;
  readonly gradeCounts: Readonly<Record<TopologyQualityScore["grade"], number>>;
}

export interface TopologyBatchReport {
  readonly samples: readonly TopologySampleReport[];
  readonly summary: TopologyBatchSummary;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function createTopologySampleReport(
  sample: TopologySample,
): TopologySampleReport {
  if (!Number.isInteger(sample.seed)) {
    throw new Error("Topology sample seed must be an integer.");
  }
  const metrics = analyzeOrganicTopology(sample.topology);
  return {
    seed: sample.seed,
    profile: sample.profile,
    difficulty: sample.difficulty?.trim() || null,
    archetype:
      sample.profile === "organic"
        ? sample.archetype ?? selectOrganicTopologyArchetype(sample.seed)
        : null,
    metrics,
    score: scoreOrganicTopology(metrics),
  };
}


function metricSignature(metrics: OrganicTopologyMetrics): string {
  const degreeSequence = metrics.connectivity
    .map((entry) => entry.degree)
    .sort((left, right) => left - right)
    .join(",");
  return [
    metrics.intersectionCount,
    round(metrics.middleIntersectionRatio),
    round(metrics.endpointIntersectionRatio),
    round(metrics.averageEquationDegree),
    round(metrics.branchingEquationRatio),
    metrics.deadEndCount,
    metrics.boundingWidth,
    metrics.boundingHeight,
    round(metrics.density),
    round(metrics.symmetry),
    degreeSequence,
  ].join("|");
}

function standardDeviation(values: readonly number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return round(Math.sqrt(variance));
}

export function createTopologyBatchReport(
  samples: readonly TopologySample[],
): TopologyBatchReport {
  if (samples.length === 0) {
    throw new Error("Topology batch requires at least one sample.");
  }

  const reports = samples
    .map(createTopologySampleReport)
    .sort(
      (left, right) =>
        left.seed - right.seed ||
        left.profile.localeCompare(right.profile) ||
        (left.difficulty ?? "").localeCompare(right.difficulty ?? ""),
    );
  const scores = reports.map((report) => report.score.total);
  const average = (values: readonly number[]) =>
    round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const gradeCounts = {
    excellent: 0,
    good: 0,
    acceptable: 0,
    weak: 0,
  } satisfies Record<TopologyQualityScore["grade"], number>;

  const archetypeCounts = {
    chain: 0,
    fork: 0,
    hub: 0,
    spread: 0,
    cluster: 0,
  } satisfies Record<OrganicTopologyArchetype, number>;

  for (const report of reports) {
    gradeCounts[report.score.grade] += 1;
    if (report.archetype !== null) archetypeCounts[report.archetype] += 1;
  }

  return {
    samples: reports,
    summary: {
      sampleCount: reports.length,
      averageScore: average(scores),
      minimumScore: Math.min(...scores),
      maximumScore: Math.max(...scores),
      scoreStandardDeviation: standardDeviation(scores),
      uniqueMetricSignatures: new Set(
        reports.map((report) => metricSignature(report.metrics)),
      ).size,
      archetypeCounts,
      averageMiddleIntersectionRatio: average(
        reports.map((report) => report.metrics.middleIntersectionRatio),
      ),
      averageEndpointIntersectionRatio: average(
        reports.map((report) => report.metrics.endpointIntersectionRatio),
      ),
      averageDensity: average(
        reports.map((report) => report.metrics.density),
      ),
      averageEquationDegree: average(
        reports.map((report) => report.metrics.averageEquationDegree),
      ),
      averageAspectRatio: average(
        reports.map((report) => report.metrics.aspectRatio),
      ),
      gradeCounts,
    },
  };
}

export function serializeTopologyBatchReport(
  report: TopologyBatchReport,
  pretty = false,
): string {
  return JSON.stringify(report, null, pretty ? 2 : undefined);
}
