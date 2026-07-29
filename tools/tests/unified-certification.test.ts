
import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  buildStructuralDependencyGraph,
  canonicalSerialize,
  certifyCandidate,
  fillEquations,
  generateCompositionPlan,
  planClues,
  scoreCandidate,
  candidateFingerprints,
} from "../../src/generation";
import type { GenerationRequest, PuzzleCandidate } from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string): GenerationRequest {
  return {
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `cert-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 8,
    constraints: {},
  };
}

for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  for (let index = 0; index < 6; index += 1) {
    const input = request(difficulty, `seed-${index}`);
    const composition = generateCompositionPlan(input, index);
    const dependency = buildStructuralDependencyGraph(input, composition);
    const filling = fillEquations(input, composition, index);
    check(filling.ok, `${difficulty}/${index}: fill failed`);
    if (!filling.ok) continue;
    const clues = planClues(input, composition, filling.plan, index);
    check(clues.ok, `${difficulty}/${index}: clues failed`);
    if (!clues.ok) continue;

    const candidate: PuzzleCandidate = {
      schema: GENERATION_SCHEMA_IDS.puzzleCandidate,
      id: `candidate-${difficulty}-${index}`,
      request: input,
      composition,
      dependency,
      fill: filling.plan,
      clues: clues.plan,
    };
    const result = certifyCandidate({
      candidate,
      deductionTrace: clues.trace,
      fillingDiagnostics: filling.diagnostics,
      noveltyScore: 85,
    });
    const replay = certifyCandidate({
      candidate,
      deductionTrace: clues.trace,
      fillingDiagnostics: filling.diagnostics,
      noveltyScore: 85,
    });
    check(result.certificate.schema === GENERATION_SCHEMA_IDS.candidateCertificate, "wrong certificate schema");
    check(canonicalSerialize(result) === canonicalSerialize(replay), `${difficulty}/${index}: nondeterministic certificate`);
    check(Object.keys(result.scorecard).length === 10, "scorecard incomplete");
    check(Object.values(result.scorecard).every((score) => score >= 0 && score <= 100), "score outside range");
    check(result.certificate.valid === result.accepted, "acceptance mismatch");
    check(result.certificate.hardGateFailures.length === result.failures.length, "failure mismatch");
    check(Object.keys(result.certificate.fingerprints).length === 5, "fingerprints incomplete");
    check(
      canonicalSerialize(result.scorecard) === canonicalSerialize(scoreCandidate({
        candidate,
        deductionTrace: clues.trace,
        fillingDiagnostics: filling.diagnostics,
        noveltyScore: 85,
      })),
      "score replay mismatch",
    );
    check(
      canonicalSerialize(result.certificate.fingerprints) === canonicalSerialize(candidateFingerprints(candidate)),
      "fingerprint replay mismatch",
    );

    const broken = {
      ...candidate,
      clues: { ...candidate.clues, numberBank: [] },
    } as PuzzleCandidate;
    const rejected = certifyCandidate({ candidate: broken, deductionTrace: clues.trace });
    check(!rejected.accepted, "invalid clue plan accepted");
    check(rejected.failures.some((failure) => failure.code === "INVALID_CLUE_PLAN"), "missing clue rejection");
  }
}

console.log(`Unified certification: ${assertions}/${assertions} assertions passed.`);
