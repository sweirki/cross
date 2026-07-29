export interface TopologyQualityThresholds {
  readonly minimumScore: number;
  readonly minimumMiddleIntersectionRatio: number;
  readonly maximumEndpointIntersectionRatio: number;
  readonly minimumDensity: number;
  readonly maximumDensity: number;
}

export type TopologyQualityProfileName = "exploratory" | "production";

export const TOPOLOGY_QUALITY_PROFILES: Readonly<
  Record<TopologyQualityProfileName, TopologyQualityThresholds>
> = Object.freeze({
  exploratory: Object.freeze({
    minimumScore: 50,
    minimumMiddleIntersectionRatio: 0.6,
    maximumEndpointIntersectionRatio: 0.4,
    minimumDensity: 0.12,
    maximumDensity: 0.8,
  }),
  production: Object.freeze({
    minimumScore: 65,
    minimumMiddleIntersectionRatio: 0.75,
    maximumEndpointIntersectionRatio: 0.25,
    minimumDensity: 0.18,
    maximumDensity: 0.68,
  }),
});

export interface TopologyQualityGateInput {
  readonly score: number;
  readonly middleIntersectionRatio: number;
  readonly endpointIntersectionRatio: number;
  readonly density: number;
}

export interface TopologyQualityGateResult {
  readonly accepted: boolean;
  readonly failures: readonly string[];
}

export function evaluateTopologyQualityGate(
  input: TopologyQualityGateInput,
  profile: TopologyQualityProfileName = "production",
): TopologyQualityGateResult {
  const thresholds = TOPOLOGY_QUALITY_PROFILES[profile];
  const failures: string[] = [];
  if (input.score < thresholds.minimumScore) failures.push("score");
  if (
    input.middleIntersectionRatio <
    thresholds.minimumMiddleIntersectionRatio
  ) {
    failures.push("middleIntersectionRatio");
  }
  if (
    input.endpointIntersectionRatio >
    thresholds.maximumEndpointIntersectionRatio
  ) {
    failures.push("endpointIntersectionRatio");
  }
  if (
    input.density < thresholds.minimumDensity ||
    input.density > thresholds.maximumDensity
  ) {
    failures.push("density");
  }
  return { accepted: failures.length === 0, failures };
}
