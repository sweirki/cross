import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import { DEFAULT_ARITHMETIC_POLICY } from "../../engine/math/OperatorRules";
import type { Cell, NumberPuzzleCell } from "../../types/Cell";
import type { Equation } from "../../types/Equation";
import type { Puzzle } from "../../types/Puzzle";
import type {
  PuzzleSolverOptions,
  PuzzleSolverResult,
  SolverAssignment,
  SolverTraceEvent,
  UniqueSolutionVerification,
} from "../../types/Solver";

type ArithmeticOperation = "add" | "subtract" | "multiply" | "divide";

const SYMBOL_TO_OPERATION: Readonly<Record<Equation["operator"], ArithmeticOperation>> = {
  "+": "add",
  "-": "subtract",
  "×": "multiply",
  "÷": "divide",
};

interface SolverEquation {
  readonly id: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly resultId: string;
  readonly operation: ArithmeticOperation;
}

type SolverTraceEventInput = SolverTraceEvent extends infer Event
  ? Event extends { readonly step: number }
    ? Omit<Event, "step">
    : never
  : never;

interface SolverModel {
  readonly numberCells: readonly NumberPuzzleCell[];
  readonly hiddenCells: readonly NumberPuzzleCell[];
  readonly equations: readonly SolverEquation[];
  readonly equationByCell: ReadonlyMap<string, readonly SolverEquation[]>;
  readonly bankCounts: ReadonlyMap<number, number>;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new Error("solutionLimit must be a positive integer.");
  }
  return resolved;
}

function requireCell(
  cells: ReadonlyMap<string, Cell>,
  id: string,
  equationId: string,
): Cell {
  const cell = cells.get(id);
  if (cell === undefined) {
    throw new Error(`Equation ${equationId} references missing cell ${id}.`);
  }
  return cell;
}

function buildModel(puzzle: Puzzle): SolverModel {
  if (!Number.isInteger(puzzle.width) || puzzle.width <= 0 ||
      !Number.isInteger(puzzle.height) || puzzle.height <= 0) {
    throw new Error("Puzzle dimensions must be positive integers.");
  }

  const cells = new Map<string, Cell>();
  const positions = new Set<string>();
  for (const cell of puzzle.cells) {
    if (cells.has(cell.id)) throw new Error(`Duplicate cell ID: ${cell.id}.`);
    const positionKey = `${cell.position.row}:${cell.position.col}`;
    if (positions.has(positionKey)) {
      throw new Error(`Duplicate cell position: ${positionKey}.`);
    }
    if (cell.position.row < 0 || cell.position.row >= puzzle.height ||
        cell.position.col < 0 || cell.position.col >= puzzle.width) {
      throw new Error(`Cell ${cell.id} is outside the board.`);
    }
    cells.set(cell.id, cell);
    positions.add(positionKey);
  }

  const numberCells = [...cells.values()]
    .filter((cell): cell is NumberPuzzleCell => cell.kind === "number")
    .sort((left, right) => left.id.localeCompare(right.id));
  const hiddenCells = numberCells.filter((cell) => !cell.given);
  for (const cell of numberCells) {
    if (cell.given) {
      if (cell.value === null || !Number.isInteger(cell.value)) {
        throw new Error(`Given cell ${cell.id} must contain an integer value.`);
      }
    } else if (cell.value !== null) {
      throw new Error(`Hidden cell ${cell.id} must not contain a value.`);
    }
  }

  if (puzzle.numberBank.length !== hiddenCells.length) {
    throw new Error("Number bank must contain exactly one tile per hidden number cell.");
  }
  const tileIds = new Set<string>();
  const bankCounts = new Map<number, number>();
  for (const tile of puzzle.numberBank) {
    if (tileIds.has(tile.id)) throw new Error(`Duplicate number-bank tile ID: ${tile.id}.`);
    if (!Number.isInteger(tile.value)) throw new Error(`Number-bank tile ${tile.id} must be an integer.`);
    tileIds.add(tile.id);
    bankCounts.set(tile.value, (bankCounts.get(tile.value) ?? 0) + 1);
  }

  const equationIds = new Set<string>();
  const equations: SolverEquation[] = [];
  for (const equation of [...puzzle.equations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (equationIds.has(equation.id)) throw new Error(`Duplicate equation ID: ${equation.id}.`);
    equationIds.add(equation.id);
    const [leftId, operatorId, rightId, equalsId, resultId] = equation.cellIds;
    const left = requireCell(cells, leftId, equation.id);
    const operator = requireCell(cells, operatorId, equation.id);
    const right = requireCell(cells, rightId, equation.id);
    const equals = requireCell(cells, equalsId, equation.id);
    const result = requireCell(cells, resultId, equation.id);
    if (left.kind !== "number" || right.kind !== "number" || result.kind !== "number" ||
        operator.kind !== "operator" || equals.kind !== "equals" ||
        operator.operator !== equation.operator) {
      throw new Error(`Equation ${equation.id} has an invalid canonical path.`);
    }
    equations.push({
      id: equation.id,
      leftId,
      rightId,
      resultId,
      operation: SYMBOL_TO_OPERATION[equation.operator],
    });
  }

  const equationByCell = new Map<string, SolverEquation[]>();
  for (const equation of equations) {
    for (const id of [equation.leftId, equation.rightId, equation.resultId]) {
      const bucket = equationByCell.get(id) ?? [];
      bucket.push(equation);
      equationByCell.set(id, bucket);
    }
  }

  return {
    numberCells,
    hiddenCells,
    equations,
    equationByCell,
    bankCounts,
  };
}

function equationSatisfied(
  equation: SolverEquation,
  assignments: ReadonlyMap<string, number>,
): boolean {
  const left = assignments.get(equation.leftId);
  const right = assignments.get(equation.rightId);
  const result = assignments.get(equation.resultId);
  if (left === undefined || right === undefined || result === undefined) return true;
  const evaluated = applyArithmetic(
    equation.operation,
    left,
    right,
    DEFAULT_ARITHMETIC_POLICY,
  );
  return evaluated.ok && evaluated.result === result;
}

function decrement(
  counts: ReadonlyMap<number, number>,
  value: number,
): Map<number, number> | null {
  const count = counts.get(value) ?? 0;
  if (count <= 0) return null;
  const next = new Map(counts);
  if (count === 1) next.delete(value);
  else next.set(value, count - 1);
  return next;
}

function hasEquationSupport(
  equation: SolverEquation,
  assignments: ReadonlyMap<string, number>,
  counts: ReadonlyMap<number, number>,
): boolean {
  const ids = [equation.leftId, equation.rightId, equation.resultId] as const;
  const missing = ids.filter((id) => !assignments.has(id));
  if (missing.length === 0) return equationSatisfied(equation, assignments);

  const values = [...counts.keys()].sort((a, b) => a - b);
  const working = new Map(assignments);

  function visit(index: number, remaining: ReadonlyMap<number, number>): boolean {
    if (index === missing.length) return equationSatisfied(equation, working);
    const id = missing[index]!;
    for (const value of values) {
      const next = decrement(remaining, value);
      if (next === null) continue;
      working.set(id, value);
      if (visit(index + 1, next)) {
        working.delete(id);
        return true;
      }
      working.delete(id);
    }
    return false;
  }

  return visit(0, counts);
}

function candidateValues(
  cellId: string,
  assignments: ReadonlyMap<string, number>,
  counts: ReadonlyMap<number, number>,
  equations: readonly SolverEquation[],
): number[] {
  const candidates: number[] = [];
  for (const value of [...counts.keys()].sort((a, b) => a - b)) {
    const nextCounts = decrement(counts, value);
    if (nextCounts === null) continue;
    const nextAssignments = new Map(assignments);
    nextAssignments.set(cellId, value);
    if (equations.every((equation) =>
      hasEquationSupport(equation, nextAssignments, nextCounts))) {
      candidates.push(value);
    }
  }
  return candidates;
}

function canonicalSolution(
  cells: readonly NumberPuzzleCell[],
  assignments: ReadonlyMap<string, number>,
): readonly SolverAssignment[] {
  return cells
    .map((cell) => {
      const value = assignments.get(cell.id);
      if (value === undefined) throw new Error(`Missing solved value for ${cell.id}.`);
      return {
        cellId: cell.id,
        position: { row: cell.position.row, col: cell.position.col },
        value,
      };
    })
    .sort((left, right) => left.cellId.localeCompare(right.cellId));
}

export function solvePuzzle(
  puzzle: Puzzle,
  options: PuzzleSolverOptions = {},
): PuzzleSolverResult {
  const model = buildModel(puzzle);
  const solutionLimit = positiveInteger(options.solutionLimit, 2);
  const includeTrace = options.includeTrace ?? true;
  const trace: SolverTraceEvent[] = [];
  let step = 0;
  let visitedNodes = 0;
  let solutionCount = 0;
  let firstSolution: readonly SolverAssignment[] | null = null;
  let stoppedAtLimit = false;

  const initialAssignments = new Map<string, number>();
  for (const cell of model.numberCells) {
    if (cell.given) initialAssignments.set(cell.id, cell.value!);
  }

  function emit(event: SolverTraceEventInput): void {
    if (!includeTrace) return;
    step += 1;
    trace.push({ step, ...event } as SolverTraceEvent);
  }

  function search(
    assignments: ReadonlyMap<string, number>,
    counts: ReadonlyMap<number, number>,
  ): void {
    if (solutionCount >= solutionLimit) {
      stoppedAtLimit = true;
      return;
    }
    visitedNodes += 1;

    if (!model.equations.every((equation) =>
      hasEquationSupport(equation, assignments, counts))) {
      return;
    }

    const unresolved = model.hiddenCells.filter((cell) => !assignments.has(cell.id));
    if (unresolved.length === 0) {
      if (counts.size !== 0 ||
          !model.equations.every((equation) => equationSatisfied(equation, assignments))) {
        return;
      }
      solutionCount += 1;
      if (firstSolution === null) {
        firstSolution = canonicalSolution(model.numberCells, assignments);
      }
      emit({ kind: "solution", solutionIndex: solutionCount });
      return;
    }

    const ranked = unresolved
      .map((cell) => ({
        cell,
        candidates: candidateValues(
          cell.id,
          assignments,
          counts,
          model.equationByCell.get(cell.id) ?? [],
        ),
      }))
      .sort((left, right) =>
        left.candidates.length - right.candidates.length ||
        left.cell.id.localeCompare(right.cell.id));

    const selected = ranked[0]!;
    emit({
      kind: "select",
      cellId: selected.cell.id,
      candidates: selected.candidates,
    });

    for (const value of selected.candidates) {
      const nextCounts = decrement(counts, value);
      if (nextCounts === null) {
        emit({ kind: "reject", cellId: selected.cell.id, value, reason: "number-bank" });
        continue;
      }
      const nextAssignments = new Map(assignments);
      nextAssignments.set(selected.cell.id, value);
      emit({ kind: "assign", cellId: selected.cell.id, value });
      if ((model.equationByCell.get(selected.cell.id) ?? []).every((equation) =>
        hasEquationSupport(equation, nextAssignments, nextCounts))) {
        search(nextAssignments, nextCounts);
      } else {
        emit({ kind: "reject", cellId: selected.cell.id, value, reason: "equation" });
      }
      emit({ kind: "backtrack", cellId: selected.cell.id, value });
      if (solutionCount >= solutionLimit) {
        stoppedAtLimit = true;
        return;
      }
    }
  }

  search(initialAssignments, model.bankCounts);

  return {
    status: solutionCount === 0 ? "unsolved" : solutionCount >= 2 ? "multiple" : stoppedAtLimit ? "indeterminate" : "unique",
    solutionCount,
    searchExhausted: !stoppedAtLimit,
    firstSolution,
    trace,
    visitedNodes,
  };
}

export function verifyUniqueSolution(
  puzzle: Puzzle,
  options: Omit<PuzzleSolverOptions, "solutionLimit"> = {},
): UniqueSolutionVerification {
  const result = solvePuzzle(puzzle, { ...options, solutionLimit: 2 });
  return {
    unique: result.status === "unique" && result.searchExhausted,
    solutionCount: result.solutionCount,
    firstSolution: result.firstSolution,
    trace: result.trace,
    visitedNodes: result.visitedNodes,
  };
}
