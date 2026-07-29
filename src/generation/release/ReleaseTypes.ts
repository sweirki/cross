
export type ReleaseGateStatus = "passed" | "failed" | "not-run";

export interface PerformanceBudget {
  readonly candidateGenerationP95Ms: number;
  readonly certificationP95Ms: number;
  readonly replayP95Ms: number;
  readonly maximumSerializedCatalogBytes: number;
}

export interface PerformanceSample {
  readonly candidateGenerationMs: readonly number[];
  readonly certificationMs: readonly number[];
  readonly replayMs: readonly number[];
  readonly serializedCatalogBytes: number;
}

export interface PerformanceReport {
  readonly schemaVersion: 1;
  readonly passed: boolean;
  readonly measurements: Readonly<{
    candidateGenerationP95Ms: number;
    certificationP95Ms: number;
    replayP95Ms: number;
    serializedCatalogBytes: number;
  }>;
  readonly failures: readonly string[];
}

export interface ReleaseCheck {
  readonly id: string;
  readonly status: ReleaseGateStatus;
  readonly detail: string;
}

export interface ReleaseCandidateReport {
  readonly schemaVersion: 1;
  readonly releaseId: string;
  readonly generatorVersion: string;
  readonly passed: boolean;
  readonly checks: readonly ReleaseCheck[];
  readonly fingerprint: string;
}

export interface ReleaseCandidateInput {
  readonly releaseId: string;
  readonly generatorVersion: string;
  readonly catalogValid: boolean;
  readonly campaignValid: boolean;
  readonly saveMigrationValid: boolean;
  readonly replayDeterministic: boolean;
  readonly offlineReady: boolean;
  readonly accessibilityReviewed: boolean;
  readonly privacyReviewed: boolean;
  readonly crashAuditPassed: boolean;
  readonly androidBuildStatus: ReleaseGateStatus;
  readonly iosBuildStatus: ReleaseGateStatus;
  readonly performance: PerformanceReport;
}
