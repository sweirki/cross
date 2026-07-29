import {
  analyzeOrganicTopology,
  createTopologyBatchReport,
  createTopologySampleReport,
  evaluateTopologyQualityGate,
  exportTopologyQualityJson,
  renderTopologyAscii,
  renderTopologySvg,
  scoreOrganicTopology,
  serializeOrganicTopologyMetrics,
  serializeTopologyBatchReport,
  serializeTopologyQualityScore,
  TOPOLOGY_QUALITY_PROFILES,
} from "../../src/game/topology";
import {
  generateTopologySkeleton,
  materializeTopologySkeleton,
} from "../../src/game/board";
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
  profile: "classic" | "organic" = "organic",
  equationCount = 6,
  width = 13,
  height = 13,
): BoardTopology {
  return materializeTopologySkeleton(
    generateTopologySkeleton({
      seed,
      profile,
      equationCount,
      width,
      height,
    }),
    (_equation, index) =>
      (["add", "subtract", "multiply", "divide"] as const)[index % 4]!,
  );
}

const sample = topology(12345);
const metrics = analyzeOrganicTopology(sample);
const metricsAgain = analyzeOrganicTopology(sample);

equal(
  serializeOrganicTopologyMetrics(metrics),
  serializeOrganicTopologyMetrics(metricsAgain),
  "Metric analysis must be deterministic.",
);
equal(metrics.equationCount, 6, "Equation count mismatch.");
equal(metrics.intersectionCount, 5, "Tree topology intersection count mismatch.");
check(metrics.middleIntersectionRatio >= 0.8, "Organic topology should favor middle crossings.");
equal(metrics.endpointIntersectionRatio, 0, "Feasible organic topology should avoid endpoint-only crossings.");
equal(metrics.connectivity.length, 6, "Connectivity must include every equation.");
check(metrics.averageEquationDegree > 0, "Average degree must be positive.");
check(metrics.branchingEquationRatio > 0, "Organic topology must include branching.");
check(metrics.deadEndCount >= 2, "A connected equation tree should expose dead ends.");
check(metrics.deadEndRatio > 0 && metrics.deadEndRatio <= 1, "Dead-end ratio must be normalized.");
check(metrics.boundingWidth > 0, "Bounding width must be positive.");
check(metrics.boundingHeight > 0, "Bounding height must be positive.");
check(metrics.aspectRatio >= 1, "Aspect ratio must be normalized to at least one.");
check(metrics.occupiedCellCount > 0, "Occupied count must be positive.");
check(metrics.density > 0 && metrics.density <= 1, "Density must be normalized.");
check(metrics.horizontalSymmetry >= 0 && metrics.horizontalSymmetry <= 1, "Horizontal symmetry must be normalized.");
check(metrics.verticalSymmetry >= 0 && metrics.verticalSymmetry <= 1, "Vertical symmetry must be normalized.");
equal(metrics.symmetry, Math.max(metrics.horizontalSymmetry, metrics.verticalSymmetry), "Combined symmetry mismatch.");
equal(metrics.irregularity, 1 - metrics.symmetry, "Irregularity mismatch.");
check(metrics.connectivity.some((entry) => entry.branching), "Connectivity must identify a branching equation.");
check(metrics.connectivity.some((entry) => entry.deadEnd), "Connectivity must identify a dead end.");

const score = scoreOrganicTopology(metrics);
const scoreAgain = scoreOrganicTopology(metrics);
equal(
  serializeTopologyQualityScore(score),
  serializeTopologyQualityScore(scoreAgain),
  "Quality scoring must be deterministic.",
);
check(score.total >= 0 && score.total <= 100, "Score must be bounded.");
check(["excellent", "good", "acceptable", "weak"].includes(score.grade), "Score grade must be valid.");
equal(
  Object.values(score.components).reduce((sum, value) => sum + value, 0),
  score.total,
  "Component total mismatch.",
);
check(score.components.middleCrossings > 0, "Middle crossings must contribute.");
check(score.components.branching > 0, "Branching must contribute.");
check(score.components.density > 0, "Density must contribute.");
check(score.components.boundingShape >= 0, "Shape contribution must be non-negative.");
check(score.components.asymmetry >= 0, "Asymmetry contribution must be non-negative.");
check(score.components.deadEndBalance >= 0, "Dead-end contribution must be non-negative.");

const ascii = renderTopologyAscii(sample);
equal(ascii, renderTopologyAscii(sample), "ASCII rendering must be deterministic.");
check(ascii.includes("□"), "ASCII preview must include number cells.");
check(ascii.includes("="), "ASCII preview must include equals cells.");
check(ascii.includes("+"), "ASCII preview must include operators.");
check(ascii.split("\n").length === metrics.boundingHeight, "ASCII height must match occupied bounds.");
const labeledAscii = renderTopologyAscii(sample, {
  numberLabel: (node) => node.id.slice(-2),
});
check(!labeledAscii.includes("□"), "Custom ASCII labels must replace number placeholders.");
check(labeledAscii.length > ascii.length, "Multi-character labels should widen output.");

const svg = renderTopologySvg(sample);
equal(svg, renderTopologySvg(sample), "SVG rendering must be deterministic.");
check(svg.startsWith("<svg "), "SVG must use an SVG root.");
check(svg.includes('role="img"'), "SVG must expose image semantics.");
check(svg.includes("<rect "), "SVG must render number cells.");
check(svg.includes("<text "), "SVG must render labels.");
check(svg.includes("CrossMath topology preview"), "SVG must include an accessible label.");
const customSvg = renderTopologySvg(sample, {
  cellSize: 32,
  padding: 4,
  numberLabel: () => "<5&",
});
check(customSvg.includes("&lt;5&amp;"), "SVG labels must be escaped.");

let badCellSizeRejected = false;
try {
  renderTopologySvg(sample, { cellSize: 0 });
} catch {
  badCellSizeRejected = true;
}
check(badCellSizeRejected, "Invalid SVG cell size must be rejected.");

let badPaddingRejected = false;
try {
  renderTopologySvg(sample, { padding: -1 });
} catch {
  badPaddingRejected = true;
}
check(badPaddingRejected, "Invalid SVG padding must be rejected.");

const sampleReport = createTopologySampleReport({
  seed: 12345,
  profile: "organic",
  difficulty: " hard ",
  topology: sample,
});
equal(sampleReport.seed, 12345, "Sample report seed mismatch.");
equal(sampleReport.profile, "organic", "Sample report profile mismatch.");
equal(sampleReport.difficulty, "hard", "Difficulty must be normalized.");
equal(sampleReport.score.total, score.total, "Sample score mismatch.");

let invalidSeedRejected = false;
try {
  createTopologySampleReport({
    seed: 1.5,
    profile: "organic",
    topology: sample,
  });
} catch {
  invalidSeedRejected = true;
}
check(invalidSeedRejected, "Fractional sample seeds must be rejected.");

const json = exportTopologyQualityJson({
  schema: "crossmath.topology-quality/v1",
  topology: sample,
  metrics,
  score,
});
equal(json, exportTopologyQualityJson({
  schema: "crossmath.topology-quality/v1",
  topology: sample,
  metrics,
  score,
}), "JSON export must be deterministic.");
equal(JSON.parse(json).schema, "crossmath.topology-quality/v1", "Export schema mismatch.");
check(exportTopologyQualityJson({
  schema: "crossmath.topology-quality/v1",
  topology: sample,
  metrics,
  score,
}, true).includes("\n  "), "Pretty export must be indented.");

const organicSamples = Array.from({ length: 32 }, (_, index) => ({
  seed: 5000 + index,
  profile: "organic" as const,
  difficulty: index % 2 === 0 ? "medium" : "hard",
  topology: topology(5000 + index, "organic"),
}));
const classicSamples = Array.from({ length: 32 }, (_, index) => ({
  seed: 6000 + index,
  profile: "classic" as const,
  difficulty: "medium",
  topology: topology(6000 + index, "classic"),
}));
const organicBatch = createTopologyBatchReport(organicSamples);
const classicBatch = createTopologyBatchReport(classicSamples);

equal(organicBatch.summary.sampleCount, 32, "Organic sample count mismatch.");
equal(classicBatch.summary.sampleCount, 32, "Classic sample count mismatch.");
check(organicBatch.summary.averageMiddleIntersectionRatio >= 0.8, "Organic batch middle-crossing ratio is too low.");
check(organicBatch.summary.averageEndpointIntersectionRatio <= 0.2, "Organic batch endpoint ratio is too high.");
check(organicBatch.summary.averageScore >= 55, "Organic batch average quality is too low.");
check(organicBatch.summary.minimumScore >= 40, "Organic batch includes a severe quality outlier.");
check(organicBatch.summary.averageEquationDegree >= 1.5, "Organic batch connectivity is too low.");
check(organicBatch.summary.averageDensity > 0 && organicBatch.summary.averageDensity < 1, "Batch density must be normalized.");
check(organicBatch.summary.averageAspectRatio >= 1, "Batch aspect ratio must be normalized.");
check(
  organicBatch.summary.averageMiddleIntersectionRatio >=
    classicBatch.summary.averageMiddleIntersectionRatio,
  "Organic profile must not underperform classic middle crossings.",
);
check(
  organicBatch.summary.averageEndpointIntersectionRatio <=
    classicBatch.summary.averageEndpointIntersectionRatio,
  "Organic profile must not exceed classic endpoint crossings.",
);
equal(
  serializeTopologyBatchReport(organicBatch),
  serializeTopologyBatchReport(createTopologyBatchReport([...organicSamples].reverse())),
  "Batch reports must be stable across input order.",
);
check(
  Object.values(organicBatch.summary.gradeCounts).reduce((sum, count) => sum + count, 0) === 32,
  "Grade counts must cover every sample.",
);

let emptyBatchRejected = false;
try {
  createTopologyBatchReport([]);
} catch {
  emptyBatchRejected = true;
}
check(emptyBatchRejected, "Empty batches must be rejected.");

const exploratoryGate = evaluateTopologyQualityGate(
  {
    score: score.total,
    middleIntersectionRatio: metrics.middleIntersectionRatio,
    endpointIntersectionRatio: metrics.endpointIntersectionRatio,
    density: metrics.density,
  },
  "exploratory",
);
check(exploratoryGate.accepted, "Representative organic topology should pass exploratory QA.");
equal(exploratoryGate.failures.length, 0, "Accepted gate must have no failures.");

const rejectedGate = evaluateTopologyQualityGate({
  score: 10,
  middleIntersectionRatio: 0.1,
  endpointIntersectionRatio: 0.9,
  density: 0.99,
});
check(!rejectedGate.accepted, "Poor topology must fail production QA.");
equal(rejectedGate.failures.length, 4, "Poor topology must report every failed metric.");
equal(rejectedGate.failures[0], "score", "Gate failure order must be deterministic.");
equal(rejectedGate.failures[1], "middleIntersectionRatio", "Middle-ratio failure order mismatch.");
equal(rejectedGate.failures[2], "endpointIntersectionRatio", "Endpoint-ratio failure order mismatch.");
equal(rejectedGate.failures[3], "density", "Density failure order mismatch.");
check(TOPOLOGY_QUALITY_PROFILES.production.minimumScore > TOPOLOGY_QUALITY_PROFILES.exploratory.minimumScore, "Production score threshold must be stricter.");
check(
  TOPOLOGY_QUALITY_PROFILES.production.minimumMiddleIntersectionRatio >
    TOPOLOGY_QUALITY_PROFILES.exploratory.minimumMiddleIntersectionRatio,
  "Production crossing threshold must be stricter.",
);

console.log(`${assertions}/${assertions} organic-layout-quality assertions passed.`);
