import {
  COMMERCIAL_GENERATOR_VERSION,
  DEFAULT_GENERATION_FEATURE_FLAGS,
  GENERATION_SCHEMA_IDS,
  allocateStageSeeds,
  canonicalSerialize,
  createRootGenerationSeed,
  deriveGenerationSeed,
  replaySeed,
  validateCompositionPlan,
  validateGenerationRequest,
  type CompositionPlan,
  type GenerationRequest,
} from "../../src/generation";

let assertions = 0;

function assert(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertThrows(action: () => void, message: string): void {
  let threw = false;
  try { action(); } catch { threw = true; }
  assert(threw, message);
}

const request: GenerationRequest = {
  schema: GENERATION_SCHEMA_IDS.generationRequest,
  requestId: "request-1",
  rootSeed: "commercial-seed",
  difficulty: "hard",
  generatorVersion: COMMERCIAL_GENERATOR_VERSION,
  candidateCount: 32,
  constraints: {
    minimumRows: 9,
    maximumRows: 17,
    minimumColumns: 9,
    maximumColumns: 17,
    allowedOperators: ["+", "-", "×", "÷"],
  },
};

validateGenerationRequest(request);
assertEqual(request.schema, "crossmath.generation-request/v1", "request schema is versioned");

const rootA = createRootGenerationSeed("seed-A");
const rootARepeat = createRootGenerationSeed("seed-A");
const rootB = createRootGenerationSeed("seed-B");
assertEqual(rootA.value, rootARepeat.value, "same root seed is deterministic");
assert(rootA.value !== rootB.value, "different root seeds diverge");

const childA = deriveGenerationSeed(rootA, "composition");
const childARepeat = deriveGenerationSeed(rootARepeat, "composition");
const childB = deriveGenerationSeed(rootA, "dependency");
assertEqual(childA.value, childARepeat.value, "same path is deterministic");
assert(childA.value !== childB.value, "different labels produce different seeds");
assertEqual(replaySeed(childA).value, childA.value, "seed replay reproduces value");

const stageSeedsA = allocateStageSeeds("seed-A", 7);
const stageSeedsARepeat = allocateStageSeeds("seed-A", 7);
const stageSeedsB = allocateStageSeeds("seed-A", 8);
assertEqual(
  canonicalSerialize(stageSeedsA),
  canonicalSerialize(stageSeedsARepeat),
  "same candidate seed allocation is byte-identical",
);
assert(
  stageSeedsA.composition.value !== stageSeedsA.dependency.value,
  "stages receive isolated seeds",
);
assert(
  stageSeedsA.composition.value !== stageSeedsB.composition.value,
  "candidate index isolates stage streams",
);

const reorderedA = { beta: 2, alpha: { y: 2, x: 1 } };
const reorderedB = { alpha: { x: 1, y: 2 }, beta: 2 };
assertEqual(
  canonicalSerialize(reorderedA),
  canonicalSerialize(reorderedB),
  "canonical serialization sorts object keys recursively",
);
assertThrows(
  () => canonicalSerialize({ invalid: undefined }),
  "canonical serialization rejects undefined",
);

const composition: CompositionPlan = {
  schema: GENERATION_SCHEMA_IDS.compositionPlan,
  id: "composition-1",
  family: "balanced-asymmetric",
  rows: 9,
  columns: 9,
  clusters: [],
  occupiedCells: [
    {
      cellId: "cell-1",
      position: { row: 1, col: 1 },
      kind: "number",
      clusterIds: ["cluster-1"],
    },
  ],
  metrics: { visualBalance: 0.91 },
};
validateCompositionPlan(composition);

assertThrows(
  () => validateCompositionPlan({
    ...composition,
    occupiedCells: [
      ...composition.occupiedCells,
      {
        cellId: "cell-2",
        position: { row: 1, col: 1 },
        kind: "number",
        clusterIds: ["cluster-2"],
      },
    ],
  }),
  "composition validation rejects duplicate positions",
);

assertEqual(
  DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline,
  false,
  "new pipeline remains disabled",
);
assertEqual(
  DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationContracts,
  true,
  "new contracts are available independently",
);

console.log(`${assertions}/${assertions} commercial generation contract assertions passed.`);
