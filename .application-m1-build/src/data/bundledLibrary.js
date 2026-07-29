"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUNDLED_LIBRARY = void 0;
const demoPuzzle_1 = require("./demoPuzzle");
const tutorialPuzzles_1 = require("./tutorialPuzzles");
exports.BUNDLED_LIBRARY = {
    schemaVersion: 1,
    id: "crossmath-bundled-v2",
    puzzles: [
        tutorialPuzzles_1.LESSON_ONE_PUZZLE,
        tutorialPuzzles_1.LESSON_TWO_PUZZLE,
        tutorialPuzzles_1.FIRST_INTERSECTION_PUZZLE,
        demoPuzzle_1.DEMO_PUZZLE,
    ],
};
