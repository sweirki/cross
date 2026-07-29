
import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  arithmeticProfileForDifficulty,
  canonicalSerialize,
  fillEquations,
  generateCompositionPlan,
  validateEquationFillPlan,
} from "../../src/generation";
import type { GenerationRequest } from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string, allowedOperators?: GenerationRequest["constraints"]["allowedOperators"]): GenerationRequest {
  return {
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `fill-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 8,
    constraints: allowedOperators ? { allowedOperators } : {},
  };
}

for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  const profile = arithmeticProfileForDifficulty(difficulty);
  check(profile.difficulty === difficulty, `${difficulty}: profile mismatch`);
  check(profile.maximumSearchNodes > 0, `${difficulty}: invalid budget`);
  const fingerprints = new Set<string>();
  for (let index = 0; index < 8; index += 1) {
    const input = request(difficulty, `seed-${index}`);
    const composition = generateCompositionPlan(input, index);
    const result = fillEquations(input, composition, index);
    check(result.ok, `${difficulty}/${index}: filling failed: ${result.ok ? "" : result.message}`);
    if (!result.ok) continue;
    const replay = fillEquations(input, composition, index);
    check(replay.ok, `${difficulty}/${index}: replay failed`);
    if (!replay.ok) continue;
    check(canonicalSerialize(result.plan) === canonicalSerialize(replay.plan), `${difficulty}/${index}: nondeterministic plan`);
    check(canonicalSerialize(result.diagnostics) === canonicalSerialize(replay.diagnostics), `${difficulty}/${index}: nondeterministic diagnostics`);
    const validation = validateEquationFillPlan(difficulty, composition, result.plan);
    check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
    check(result.plan.schema === GENERATION_SCHEMA_IDS.equationFillPlan, "wrong schema");
    check(Object.keys(result.plan.values).length === composition.occupiedCells.filter((cell) => cell.kind === "number").length, "number-cell coverage mismatch");
    check(Object.keys(result.plan.operators).length > 0, "operator map is empty");
    check(result.diagnostics.searchNodes > 0, "search did not run");
    check(result.diagnostics.candidateTriples > 0, "no candidate triples were considered");
    check(result.diagnostics.trivialEquationRatio === 0, "trivial arithmetic survived");
    fingerprints.add(canonicalSerialize(result.plan));
  }
  check(fingerprints.size >= 7, `${difficulty}: insufficient arithmetic diversity`);
}

const impossible = request("easy", "operator-conflict", ["×"]);
const impossibleComposition = generateCompositionPlan(impossible);
const rejected = fillEquations(impossible, impossibleComposition);
check(!rejected.ok && rejected.code === "NO_ALLOWED_OPERATORS", "operator conflict must be rejected");

const constrained = request("hard", "division-only", ["÷"]);
const constrainedComposition = generateCompositionPlan(constrained);
const constrainedResult = fillEquations(constrained, constrainedComposition);
check(constrainedResult.ok, "division-only hard fill should succeed");
if (constrainedResult.ok) {
  check(Object.values(constrainedResult.plan.operators).every((operator) => operator === "÷"), "operator constraint was ignored");
  check(validateEquationFillPlan("hard", constrainedComposition, constrainedResult.plan).valid, "constrained plan is invalid");
}

console.log(`Equation filling v2: ${assertions}/${assertions} assertions passed.`);
