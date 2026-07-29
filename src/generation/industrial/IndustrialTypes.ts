import type {
  CandidateCertificate,
  DeductionTrace,
  GenerationRequest,
  PuzzleCandidate,
  PuzzleDNA,
  VersionedGenerationContract,
} from "../contracts/GenerationContracts";
import type { EquationFillingDiagnostics } from "../filling/FillingTypes";
import type { CertificationFailure, QualityScorecard } from "../certification/CertificationTypes";

export interface CandidateSearchOptions {
  readonly poolSize?: number;
  readonly acceptanceLimit?: number;
  readonly maximumPerComposition?: number;
  readonly maximumPerDependency?: number;
}

export interface CandidateGenerationRecord {
  readonly index: number;
  readonly candidate?: PuzzleCandidate;
  readonly deductionTrace?: DeductionTrace;
  readonly fillingDiagnostics?: EquationFillingDiagnostics;
  readonly generationFailure?: string;
}

export type CandidateDisposition =
  | "accepted"
  | "hard-gate-rejected"
  | "duplicate-rejected"
  | "diversity-rejected"
  | "ranked-out"
  | "generation-failed";

export interface RankedCandidateRecord {
  readonly index: number;
  readonly rank?: number;
  readonly disposition: CandidateDisposition;
  readonly candidate?: PuzzleCandidate;
  readonly certificate?: CandidateCertificate;
  readonly dna?: PuzzleDNA;
  readonly scorecard?: QualityScorecard;
  readonly failures: readonly CertificationFailure[];
  readonly noveltyScore?: number;
  readonly rejectionReason?: string;
}

export interface CandidateSearchCheckpoint extends VersionedGenerationContract {
  readonly requestFingerprint: string;
  readonly optionsFingerprint: string;
  readonly nextCandidateIndex: number;
  readonly generated: readonly CandidateGenerationRecord[];
}

export interface GenerationManifest extends VersionedGenerationContract {
  readonly request: GenerationRequest;
  readonly options: Required<CandidateSearchOptions>;
  readonly generatedCount: number;
  readonly certifiedCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly records: readonly RankedCandidateRecord[];
  readonly accepted: readonly RankedCandidateRecord[];
  readonly rejectionCounts: Readonly<Record<CandidateDisposition, number>>;
  readonly fingerprint: string;
}

export interface CandidateSearchResult {
  readonly manifest: GenerationManifest;
  readonly checkpoint: CandidateSearchCheckpoint;
}
