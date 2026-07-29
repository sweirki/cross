"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameSession = createGameSession;
exports.placeTile = placeTile;
exports.removeTile = removeTile;
exports.applyHint = applyHint;
exports.reduceGameSession = reduceGameSession;
exports.buildGameView = buildGameView;
exports.serializeGameSession = serializeGameSession;
exports.restoreGameSession = restoreGameSession;
const ArithmeticEngine_1 = require("../../engine/math/ArithmeticEngine");
const OperatorRules_1 = require("../../engine/math/OperatorRules");
const PuzzleValidation_1 = require("../validation/PuzzleValidation");
const SYMBOL_TO_OPERATOR = {
    "+": "add",
    "-": "subtract",
    "×": "multiply",
    "÷": "divide",
};
function assertPuzzle(puzzle) {
    const validation = (0, PuzzleValidation_1.validatePuzzle)(puzzle);
    if (!validation.valid) {
        throw new Error(`Cannot start invalid puzzle: ${JSON.stringify(validation.issues)}`);
    }
}
function editableCells(puzzle) {
    return puzzle.cells.filter((cell) => cell.kind === "number" && cell.editable);
}
function canonicalPlacements(placements) {
    return Object.fromEntries(Object.entries(placements).sort(([left], [right]) => left.localeCompare(right)));
}
function createGameSession(puzzle) {
    assertPuzzle(puzzle);
    return {
        schemaVersion: 1,
        puzzleId: puzzle.id,
        placements: {},
        moves: 0,
        hintsUsed: 0,
        completed: editableCells(puzzle).length === 0,
    };
}
function assertSessionMatches(puzzle, session) {
    if (session.puzzleId !== puzzle.id) {
        throw new Error(`Session ${session.puzzleId} does not belong to puzzle ${puzzle.id}.`);
    }
}
function valueForCell(puzzle, session, cellId) {
    const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
    if (cell?.kind !== "number")
        return null;
    if (cell.given)
        return cell.value;
    const tileId = session.placements[cell.id];
    if (tileId === undefined)
        return null;
    return puzzle.numberBank.find((tile) => tile.id === tileId)?.value ?? null;
}
function equationFeedback(puzzle, session) {
    return puzzle.equations.map((equation) => {
        const left = valueForCell(puzzle, session, equation.cellIds[0]);
        const right = valueForCell(puzzle, session, equation.cellIds[2]);
        const result = valueForCell(puzzle, session, equation.cellIds[4]);
        if (left === null || right === null || result === null) {
            return { equationId: equation.id, state: "incomplete" };
        }
        const arithmetic = (0, ArithmeticEngine_1.applyArithmetic)(SYMBOL_TO_OPERATOR[equation.operator], left, right, OperatorRules_1.DEFAULT_ARITHMETIC_POLICY);
        return {
            equationId: equation.id,
            state: arithmetic.ok && arithmetic.result === result ? "correct" : "incorrect",
        };
    });
}
function withCompletion(puzzle, session) {
    const allFilled = editableCells(puzzle).every((cell) => session.placements[cell.id] !== undefined);
    const allCorrect = equationFeedback(puzzle, session).every((equation) => equation.state === "correct");
    return { ...session, completed: allFilled && allCorrect };
}
function placeTile(puzzle, session, cellId, tileId) {
    assertSessionMatches(puzzle, session);
    const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
    if (cell?.kind !== "number" || !cell.editable) {
        throw new Error(`Cell ${cellId} is not editable.`);
    }
    if (!puzzle.numberBank.some((tile) => tile.id === tileId)) {
        throw new Error(`Unknown number-bank tile: ${tileId}.`);
    }
    const placements = { ...session.placements };
    for (const [placedCellId, placedTileId] of Object.entries(placements)) {
        if (placedTileId === tileId && placedCellId !== cellId) {
            delete placements[placedCellId];
        }
    }
    placements[cellId] = tileId;
    return withCompletion(puzzle, {
        ...session,
        placements: canonicalPlacements(placements),
        moves: session.moves + 1,
    });
}
function removeTile(puzzle, session, cellId) {
    assertSessionMatches(puzzle, session);
    if (session.placements[cellId] === undefined)
        return session;
    const placements = { ...session.placements };
    delete placements[cellId];
    return withCompletion(puzzle, {
        ...session,
        placements: canonicalPlacements(placements),
        moves: session.moves + 1,
    });
}
function applyHint(puzzle, session) {
    assertSessionMatches(puzzle, session);
    const target = [...editableCells(puzzle)]
        .sort((left, right) => left.id.localeCompare(right.id))
        .find((cell) => valueForCell(puzzle, session, cell.id) !== cell.solution);
    if (target === undefined)
        return session;
    const tile = puzzle.numberBank
        .filter((candidate) => candidate.value === target.solution)
        .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (tile === undefined)
        throw new Error(`No tile can satisfy hinted cell ${target.id}.`);
    const next = placeTile(puzzle, session, target.id, tile.id);
    return { ...next, hintsUsed: session.hintsUsed + 1 };
}
function reduceGameSession(puzzle, session, action) {
    switch (action.type) {
        case "place":
            return placeTile(puzzle, session, action.cellId, action.tileId);
        case "remove":
            return removeTile(puzzle, session, action.cellId);
        case "hint":
            return applyHint(puzzle, session);
        case "reset":
            return createGameSession(puzzle);
    }
}
function buildGameView(puzzle, session) {
    assertSessionMatches(puzzle, session);
    const cells = puzzle.cells
        .filter((cell) => cell.kind === "number")
        .map((cell) => {
        if (cell.given) {
            return { cellId: cell.id, value: cell.value, source: "given" };
        }
        const tileId = session.placements[cell.id];
        const tile = tileId === undefined
            ? undefined
            : puzzle.numberBank.find((candidate) => candidate.id === tileId);
        return tile === undefined
            ? { cellId: cell.id, value: null, source: "empty" }
            : { cellId: cell.id, value: tile.value, source: "tile", tileId: tile.id };
    })
        .sort((left, right) => left.cellId.localeCompare(right.cellId));
    const used = new Set(Object.values(session.placements));
    return {
        puzzle,
        session,
        cells,
        equations: equationFeedback(puzzle, session),
        availableTileIds: puzzle.numberBank
            .filter((tile) => !used.has(tile.id))
            .map((tile) => tile.id),
    };
}
function serializeGameSession(session) {
    return JSON.stringify({
        ...session,
        placements: canonicalPlacements(session.placements),
    });
}
function restoreGameSession(puzzle, persisted) {
    assertPuzzle(puzzle);
    if (persisted.schemaVersion !== 1 || persisted.puzzleId !== puzzle.id) {
        throw new Error("Saved session is incompatible with this puzzle.");
    }
    if (!Number.isInteger(persisted.moves) || persisted.moves < 0 ||
        !Number.isInteger(persisted.hintsUsed) || persisted.hintsUsed < 0) {
        throw new Error("Saved session counters are invalid.");
    }
    const editable = new Set(editableCells(puzzle).map((cell) => cell.id));
    const tiles = new Set(puzzle.numberBank.map((tile) => tile.id));
    const seenTiles = new Set();
    for (const [cellId, tileId] of Object.entries(persisted.placements)) {
        if (!editable.has(cellId) || !tiles.has(tileId) || seenTiles.has(tileId)) {
            throw new Error("Saved session contains an invalid placement.");
        }
        seenTiles.add(tileId);
    }
    return withCompletion(puzzle, {
        schemaVersion: 1,
        puzzleId: puzzle.id,
        placements: canonicalPlacements(persisted.placements),
        moves: persisted.moves,
        hintsUsed: persisted.hintsUsed,
        completed: false,
    });
}
