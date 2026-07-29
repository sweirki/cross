
import { BUNDLED_LIBRARY } from "../../src/data/bundledLibrary";
import { CERTIFIED_LAUNCH_PUZZLES } from "../../src/data/generated/certifiedLaunchPuzzles";
import { DEFAULT_GENERATION_FEATURE_FLAGS } from "../../src/generation/config/GenerationFeatureFlags";

let assertions = 0;
function check(condition: unknown, message: string): asserts condition {
  assertions += 1;
  if (!condition) throw new Error(message);
}

check(DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline, "new pipeline is not enabled by default");
check(DEFAULT_GENERATION_FEATURE_FLAGS.legacyGenerationFallback, "legacy fallback must remain until removal gate passes");
check(CERTIFIED_LAUNCH_PUZZLES.length === 400, "launch catalog must contain 400 puzzles");
check(new Set(CERTIFIED_LAUNCH_PUZZLES.map((puzzle) => puzzle.id)).size === 400, "launch puzzle IDs are not unique");
check(BUNDLED_LIBRARY.puzzles.length >= 404, "bundled library did not include launch catalog");
check(CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.schemaVersion === 1), "runtime puzzle schema mismatch");
check(CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.cells.length > 0 && puzzle.equations.length > 0), "empty generated puzzle");
check(CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.numberBank.length === puzzle.cells.filter((cell) => cell.kind === "number" && !cell.given).length), "number bank mismatch");

console.log(`Generator cutover: ${assertions}/${assertions} assertions passed.`);
