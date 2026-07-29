import { DEMO_PUZZLE } from "./demoPuzzle";
import {
  FIRST_INTERSECTION_PUZZLE,
  LESSON_ONE_PUZZLE,
  LESSON_TWO_PUZZLE,
} from "./tutorialPuzzles";
import type { PuzzleLibrary } from "../services/PuzzleLibrary";
import { COMMERCIAL_PUZZLES } from "./commercialPuzzles";
import { CERTIFIED_LAUNCH_PUZZLES } from "./generated/certifiedLaunchPuzzles";
import { DEFAULT_GENERATION_FEATURE_FLAGS } from "../generation/config/GenerationFeatureFlags";

export const BUNDLED_LIBRARY: PuzzleLibrary = {
  schemaVersion: 1,
  id: "crossmath-commercial-v1",
  puzzles: [
    LESSON_ONE_PUZZLE,
    LESSON_TWO_PUZZLE,
    FIRST_INTERSECTION_PUZZLE,
    DEMO_PUZZLE,
    ...(DEFAULT_GENERATION_FEATURE_FLAGS.commercialGenerationPipeline
      ? CERTIFIED_LAUNCH_PUZZLES
      : COMMERCIAL_PUZZLES),
  ],
};
