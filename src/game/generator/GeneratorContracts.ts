import type {
  GeneratedCandidate,
  GenerationRequest,
  GenerationResult,
} from "../../types/Generator";

export interface CrossPuzzleGenerator {
  readonly version: string;

  generate(
    request: GenerationRequest,
  ): GenerationResult;
}

export interface CandidateNormalizer {
  normalize(
    candidate: GeneratedCandidate,
  ): GeneratedCandidate;
}

export interface CandidateFingerprintService {
  exact(candidate: GeneratedCandidate): string;
  structural(candidate: GeneratedCandidate): string;
  solution(candidate: GeneratedCandidate): string;
  topology(candidate: GeneratedCandidate): string;
}
