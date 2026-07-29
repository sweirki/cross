
import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  buildStructuralDependencyGraph,
  calculateDependencyMetrics,
  canonicalSerialize,
  dependencyProfileForDifficulty,
  generateCompositionPlan,
  renderDependencyGraphAsText,
  validateDependencyGraph,
} from "../../src/generation";
import type { GenerationRequest } from "../../src/generation";
import type { DifficultyTier } from "../../src/types/Difficulty";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(difficulty: DifficultyTier, seed: string): GenerationRequest {
  return {
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `dependency-${difficulty}-${seed}`,
    rootSeed: seed,
    difficulty,
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: 8,
    constraints: {},
  };
}

for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
  const profile = dependencyProfileForDifficulty(difficulty);
  check(profile.difficulty === difficulty, `${difficulty}: profile mismatch`);
  const fingerprints = new Set<string>();
  for (let index = 0; index < 16; index += 1) {
    const input = request(difficulty, `seed-${index}`);
    const composition = generateCompositionPlan(input, index);
    const graph = buildStructuralDependencyGraph(input, composition);
    const replay = buildStructuralDependencyGraph(input, composition);
    const validation = validateDependencyGraph(graph);
    const metrics = calculateDependencyMetrics(graph);

    check(validation.valid, `${difficulty}/${index}: ${validation.errors.join("; ")}`);
    check(canonicalSerialize(graph) === canonicalSerialize(replay), `${difficulty}/${index}: nondeterministic`);
    check(graph.schema === GENERATION_SCHEMA_IDS.dependencyGraph, "wrong schema");
    check(metrics.clusterCount === composition.clusters.length, "cluster node count mismatch");
    check(metrics.equationCount > metrics.clusterCount, "equation graph is unexpectedly sparse");
    check(metrics.numberCellCount > metrics.equationCount, "number node count is unexpectedly low");
    check(metrics.edgeCount === graph.edges.length, "edge metric mismatch");
    check(metrics.componentCount === composition.clusters.length, "cluster components must remain independent");
    check(metrics.longestPath >= 3, "dependency paths are too shallow");
    check(metrics.averageDegree > 1, "average degree is too low");
    check(metrics.maximumDegree >= 3, "maximum degree is too low");
    check(metrics.articulationPointCount > 0, "expected articulation points");
    check(renderDependencyGraphAsText(graph).includes("shares-value"), "preview lacks value dependencies");
    check(Object.isFrozen(graph), "graph must be immutable");
    fingerprints.add(canonicalSerialize(graph));
  }
  check(fingerprints.size >= 14, `${difficulty}: insufficient graph diversity`);
}

const input = request("medium", "invalid");
const composition = generateCompositionPlan(input);
const valid = buildStructuralDependencyGraph(input, composition);
const invalid = {
  ...valid,
  edges: [...valid.edges, {
    id: "invalid-edge",
    from: valid.nodes[0]!.id,
    to: "missing-node",
    kind: "shares-value" as const,
    directed: false,
  }],
};
check(!validateDependencyGraph(invalid).valid, "missing-node edge must be rejected");

console.log(`Structural dependency graph: ${assertions}/${assertions} assertions passed.`);
