import { buildEquationGraph } from "../../game/board/EquationGraphBuilder";
import {
  generateTopologySkeleton,
  materializeTopologySkeleton,
} from "../../game/board/TopologySkeletonGenerator";
import { certifyDifficulty } from "../../game/difficulty/DifficultyCertifier";
import {
  generateIndustrialLibrary,
} from "../../game/generator/IndustrialPuzzleGenerator";
import { synthesizeNumbers } from "../../game/generator/NumberSynthesizer";
import { createPuzzle } from "../../game/generator/PuzzleBuilder";
import { fingerprintPuzzle } from "../../game/generator/PuzzleFingerprint";
import {
  solvePuzzle,
  verifyUniqueSolution,
} from "../../game/solver/PuzzleSolver";
import { validatePuzzle } from "../../game/validation/PuzzleValidation";
import type { DifficultyTier } from "../../types/Difficulty";
import type { Puzzle } from "../../types/Puzzle";
import type { ArithmeticOperator } from "../../types/Topology";
import {
  DeterministicRandom,
  hashSeed,
} from "../random/DeterministicRandom";
import type {
  CrossMathEngineApi,
  ExportLibraryOptions,
  GeneratedPuzzle,
  GeneratePuzzleOptions,
  VerifyPuzzleResult,
} from "./EngineContracts";

const DEFAULT_OPERATORS: readonly ArithmeticOperator[] = [
  "add",
  "subtract",
  "multiply",
  "divide",
];

interface DifficultyDefaults {
  readonly width: number;
  readonly height: number;
  readonly equationCount: number;
  readonly hiddenRatio: number;
}

const DEFAULTS: Readonly<Record<DifficultyTier, DifficultyDefaults>> = {
  easy: { width: 7, height: 7, equationCount: 2, hiddenRatio: 0.45 },
  medium: { width: 9, height: 9, equationCount: 3, hiddenRatio: 0.58 },
  hard: { width: 11, height: 11, equationCount: 4, hiddenRatio: 0.7 },
  expert: { width: 13, height: 13, equationCount: 5, hiddenRatio: 0.82 },
};

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
}

function validateGenerateOptions(options: GeneratePuzzleOptions): void {
  if (!Number.isSafeInteger(options.seed)) {
    throw new Error("seed must be a safe integer.");
  }
  if (options.width !== undefined) assertPositiveInteger(options.width, "width");
  if (options.height !== undefined) assertPositiveInteger(options.height, "height");
  if (options.equationCount !== undefined) {
    assertPositiveInteger(options.equationCount, "equationCount");
    if (options.equationCount < 2) {
      throw new Error("equationCount must be at least 2.");
    }
  }
  if (options.hiddenCellCount !== undefined && (
    !Number.isSafeInteger(options.hiddenCellCount) ||
    options.hiddenCellCount < 1
  )) {
    throw new Error("hiddenCellCount must be a positive safe integer.");
  }
  if (options.maximumAttempts !== undefined) {
    assertPositiveInteger(options.maximumAttempts, "maximumAttempts");
  }
  if (options.operators !== undefined && options.operators.length === 0) {
    throw new Error("operators must contain at least one operator.");
  }
  if (
    options.topologyProfile !== undefined &&
    options.topologyProfile !== "classic" &&
    options.topologyProfile !== "organic"
  ) {
    throw new Error(
      `Unknown topologyProfile: ${String(options.topologyProfile)}.`,
    );
  }
}

function stablePuzzleId(
  options: GeneratePuzzleOptions,
  generationSeed: number,
): string {
  const requested = options.id?.trim();
  if (requested) return requested;
  return `cross-${options.difficulty}-${generationSeed.toString(16).padStart(8, "0")}`;
}

function hiddenTarget(
  variableCount: number,
  options: GeneratePuzzleOptions,
): number {
  const defaults = DEFAULTS[options.difficulty];
  return Math.min(
    variableCount,
    options.hiddenCellCount ??
      Math.max(1, Math.round(variableCount * defaults.hiddenRatio)),
  );
}

function buildUniquelySolvablePuzzle(
  options: GeneratePuzzleOptions,
  generationSeed: number,
): {
  readonly puzzle: Puzzle;
  readonly topology: ReturnType<typeof materializeTopologySkeleton>;
} {
  const defaults = DEFAULTS[options.difficulty];
  const width = options.width ?? defaults.width;
  const height = options.height ?? defaults.height;
  const equationCount = options.equationCount ?? defaults.equationCount;
  const operators = options.operators ?? DEFAULT_OPERATORS;
  const random = new DeterministicRandom(generationSeed);

  const skeleton = generateTopologySkeleton({
    width,
    height,
    equationCount,
    seed: random.fork("topology").nextUint32(),
    profile: options.topologyProfile ?? "organic",
  });

  const topology = materializeTopologySkeleton(
    skeleton,
    (equation, index) => {
      const operatorIndex = hashSeed(
        `${generationSeed}:operator:${index}:${equation.id}`,
      ) % operators.length;
      return operators[operatorIndex]!;
    },
  );

  const graph = buildEquationGraph(topology);
  const synthesis = synthesizeNumbers(graph, {
    seed: random.fork("numbers").nextUint32(),
    requireDistinctValues: options.requireDistinctValues ?? false,
  });

  const orderedVariables = random
    .fork("visibility")
    .shuffle(graph.variables.map((variable) => variable.id));
  const visible = new Set(graph.variables.map((variable) => variable.id));
  const target = hiddenTarget(graph.variables.length, options);
  const puzzleId = stablePuzzleId(options, generationSeed);
  let puzzle = createPuzzle(topology, synthesis, {
    id: puzzleId,
    difficulty: options.difficulty,
    visibleVariableIds: [...visible].sort(),
  });
  let hidden = 0;

  for (const variableId of orderedVariables) {
    if (hidden >= target) break;
    visible.delete(variableId);
    const candidate = createPuzzle(topology, synthesis, {
      id: puzzleId,
      difficulty: options.difficulty,
      visibleVariableIds: [...visible].sort(),
    });
    const verification = verifyUniqueSolution(candidate);
    if (verification.unique) {
      puzzle = candidate;
      hidden += 1;
    } else {
      visible.add(variableId);
    }
  }

  if (hidden === 0) {
    throw new Error("Could not hide any number while preserving uniqueness.");
  }

  return { puzzle, topology };
}

export class CrossMathEngine implements CrossMathEngineApi {
  public static readonly version = "1.0.0";

  public generate(options: GeneratePuzzleOptions): GeneratedPuzzle {
    validateGenerateOptions(options);
    const maximumAttempts = options.maximumAttempts ?? 32;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const generationSeed = hashSeed(`${options.seed}:attempt:${attempt}`);
      try {
        const generated = buildUniquelySolvablePuzzle(options, generationSeed);
        const validation = validatePuzzle(generated.puzzle);
        if (!validation.valid) {
          throw new Error(
            `Generated puzzle failed validation: ${validation.issues
              .map((issue) => issue.message)
              .join(" ")}`,
          );
        }

        const verification = verifyUniqueSolution(generated.puzzle);
        if (!verification.unique) {
          throw new Error("Generated puzzle is not uniquely solvable.");
        }

        return {
          puzzle: generated.puzzle,
          topology: generated.topology,
          certification: certifyDifficulty(generated.puzzle),
          fingerprints: fingerprintPuzzle(generated.puzzle),
          generationSeed,
          attempts: attempt + 1,
        };
      } catch (error) {
        lastError = error;
      }
    }

    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `Unable to generate a certified puzzle after ${maximumAttempts} attempts: ${reason}`,
    );
  }

  public solve(
    puzzle: Puzzle,
    options: Parameters<typeof solvePuzzle>[1] = {},
  ): ReturnType<typeof solvePuzzle> {
    return solvePuzzle(puzzle, options);
  }

  public verify(puzzle: Puzzle): VerifyPuzzleResult {
    const validation = validatePuzzle(puzzle);
    if (!validation.valid) {
      return {
        valid: false,
        unique: false,
        issues: validation.issues.map((issue) => issue.message),
        verification: null,
      };
    }

    try {
      const verification = verifyUniqueSolution(puzzle);
      return {
        valid: true,
        unique: verification.unique,
        issues: verification.unique
          ? []
          : [`Expected one solution; found ${verification.solutionCount}.`],
        verification,
      };
    } catch (error) {
      return {
        valid: true,
        unique: false,
        issues: [error instanceof Error ? error.message : String(error)],
        verification: null,
      };
    }
  }

  public certify(puzzle: Puzzle): ReturnType<typeof certifyDifficulty> {
    return certifyDifficulty(puzzle);
  }

  public fingerprint(puzzle: Puzzle): ReturnType<typeof fingerprintPuzzle> {
    return fingerprintPuzzle(puzzle);
  }

  public exportLibrary(options: ExportLibraryOptions) {
    assertPositiveInteger(options.count, "count");
    const chunkSize = options.chunkSize ?? Math.min(100, options.count);
    assertPositiveInteger(chunkSize, "chunkSize");
    const maximumAttempts = options.maximumAttempts ?? options.count * 20;
    assertPositiveInteger(maximumAttempts, "maximumAttempts");

    return generateIndustrialLibrary(
      {
        rootSeed: options.rootSeed,
        count: options.count,
        chunkSize,
        maximumAttempts,
        checkpoint: options.checkpoint,
        rejectStructuralDuplicates: options.rejectStructuralDuplicates,
      },
      (attemptIndex, attemptSeed) => {
        const generated = this.generate({
          difficulty: options.difficulty,
          seed: attemptSeed,
          width: options.width,
          height: options.height,
          equationCount: options.equationCount,
          hiddenCellCount: options.hiddenCellCount,
          operators: options.operators,
          requireDistinctValues: options.requireDistinctValues,
          maximumAttempts: 16,
          topologyProfile: options.topologyProfile,
          id: `${options.idPrefix ?? "puzzle"}-${String(attemptIndex + 1).padStart(6, "0")}`,
        });
        return generated.puzzle;
      },
    );
  }
}

export const crossMathEngine = new CrossMathEngine();
