import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { allocateStageSeeds } from "../random/GenerationSeeds";
import { buildStructuralDependencyGraph } from "../dependency";
import { candidateFingerprints } from "../certification";
import { fillEquations } from "../filling";
import { generateCompositionPlan } from "../composition";
import { planClues } from "../clues";
import type {
  GenerationRequest,
  PuzzleCandidate,
  PuzzleDNA,
} from "../contracts/GenerationContracts";
import type { CandidateGenerationRecord } from "./IndustrialTypes";

function puzzleDNA(candidate: PuzzleCandidate, index: number): PuzzleDNA {
  return Object.freeze({
    schema: GENERATION_SCHEMA_IDS.puzzleDNA,
    generatorVersion: candidate.request.generatorVersion,
    rootSeed: candidate.request.rootSeed,
    stageSeeds: allocateStageSeeds(candidate.request.rootSeed, index),
    compositionFamily: candidate.composition.family,
    clusterTemplateIds: Object.freeze(candidate.composition.clusters.map((cluster) => cluster.templateId)),
    dependencyProfile: `${candidate.request.difficulty}-structural/v1`,
    operatorProfile: candidate.fill.profileId,
    clueProfile: candidate.clues.profileId,
    fingerprints: candidateFingerprints(candidate),
  });
}

export function generateCandidate(
  request: GenerationRequest,
  index: number,
): CandidateGenerationRecord {
  try {
    const composition = generateCompositionPlan(request, index);
    const dependency = buildStructuralDependencyGraph(request, composition);
    const filling = fillEquations(request, composition, index);
    if (!filling.ok) {
      return Object.freeze({
        index,
        generationFailure: `FILLING_FAILED:${filling.code}:${filling.message}`,
      });
    }
    const clues = planClues(request, composition, filling.plan, index);
    if (!clues.ok) {
      return Object.freeze({
        index,
        generationFailure: `CLUE_PLANNING_FAILED:${clues.code}:${clues.message}`,
      });
    }

    const base: PuzzleCandidate = {
      schema: GENERATION_SCHEMA_IDS.puzzleCandidate,
      id: `${request.requestId}:candidate:${index}`,
      request,
      composition,
      dependency,
      fill: filling.plan,
      clues: clues.plan,
    };
    const candidate: PuzzleCandidate = Object.freeze({
      ...base,
      dna: puzzleDNA(base, index),
    });
    return Object.freeze({
      index,
      candidate,
      deductionTrace: clues.trace,
      fillingDiagnostics: filling.diagnostics,
    });
  } catch (error) {
    return Object.freeze({
      index,
      generationFailure: `GENERATION_EXCEPTION:${error instanceof Error ? error.message : String(error)}`,
    });
  }
}
