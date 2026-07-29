import { solvePuzzle } from "../solver";
import type { GameSession } from "../../types/Game";
import type { LogicalHint } from "../../types/RuntimeContent";
import type { NumberPuzzleCell } from "../../types/Cell";
import type { Puzzle } from "../../types/Puzzle";

export function getLogicalHint(puzzle: Puzzle, session: GameSession): LogicalHint | null {
  if (session.puzzleId !== puzzle.id) throw new Error("Session and puzzle do not match.");
  const solved = solvePuzzle(puzzle, { solutionLimit: 1, includeTrace: false });
  if (solved.firstSolution === null) return null;
  const solution = new Map(solved.firstSolution.map((item) => [item.cellId, item.value]));
  const editable = puzzle.cells
    .filter((cell): cell is NumberPuzzleCell => cell.kind === "number" && cell.editable)
    .sort((a, b) => a.id.localeCompare(b.id));
  const usedTiles = new Set(Object.values(session.placements));

  for (const cell of editable) {
    const expected = solution.get(cell.id);
    if (expected === undefined) continue;
    const placedId = session.placements[cell.id];
    const placedValue = puzzle.numberBank.find((tile) => tile.id === placedId)?.value;
    if (placedValue === expected) continue;
    const tile = [...puzzle.numberBank]
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((candidate) => candidate.value === expected && (!usedTiles.has(candidate.id) || candidate.id === placedId));
    if (tile === undefined) continue;
    const equationIds = puzzle.equations
      .filter((equation) => equation.cellIds.includes(cell.id))
      .map((equation) => equation.id)
      .sort();
    return {
      cellId: cell.id,
      value: expected,
      tileId: tile.id,
      equationIds,
      message: equationIds.length === 0
        ? `Place ${expected} in the highlighted cell.`
        : `Use ${expected} to satisfy ${equationIds.join(", ")}.`,
    };
  }
  return null;
}
