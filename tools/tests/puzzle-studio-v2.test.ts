import {
  COMMERCIAL_GENERATOR_VERSION,
  GENERATION_SCHEMA_IDS,
  PuzzleStudioV2,
  canonicalSerialize,
} from "../../src/generation";
import type { GenerationRequest } from "../../src/generation";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function request(seed: string, count = 3): GenerationRequest {
  return Object.freeze({
    schema: GENERATION_SCHEMA_IDS.generationRequest,
    requestId: `studio-${seed}`,
    rootSeed: seed,
    difficulty: "easy",
    generatorVersion: COMMERCIAL_GENERATOR_VERSION,
    candidateCount: count,
    constraints: {},
  });
}

const studio = new PuzzleStudioV2();
const input = request("m9", 3);
const options = { poolSize: 3, acceptanceLimit: 1, maximumPerComposition: 2, maximumPerDependency: 2 };
const session = studio.runSearch(input, options);
const replaySession = studio.runSearch(input, options);

check(session.summaries.length === 3, "summary count mismatch");
check(session.options.poolSize === 3, "normalized options missing");
check(canonicalSerialize(session) === canonicalSerialize(replaySession), "studio search is nondeterministic");

for (const summary of session.summaries) {
  const inspection = studio.inspect(session.result.manifest, summary.index);
  check(inspection.summary.index === summary.index, "inspection index mismatch");
  check(inspection.failures !== undefined, "inspection failures missing");
  const json = studio.exportCandidate(inspection, "json");
  const text = studio.exportCandidate(inspection, "text");
  check(json.mediaType === "application/json", "JSON media type mismatch");
  check(json.content === canonicalSerialize(inspection), "JSON export is not canonical");
  check(text.content.includes(`Candidate ${summary.index}`), "text export missing heading");

  const replay = studio.replay(input, summary.index);
  check(replay.summary.index === summary.index, "replay index mismatch");
  if (inspection.candidate && replay.candidate) {
    check(canonicalSerialize(inspection.candidate).includes(inspection.candidate.id), "inspection candidate malformed");
    check(inspection.candidate.id === replay.candidate.id, "seed replay changed candidate identity");
    check(inspection.compositionAscii !== undefined && inspection.compositionAscii.length > 0, "composition preview missing");
    check(inspection.dependencyText?.startsWith("DependencyGraph") === true, "dependency preview missing");
    check(inspection.equations.length > 0, "arithmetic panel empty");
    check(inspection.deductionTrace !== undefined, "deduction trace missing");
    check(inspection.provenance?.stageSeeds.candidate !== undefined, "seed provenance missing");
    const svg = studio.exportCandidate(inspection, "svg");
    check(svg.mediaType === "image/svg+xml", "SVG media type mismatch");
    check(svg.content.startsWith("<svg"), "SVG export malformed");
    check(svg.content.includes(inspection.candidate.id), "SVG missing candidate ID");
  }
}

const comparison = studio.compare(session.result.manifest, 0, 1);
check(comparison.leftIndex === 0 && comparison.rightIndex === 1, "comparison indexes mismatch");
check(comparison.metrics.some((item) => item.metric === "overall"), "comparison missing overall score");
check(comparison.metrics.some((item) => item.metric === "deductionDepth"), "comparison missing deduction depth");

let sameRejected = false;
try { studio.compare(session.result.manifest, 0, 0); } catch { sameRejected = true; }
check(sameRejected, "same-candidate comparison accepted");

let unknownRejected = false;
try { studio.inspect(session.result.manifest, 99); } catch { unknownRejected = true; }
check(unknownRejected, "unknown candidate accepted");

let failedSvgRejected = false;
const failed = session.result.manifest.records.find((record) => !record.candidate);
if (failed) {
  try { studio.exportCandidate(studio.inspect(session.result.manifest, failed.index), "svg"); } catch { failedSvgRejected = true; }
  check(failedSvgRejected, "failed candidate SVG export accepted");
}

console.log(`Puzzle Studio v2: ${assertions}/${assertions} assertions passed.`);
