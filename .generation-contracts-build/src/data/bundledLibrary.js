"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUNDLED_LIBRARY = void 0;
const demoPuzzle_1 = require("./demoPuzzle");
const tutorialPuzzles_1 = require("./tutorialPuzzles");
const commercialPuzzles_1 = require("./commercialPuzzles");
const certifiedLaunchPuzzles_1 = require("./generated/certifiedLaunchPuzzles");
const GenerationFeatureFlags_1 = require("../generation/config/GenerationFeatureFlags");
exports.BUNDLED_LIBRARY = {
    schemaVersion: 1,
    id: "crossmath-commercial-v1",
    puzzles: [
        tutorialPuzzles_1.LESSON_ONE_PUZZLE,
        tutorialPuzzles_1.LESSON_TWO_PUZZLE,
        tutorialPuzzles_1.FIRST_INTERSECTION_PUZZLE,
        demoPuzzle_1.DEMO_PUZZLE,
        ...(GenerationFeatureFlags_1.DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline
            ? certifiedLaunchPuzzles_1.CERTIFIED_LAUNCH_PUZZLES
            : commercialPuzzles_1.COMMERCIAL_PUZZLES),
    ],
};
