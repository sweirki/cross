"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPuzzleLibrary = createPuzzleLibrary;
exports.validatePuzzleLibrary = validatePuzzleLibrary;
exports.parsePuzzleLibrary = parsePuzzleLibrary;
exports.selectPuzzle = selectPuzzle;
const PuzzleValidation_1 = require("../game/validation/PuzzleValidation");
function createPuzzleLibrary(input) {
    const puzzles = [...input.records]
        .sort((left, right) => left.puzzle.id.localeCompare(right.puzzle.id))
        .map((record) => record.puzzle);
    return validatePuzzleLibrary({
        schemaVersion: 1,
        id: input.id,
        puzzles,
        ...(input.manifest === undefined ? {} : { manifest: input.manifest }),
    });
}
function validatePuzzleLibrary(value) {
    if (value.schemaVersion !== 1 || value.id.trim().length === 0) {
        throw new Error("Puzzle library metadata is invalid.");
    }
    const ids = new Set();
    for (const puzzle of value.puzzles) {
        if (ids.has(puzzle.id))
            throw new Error(`Duplicate puzzle ID: ${puzzle.id}.`);
        ids.add(puzzle.id);
        const result = (0, PuzzleValidation_1.validatePuzzle)(puzzle);
        if (!result.valid) {
            throw new Error(`Invalid puzzle ${puzzle.id}: ${JSON.stringify(result.issues)}`);
        }
    }
    return value;
}
function parsePuzzleLibrary(json) {
    return validatePuzzleLibrary(JSON.parse(json));
}
function selectPuzzle(library, options = {}) {
    const candidates = options.difficulty === undefined
        ? library.puzzles
        : library.puzzles.filter((puzzle) => puzzle.difficulty === options.difficulty);
    const puzzle = options.id === undefined
        ? candidates[options.index ?? 0]
        : candidates.find((candidate) => candidate.id === options.id);
    if (puzzle === undefined)
        throw new Error("No puzzle matches the requested selection.");
    return puzzle;
}
