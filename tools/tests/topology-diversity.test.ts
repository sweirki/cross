import {
  ORGANIC_TOPOLOGY_ARCHETYPES,
  generateTopologySkeleton,
  materializeTopologySkeleton,
  selectOrganicTopologyArchetype,
  serializeTopologySkeleton,
  validateBoardTopology,
  type OrganicTopologyArchetype,
} from "../../src/game/board";
import {
  createTopologyBatchReport,
  serializeTopologyBatchReport,
} from "../../src/game/topology";
import type { BoardTopology } from "../../src/types/Topology";

let assertions = 0;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  check(
    actual === expected,
    `${message} Expected ${String(expected)}, received ${String(actual)}.`,
  );
}

function topology(
  seed: number,
  archetype?: OrganicTopologyArchetype,
): BoardTopology {
  return materializeTopologySkeleton(
    generateTopologySkeleton({
      seed,
      profile: "organic",
      archetype,
      equationCount: 6,
      width: 13,
      height: 13,
    }),
    (_equation, index) =>
      (["add", "subtract", "multiply", "divide"] as const)[index % 4]!,
  );
}

for (const seed of [0, 1, 2, 99, 100000, 0xffffffff]) {
  equal(
    selectOrganicTopologyArchetype(seed),
    selectOrganicTopologyArchetype(seed),
    `Seed ${seed} archetype selection must be deterministic.`,
  );
}

const selectedFamilies = new Set(
  Array.from({ length: 200 }, (_, index) =>
    selectOrganicTopologyArchetype(100000 + index),
  ),
);
equal(
  selectedFamilies.size,
  ORGANIC_TOPOLOGY_ARCHETYPES.length,
  "Seeded selection must exercise every organic archetype.",
);

for (const archetype of ORGANIC_TOPOLOGY_ARCHETYPES) {
  const first = generateTopologySkeleton({
    seed: 424242,
    profile: "organic",
    archetype,
    equationCount: 6,
    width: 13,
    height: 13,
  });
  const second = generateTopologySkeleton({
    seed: 424242,
    profile: "organic",
    archetype,
    equationCount: 6,
    width: 13,
    height: 13,
  });
  equal(
    serializeTopologySkeleton(first),
    serializeTopologySkeleton(second),
    `${archetype} generation must be deterministic.`,
  );
  check(
    validateBoardTopology(topology(424242, archetype)).valid,
    `${archetype} topology must validate.`,
  );
}

const samples = Array.from({ length: 500 }, (_, index) => {
  const seed = 100000 + index;
  return {
    seed,
    profile: "organic" as const,
    topology: topology(seed),
  };
});
const report = createTopologyBatchReport(samples);
const reversed = createTopologyBatchReport([...samples].reverse());

equal(report.summary.sampleCount, 500, "Batch sample count mismatch.");
check(
  report.summary.uniqueMetricSignatures >= 5,
  "Organic generation must produce several structural metric signatures.",
);
check(
  report.summary.scoreStandardDeviation >= 5,
  "Organic quality scores must have a meaningful distribution.",
);
check(
  report.summary.minimumScore < report.summary.maximumScore,
  "Organic score range must not collapse to a single value.",
);
check(
  Object.values(report.summary.archetypeCounts).every((count) => count > 0),
  "Every organic archetype must occur in the deterministic sample.",
);
check(
  report.summary.averageMiddleIntersectionRatio >= 0.8,
  "Diversity must preserve predominantly middle-connected crossings.",
);
check(
  report.summary.averageEndpointIntersectionRatio <= 0.2,
  "Diversity must not reintroduce endpoint-only layouts.",
);
equal(
  serializeTopologyBatchReport(report),
  serializeTopologyBatchReport(reversed),
  "Diversity reports must be stable across input order.",
);

let invalidArchetypeRejected = false;
try {
  generateTopologySkeleton({
    seed: 1,
    profile: "organic",
    archetype: "ring" as OrganicTopologyArchetype,
    equationCount: 6,
    width: 13,
    height: 13,
  });
} catch {
  invalidArchetypeRejected = true;
}
check(invalidArchetypeRejected, "Unknown organic archetypes must be rejected.");

console.log(`${assertions}/${assertions} topology-diversity assertions passed.`);
