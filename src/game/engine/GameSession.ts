import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import { DEFAULT_ARITHMETIC_POLICY } from "../../engine/math/OperatorRules";
import type { NumberPuzzleCell } from "../../types/Cell";
import type {
  EquationFeedback,
  GameAction,
  GameSession,
  GameView,
  PersistedGameSession,
  RuntimeCellValue,
} from "../../types/Game";
import type { Puzzle } from "../../types/Puzzle";
import { validatePuzzle } from "../validation/PuzzleValidation";

const SYMBOL_TO_OPERATOR = {
  "+": "add",
  "-": "subtract",
  "×": "multiply",
  "÷": "divide",
} as const;

function assertPuzzle(puzzle: Puzzle): void {
  const validation = validatePuzzle(puzzle);
  if (!validation.valid) {
    throw new Error(`Cannot start invalid puzzle: ${JSON.stringify(validation.issues)}`);
  }
}

function editableCells(puzzle: Puzzle): readonly NumberPuzzleCell[] {
  return puzzle.cells.filter(
    (cell): cell is NumberPuzzleCell => cell.kind === "number" && cell.editable,
  );
}

function canonicalPlacements(
  placements: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(placements).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function createGameSession(puzzle: Puzzle): GameSession {
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

function assertSessionMatches(puzzle: Puzzle, session: GameSession): void {
  if (session.puzzleId !== puzzle.id) {
    throw new Error(`Session ${session.puzzleId} does not belong to puzzle ${puzzle.id}.`);
  }
}

function valueForCell(
  puzzle: Puzzle,
  session: GameSession,
  cellId: string,
): number | null {
  const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
  if (cell?.kind !== "number") return null;
  if (cell.given) return cell.value;
  const tileId = session.placements[cell.id];
  if (tileId === undefined) return null;
  return puzzle.numberBank.find((tile) => tile.id === tileId)?.value ?? null;
}

function equationFeedback(
  puzzle: Puzzle,
  session: GameSession,
): readonly EquationFeedback[] {
  return puzzle.equations.map((equation) => {
    const left = valueForCell(puzzle, session, equation.cellIds[0]);
    const right = valueForCell(puzzle, session, equation.cellIds[2]);
    const result = valueForCell(puzzle, session, equation.cellIds[4]);
    if (left === null || right === null || result === null) {
      return { equationId: equation.id, state: "incomplete" };
    }
    const arithmetic = applyArithmetic(
      SYMBOL_TO_OPERATOR[equation.operator],
      left,
      right,
      DEFAULT_ARITHMETIC_POLICY,
    );
    return {
      equationId: equation.id,
      state: arithmetic.ok && arithmetic.result === result ? "correct" : "incorrect",
    };
  });
}

function withCompletion(puzzle: Puzzle, session: GameSession): GameSession {
  const allFilled = editableCells(puzzle).every(
    (cell) => session.placements[cell.id] !== undefined,
  );
  const allCorrect = equationFeedback(puzzle, session).every(
    (equation) => equation.state === "correct",
  );
  return { ...session, completed: allFilled && allCorrect };
}

export function placeTile(
  puzzle: Puzzle,
  session: GameSession,
  cellId: string,
  tileId: string,
): GameSession {
  assertSessionMatches(puzzle, session);
  const cell = puzzle.cells.find((candidate) => candidate.id === cellId);
  if (cell?.kind !== "number" || !cell.editable) {
    throw new Error(`Cell ${cellId} is not editable.`);
  }
  if (!puzzle.numberBank.some((tile) => tile.id === tileId)) {
    throw new Error(`Unknown number-bank tile: ${tileId}.`);
  }

  const placements: Record<string, string> = { ...session.placements };
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

export function removeTile(
  puzzle: Puzzle,
  session: GameSession,
  cellId: string,
): GameSession {
  assertSessionMatches(puzzle, session);
  if (session.placements[cellId] === undefined) return session;
  const placements = { ...session.placements };
  delete placements[cellId];
  return withCompletion(puzzle, {
    ...session,
    placements: canonicalPlacements(placements),
    moves: session.moves + 1,
  });
}

export function applyHint(puzzle: Puzzle, session: GameSession): GameSession {
  assertSessionMatches(puzzle, session);
  const target = [...editableCells(puzzle)]
    .sort((left, right) => left.id.localeCompare(right.id))
    .find((cell) => valueForCell(puzzle, session, cell.id) !== cell.solution);
  if (target === undefined) return session;

  const tile = puzzle.numberBank
    .filter((candidate) => candidate.value === target.solution)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  if (tile === undefined) throw new Error(`No tile can satisfy hinted cell ${target.id}.`);

  const next = placeTile(puzzle, session, target.id, tile.id);
  return { ...next, hintsUsed: session.hintsUsed + 1 };
}

export function reduceGameSession(
  puzzle: Puzzle,
  session: GameSession,
  action: GameAction,
): GameSession {
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

export function buildGameView(puzzle: Puzzle, session: GameSession): GameView {
  assertSessionMatches(puzzle, session);
  const cells: RuntimeCellValue[] = puzzle.cells
    .filter((cell): cell is NumberPuzzleCell => cell.kind === "number")
    .map((cell): RuntimeCellValue => {
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

export function serializeGameSession(session: GameSession): string {
  return JSON.stringify({
    ...session,
    placements: canonicalPlacements(session.placements),
  });
}

export function restoreGameSession(
  puzzle: Puzzle,
  persisted: PersistedGameSession,
): GameSession {
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
  const seenTiles = new Set<string>();
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
