import type { BoardTopology } from "../../../types/Topology";
import type { OrganicTopologyMetrics } from "../analysis/OrganicTopologyMetrics";
import type { TopologyQualityScore } from "../scoring/TopologyQualityScore";

export interface TopologyQualityExport {
  readonly schema: "crossmath.topology-quality/v1";
  readonly topology: BoardTopology;
  readonly metrics: OrganicTopologyMetrics;
  readonly score: TopologyQualityScore;
}

export function exportTopologyQualityJson(
  value: TopologyQualityExport,
  pretty = false,
): string {
  if (value.schema !== "crossmath.topology-quality/v1") {
    throw new Error("Unsupported topology quality export schema.");
  }
  return JSON.stringify(
    {
      schema: value.schema,
      topology: value.topology,
      metrics: value.metrics,
      score: value.score,
    },
    null,
    pretty ? 2 : undefined,
  );
}
