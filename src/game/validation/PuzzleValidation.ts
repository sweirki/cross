import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import { DEFAULT_ARITHMETIC_POLICY } from "../../engine/math/OperatorRules";
import type { Puzzle } from "../../types/Puzzle";
import type {
  PuzzleValidationCode,
  PuzzleValidationIssue,
  PuzzleValidationResult,
} from "../../types/PuzzleCreation";

function issue(
  code: PuzzleValidationCode,
  message: string,
  context: Pick<PuzzleValidationIssue, "cellId" | "equationId"> = {},
): PuzzleValidationIssue {
  return { code, message, ...context };
}

const SYMBOL_TO_OPERATOR = {
  "+": "add",
  "-": "subtract",
  "×": "multiply",
  "÷": "divide",
} as const;

export function validatePuzzle(puzzle: Puzzle): PuzzleValidationResult {
  const issues: PuzzleValidationIssue[] = [];
  if (!Number.isInteger(puzzle.width) || puzzle.width <= 0 ||
      !Number.isInteger(puzzle.height) || puzzle.height <= 0) {
    issues.push(issue("INVALID_DIMENSIONS", "Puzzle dimensions must be positive integers."));
  }

  const cells = new Map<string, Puzzle["cells"][number]>();
  const positions = new Set<string>();
  for (const cell of puzzle.cells) {
    if (cells.has(cell.id)) issues.push(issue("DUPLICATE_CELL_ID", `Duplicate cell ID: ${cell.id}.`, { cellId: cell.id }));
    cells.set(cell.id, cell);
    const key = `${cell.position.row}:${cell.position.col}`;
    if (positions.has(key)) issues.push(issue("DUPLICATE_POSITION", `Duplicate cell position: ${key}.`, { cellId: cell.id }));
    positions.add(key);
    if (cell.position.row < 0 || cell.position.row >= puzzle.height ||
        cell.position.col < 0 || cell.position.col >= puzzle.width) {
      issues.push(issue("OUT_OF_BOUNDS_CELL", `Cell ${cell.id} is outside the board.`, { cellId: cell.id }));
    }
    if (cell.kind === "number" &&
        (cell.given === cell.editable || (cell.given && cell.value !== cell.solution) ||
         (!cell.given && cell.value !== null))) {
      issues.push(issue("INVALID_CELL_STATE", `Number cell ${cell.id} has inconsistent state.`, { cellId: cell.id }));
    }
  }

  const equationIds = new Set<string>();
  for (const equation of puzzle.equations) {
    if (equationIds.has(equation.id)) issues.push(issue("DUPLICATE_EQUATION_ID", `Duplicate equation ID: ${equation.id}.`, { equationId: equation.id }));
    equationIds.add(equation.id);
    const path = equation.cellIds.map((id) => cells.get(id));
    if (path.some((cell) => cell === undefined)) {
      issues.push(issue("MISSING_CELL_REFERENCE", `Equation ${equation.id} references a missing cell.`, { equationId: equation.id }));
      continue;
    }
    const [left, op, right, equals, result] = path;
    if (left?.kind !== "number" || op?.kind !== "operator" || right?.kind !== "number" ||
        equals?.kind !== "equals" || result?.kind !== "number" || op.operator !== equation.operator) {
      issues.push(issue("INVALID_EQUATION_PATH", `Equation ${equation.id} has an invalid canonical path.`, { equationId: equation.id }));
      continue;
    }
    const arithmetic = applyArithmetic(
      SYMBOL_TO_OPERATOR[equation.operator],
      left.solution,
      right.solution,
      DEFAULT_ARITHMETIC_POLICY,
    );
    if (!arithmetic.ok || arithmetic.result !== result.solution) {
      issues.push(issue("INVALID_EQUATION", `Equation ${equation.id} is not satisfied.`, { equationId: equation.id }));
    }
  }

  const hiddenValues = puzzle.cells
    .flatMap((cell) => cell.kind === "number" && !cell.given ? [cell.solution] : [])
    .sort((a, b) => a - b);
  const bankValues = puzzle.numberBank.map((tile) => tile.value).sort((a, b) => a - b);
  const tileIds = new Set(puzzle.numberBank.map((tile) => tile.id));
  if (tileIds.size !== puzzle.numberBank.length ||
      JSON.stringify(hiddenValues) !== JSON.stringify(bankValues)) {
    issues.push(issue("INVALID_NUMBER_BANK", "Number bank must contain exactly one tile for every hidden number cell."));
  }

  return { valid: issues.length === 0, issues };
}
