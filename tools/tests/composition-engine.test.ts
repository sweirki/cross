import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  PRODUCTION_COMPOSITION_PROFILES,
  canonicalSerialize,
  generateCompositionPlan,
  renderCompositionAscii,
  inspectCompositionPlan,
} from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";
import type { GenerationRequest } from "../../src/generation";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string): GenerationRequest {
  return {
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `test-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 10,
    constraints: {},
  };
}

check(PRODUCTION_COMPOSITION_PROFILES.length === 6, "expected six production profiles");
for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  const seenFamilies = new Set<string>();
  const seenSerializations = new Set<string>();
  for (let index = 0; index < 24; index += 1) {
    const input = request(difficulty, `seed-${index}`);
    const plan = generateCompositionPlan(input, index);
    const replay = generateCompositionPlan(input, index);
    const validation = inspectCompositionPlan(plan);
    check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
    check(canonicalSerialize(plan) === canonicalSerialize(replay), `${difficulty}/${index} is not deterministic`);
    check(plan.clusters.length >= 2, `${difficulty}/${index} has too few clusters`);
    check(plan.occupiedCells.length > plan.clusters.length * 5, `${difficulty}/${index} has too few cells`);
    check(plan.metrics.visualBalance! >= 0 && plan.metrics.visualBalance! <= 1, "invalid visual balance");
    check(plan.metrics.density! > 0 && plan.metrics.density! < 1, "invalid density");
    check(renderCompositionAscii(plan).includes("□"), "preview must contain number cells");
    seenFamilies.add(plan.family);
    seenSerializations.add(canonicalSerialize(plan));
  }
  check(seenFamilies.size >= 2, `${difficulty} needs family diversity`);
  check(seenSerializations.size >= 20, `${difficulty} needs deterministic variety`);
}

const bounded = request("easy", "bounded");
const boundedPlan = generateCompositionPlan({
  ...bounded,
  constraints: { minimumRows: 40, minimumColumns: 41 },
});
check(boundedPlan.rows >= 40 && boundedPlan.columns >= 41, "minimum bounds not honored");

let maxError = "";
try {
  generateCompositionPlan({ ...bounded, constraints: { maximumRows: 2, maximumColumns: 2 } });
} catch (error) {
  maxError = error instanceof Error ? error.message : String(error);
}
check(/maximum/.test(maxError), "maximum bounds must reject oversized compositions");

const invalid = { ...generateCompositionPlan(request("easy", "invalid")), rows: 1 };
check(!inspectCompositionPlan(invalid).valid, "out-of-bounds composition must fail");

console.log(`Composition engine: ${assertions}/${assertions} assertions passed.`);
