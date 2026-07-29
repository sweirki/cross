"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bundledLibrary_1 = require("../../src/data/bundledLibrary");
const certifiedLaunchPuzzles_1 = require("../../src/data/generated/certifiedLaunchPuzzles");
const GenerationFeatureFlags_1 = require("../../src/generation/config/GenerationFeatureFlags");
let assertions = 0;
function check(condition, message) {
    assertions += 1;
    if (!condition)
        throw new Error(message);
}
check(GenerationFeatureFlags_1.DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline, "new pipeline is not enabled by default");
check(GenerationFeatureFlags_1.DEFAULT_GENERATION_FEATURE_FLAGS.legacyGenerationFallback, "legacy fallback must remain until removal gate passes");
check(certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES.length === 400, "launch catalog must contain 400 puzzles");
check(new Set(certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES.map((puzzle) => puzzle.id)).size === 400, "launch puzzle IDs are not unique");
check(bundledLibrary_1.BUNDLED_LIBRARY.puzzles.length >= 404, "bundled library did not include launch catalog");
check(certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.schemaVersion === 1), "runtime puzzle schema mismatch");
check(certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.cells.length > 0 && puzzle.equations.length > 0), "empty generated puzzle");
check(certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES.every((puzzle) => puzzle.numberBank.length === puzzle.cells.filter((cell) => cell.kind === "number" && !cell.given).length), "number bank mismatch");
console.log(`Generator cutover: ${assertions}/${assertions} assertions passed.`);
