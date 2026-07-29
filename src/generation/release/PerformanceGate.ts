
import type { PerformanceBudget, PerformanceReport, PerformanceSample } from "./ReleaseTypes";

function requireSamples(values: readonly number[], label: string): void {
  if (values.length === 0) throw new Error(`${label} requires at least one sample.`);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error(`${label} samples must be finite non-negative numbers.`);
  }
}

export function percentile95(values: readonly number[]): number {
  requireSamples(values, "Percentile");
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)];
}

export function evaluatePerformance(
  sample: PerformanceSample,
  budget: PerformanceBudget,
): PerformanceReport {
  requireSamples(sample.candidateGenerationMs, "Candidate generation");
  requireSamples(sample.certificationMs, "Certification");
  requireSamples(sample.replayMs, "Replay");
  if (!Number.isInteger(sample.serializedCatalogBytes) || sample.serializedCatalogBytes < 0) {
    throw new Error("Serialized catalog bytes must be a non-negative integer.");
  }
  const measurements = Object.freeze({
    candidateGenerationP95Ms: percentile95(sample.candidateGenerationMs),
    certificationP95Ms: percentile95(sample.certificationMs),
    replayP95Ms: percentile95(sample.replayMs),
    serializedCatalogBytes: sample.serializedCatalogBytes,
  });
  const failures: string[] = [];
  if (measurements.candidateGenerationP95Ms > budget.candidateGenerationP95Ms) failures.push("candidate-generation-p95");
  if (measurements.certificationP95Ms > budget.certificationP95Ms) failures.push("certification-p95");
  if (measurements.replayP95Ms > budget.replayP95Ms) failures.push("replay-p95");
  if (measurements.serializedCatalogBytes > budget.maximumSerializedCatalogBytes) failures.push("catalog-size");
  return Object.freeze({
    schemaVersion: 1 as const,
    passed: failures.length === 0,
    measurements,
    failures: Object.freeze(failures),
  });
}
