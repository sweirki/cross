"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossMathEngine = exports.CrossMathEngine = void 0;
const EquationGraphBuilder_1 = require("../../game/board/EquationGraphBuilder");
const TopologySkeletonGenerator_1 = require("../../game/board/TopologySkeletonGenerator");
const DifficultyCertifier_1 = require("../../game/difficulty/DifficultyCertifier");
const IndustrialPuzzleGenerator_1 = require("../../game/generator/IndustrialPuzzleGenerator");
const NumberSynthesizer_1 = require("../../game/generator/NumberSynthesizer");
const PuzzleBuilder_1 = require("../../game/generator/PuzzleBuilder");
const PuzzleFingerprint_1 = require("../../game/generator/PuzzleFingerprint");
const PuzzleSolver_1 = require("../../game/solver/PuzzleSolver");
const PuzzleValidation_1 = require("../../game/validation/PuzzleValidation");
const DeterministicRandom_1 = require("../random/DeterministicRandom");
const DEFAULT_OPERATORS = [
    "add",
    "subtract",
    "multiply",
    "divide",
];
const DEFAULTS = {
    easy: { width: 7, height: 7, equationCount: 2, hiddenRatio: 0.45 },
    medium: { width: 9, height: 9, equationCount: 3, hiddenRatio: 0.58 },
    hard: { width: 11, height: 11, equationCount: 4, hiddenRatio: 0.7 },
    expert: { width: 13, height: 13, equationCount: 5, hiddenRatio: 0.82 },
};
function assertPositiveInteger(value, name) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive safe integer.`);
    }
}
function validateGenerateOptions(options) {
    if (!Number.isSafeInteger(options.seed)) {
        throw new Error("seed must be a safe integer.");
    }
    if (options.width !== undefined)
        assertPositiveInteger(options.width, "width");
    if (options.height !== undefined)
        assertPositiveInteger(options.height, "height");
    if (options.equationCount !== undefined) {
        assertPositiveInteger(options.equationCount, "equationCount");
        if (options.equationCount < 2) {
            throw new Error("equationCount must be at least 2.");
        }
    }
    if (options.hiddenCellCount !== undefined && (!Number.isSafeInteger(options.hiddenCellCount) ||
        options.hiddenCellCount < 1)) {
        throw new Error("hiddenCellCount must be a positive safe integer.");
    }
    if (options.maximumAttempts !== undefined) {
        assertPositiveInteger(options.maximumAttempts, "maximumAttempts");
    }
    if (options.operators !== undefined && options.operators.length === 0) {
        throw new Error("operators must contain at least one operator.");
    }
    if (options.topologyProfile !== undefined &&
        options.topologyProfile !== "classic" &&
        options.topologyProfile !== "organic") {
        throw new Error(`Unknown topologyProfile: ${String(options.topologyProfile)}.`);
    }
}
function stablePuzzleId(options, generationSeed) {
    const requested = options.id?.trim();
    if (requested)
        return requested;
    return `cross-${options.difficulty}-${generationSeed.toString(16).padStart(8, "0")}`;
}
function hiddenTarget(variableCount, options) {
    const defaults = DEFAULTS[options.difficulty];
    return Math.min(variableCount, options.hiddenCellCount ??
        Math.max(1, Math.round(variableCount * defaults.hiddenRatio)));
}
function buildUniquelySolvablePuzzle(options, generationSeed) {
    const defaults = DEFAULTS[options.difficulty];
    const width = options.width ?? defaults.width;
    const height = options.height ?? defaults.height;
    const equationCount = options.equationCount ?? defaults.equationCount;
    const operators = options.operators ?? DEFAULT_OPERATORS;
    const random = new DeterministicRandom_1.DeterministicRandom(generationSeed);
    const skeleton = (0, TopologySkeletonGenerator_1.generateTopologySkeleton)({
        width,
        height,
        equationCount,
        seed: random.fork("topology").nextUint32(),
        profile: options.topologyProfile ?? "organic",
    });
    const topology = (0, TopologySkeletonGenerator_1.materializeTopologySkeleton)(skeleton, (equation, index) => {
        const operatorIndex = (0, DeterministicRandom_1.hashSeed)(`${generationSeed}:operator:${index}:${equation.id}`) % operators.length;
        return operators[operatorIndex];
    });
    const graph = (0, EquationGraphBuilder_1.buildEquationGraph)(topology);
    const synthesis = (0, NumberSynthesizer_1.synthesizeNumbers)(graph, {
        seed: random.fork("numbers").nextUint32(),
        requireDistinctValues: options.requireDistinctValues ?? false,
    });
    const orderedVariables = random
        .fork("visibility")
        .shuffle(graph.variables.map((variable) => variable.id));
    const visible = new Set(graph.variables.map((variable) => variable.id));
    const target = hiddenTarget(graph.variables.length, options);
    const puzzleId = stablePuzzleId(options, generationSeed);
    let puzzle = (0, PuzzleBuilder_1.createPuzzle)(topology, synthesis, {
        id: puzzleId,
        difficulty: options.difficulty,
        visibleVariableIds: [...visible].sort(),
    });
    let hidden = 0;
    for (const variableId of orderedVariables) {
        if (hidden >= target)
            break;
        visible.delete(variableId);
        const candidate = (0, PuzzleBuilder_1.createPuzzle)(topology, synthesis, {
            id: puzzleId,
            difficulty: options.difficulty,
            visibleVariableIds: [...visible].sort(),
        });
        const verification = (0, PuzzleSolver_1.verifyUniqueSolution)(candidate);
        if (verification.unique) {
            puzzle = candidate;
            hidden += 1;
        }
        else {
            visible.add(variableId);
        }
    }
    if (hidden === 0) {
        throw new Error("Could not hide any number while preserving uniqueness.");
    }
    return { puzzle, topology };
}
class CrossMathEngine {
    static version = "1.0.0";
    generate(options) {
        validateGenerateOptions(options);
        const maximumAttempts = options.maximumAttempts ?? 32;
        let lastError = null;
        for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
            const generationSeed = (0, DeterministicRandom_1.hashSeed)(`${options.seed}:attempt:${attempt}`);
            try {
                const generated = buildUniquelySolvablePuzzle(options, generationSeed);
                const validation = (0, PuzzleValidation_1.validatePuzzle)(generated.puzzle);
                if (!validation.valid) {
                    throw new Error(`Generated puzzle failed validation: ${validation.issues
                        .map((issue) => issue.message)
                        .join(" ")}`);
                }
                const verification = (0, PuzzleSolver_1.verifyUniqueSolution)(generated.puzzle);
                if (!verification.unique) {
                    throw new Error("Generated puzzle is not uniquely solvable.");
                }
                return {
                    puzzle: generated.puzzle,
                    topology: generated.topology,
                    certification: (0, DifficultyCertifier_1.certifyDifficulty)(generated.puzzle),
                    fingerprints: (0, PuzzleFingerprint_1.fingerprintPuzzle)(generated.puzzle),
                    generationSeed,
                    attempts: attempt + 1,
                };
            }
            catch (error) {
                lastError = error;
            }
        }
        const reason = lastError instanceof Error ? lastError.message : String(lastError);
        throw new Error(`Unable to generate a certified puzzle after ${maximumAttempts} attempts: ${reason}`);
    }
    solve(puzzle, options = {}) {
        return (0, PuzzleSolver_1.solvePuzzle)(puzzle, options);
    }
    verify(puzzle) {
        const validation = (0, PuzzleValidation_1.validatePuzzle)(puzzle);
        if (!validation.valid) {
            return {
                valid: false,
                unique: false,
                issues: validation.issues.map((issue) => issue.message),
                verification: null,
            };
        }
        try {
            const verification = (0, PuzzleSolver_1.verifyUniqueSolution)(puzzle);
            return {
                valid: true,
                unique: verification.unique,
                issues: verification.unique
                    ? []
                    : [`Expected one solution; found ${verification.solutionCount}.`],
                verification,
            };
        }
        catch (error) {
            return {
                valid: true,
                unique: false,
                issues: [error instanceof Error ? error.message : String(error)],
                verification: null,
            };
        }
    }
    certify(puzzle) {
        return (0, DifficultyCertifier_1.certifyDifficulty)(puzzle);
    }
    fingerprint(puzzle) {
        return (0, PuzzleFingerprint_1.fingerprintPuzzle)(puzzle);
    }
    exportLibrary(options) {
        assertPositiveInteger(options.count, "count");
        const chunkSize = options.chunkSize ?? Math.min(100, options.count);
        assertPositiveInteger(chunkSize, "chunkSize");
        const maximumAttempts = options.maximumAttempts ?? options.count * 20;
        assertPositiveInteger(maximumAttempts, "maximumAttempts");
        return (0, IndustrialPuzzleGenerator_1.generateIndustrialLibrary)({
            rootSeed: options.rootSeed,
            count: options.count,
            chunkSize,
            maximumAttempts,
            checkpoint: options.checkpoint,
            rejectStructuralDuplicates: options.rejectStructuralDuplicates,
        }, (attemptIndex, attemptSeed) => {
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
        });
    }
}
exports.CrossMathEngine = CrossMathEngine;
exports.crossMathEngine = new CrossMathEngine();
