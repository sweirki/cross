import type {
  DeductionStep,
  DeductionTrace,
  GenerationRequest,
  PuzzleCandidate,
} from "../contracts/GenerationContracts";
import type {
  CandidateSearchCheckpoint,
  CandidateSearchOptions,
  CandidateSearchResult,
  GenerationManifest,
  RankedCandidateRecord,
} from "../industrial/IndustrialTypes";
import type { QualityScorecard } from "../certification/CertificationTypes";

export type StudioPanelId =
  | "summary"
  | "composition"
  | "dependency"
  | "arithmetic"
  | "clues"
  | "deduction"
  | "quality"
  | "provenance";

export interface StudioCandidateSummary {
  readonly index: number;
  readonly id?: string;
  readonly disposition: RankedCandidateRecord["disposition"];
  readonly rank?: number;
  readonly overallScore?: number;
  readonly noveltyScore?: number;
  readonly certified: boolean;
  readonly rejectionReason?: string;
}

export interface StudioArithmeticEquation {
  readonly id: string;
  readonly left: number;
  readonly operator: string;
  readonly right: number;
  readonly result: number;
  readonly cellIds: readonly [string, string, string];
}

export interface StudioInspection {
  readonly summary: StudioCandidateSummary;
  readonly candidate?: PuzzleCandidate;
  readonly compositionAscii?: string;
  readonly dependencyText?: string;
  readonly equations: readonly StudioArithmeticEquation[];
  readonly givenCells: readonly { readonly id: string; readonly value: number }[];
  readonly hiddenCells: readonly { readonly id: string; readonly value: number }[];
  readonly deductionTrace?: DeductionTrace;
  readonly deductionSteps: readonly DeductionStep[];
  readonly scorecard?: QualityScorecard;
  readonly failures: RankedCandidateRecord["failures"];
  readonly provenance?: PuzzleCandidate["dna"];
}

export interface StudioComparisonMetric {
  readonly metric: string;
  readonly left?: number | string;
  readonly right?: number | string;
  readonly delta?: number;
}

export interface StudioComparison {
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly preferredIndex?: number;
  readonly metrics: readonly StudioComparisonMetric[];
}

export interface StudioSearchSession {
  readonly request: GenerationRequest;
  readonly options: Required<CandidateSearchOptions>;
  readonly result: CandidateSearchResult;
  readonly summaries: readonly StudioCandidateSummary[];
}

export interface StudioExport {
  readonly fileName: string;
  readonly mediaType: "application/json" | "image/svg+xml" | "text/plain";
  readonly content: string;
}

export interface PuzzleStudioV2Contract {
  runSearch(
    request: GenerationRequest,
    options?: CandidateSearchOptions,
    checkpoint?: CandidateSearchCheckpoint,
  ): StudioSearchSession;
  inspect(manifest: GenerationManifest, candidateIndex: number): StudioInspection;
  replay(request: GenerationRequest, candidateIndex: number): StudioInspection;
  compare(manifest: GenerationManifest, leftIndex: number, rightIndex: number): StudioComparison;
  exportCandidate(inspection: StudioInspection, format: "json" | "svg" | "text"): StudioExport;
}
