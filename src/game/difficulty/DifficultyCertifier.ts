import type { NumberPuzzleCell } from "../../types/Cell";
import type {
  DifficultyCertification,
  DifficultyMetricVector,
} from "../../types/DifficultyCertification";
import type { DifficultyTier } from "../../types/Difficulty";
import type { Puzzle } from "../../types/Puzzle";
import type { SolverTraceEvent } from "../../types/Solver";
import { solvePuzzle } from "../solver/PuzzleSolver";

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function tierForScore(score: number): DifficultyTier {
  if (score < 20) return "easy";
  if (score < 40) return "medium";
  if (score < 65) return "hard";
  return "expert";
}

function stableFingerprint(value: string): string {
  // Two independent 32-bit FNV-1a streams provide a compact stable identifier.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x01000193);
  }
  return `difficulty-v1-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function maximumDecisionDepth(trace: readonly SolverTraceEvent[]): number {
  let depth = 0;
  let maximum = 0;
  for (const event of trace) {
    if (event.kind === "assign") {
      depth += 1;
      maximum = Math.max(maximum, depth);
    } else if (event.kind === "backtrack") {
      depth = Math.max(0, depth - 1);
    }
  }
  return maximum;
}

function metricVector(
  puzzle: Puzzle,
  trace: readonly SolverTraceEvent[],
): DifficultyMetricVector {
  const selections = trace.filter(
    (event): event is Extract<SolverTraceEvent, { readonly kind: "select" }> =>
      event.kind === "select",
  );
  const hiddenCount = puzzle.cells.filter(
    (cell): cell is NumberPuzzleCell => cell.kind === "number" && !cell.given,
  ).length;
  const widths = selections.map((event) => event.candidates.length);
  const forced = widths.filter((width) => width === 1).length;
  const meanWidth = widths.length === 0
    ? 0
    : widths.reduce((sum, width) => sum + width, 0) / widths.length;
  const startingChoices = Math.max(1, new Set(puzzle.numberBank.map((tile) => tile.value)).size);
  const information = widths.length === 0
    ? 0
    : widths.reduce(
        (sum, width) => sum + Math.max(0, Math.log2(startingChoices / Math.max(1, width))),
        0,
      ) / widths.length;

  const characteristics = new Set<string>();
  if (forced > 0) characteristics.add("forced");
  if (widths.some((width) => width > 1)) characteristics.add("branch");
  if (puzzle.numberBank.length !== startingChoices) characteristics.add("multiplicity");
  const numberParticipation = new Map<string, number>();
  for (const equation of puzzle.equations) {
    for (const cellId of [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]]) {
      numberParticipation.set(cellId, (numberParticipation.get(cellId) ?? 0) + 1);
    }
  }
  if ([...numberParticipation.values()].some((count) => count > 1)) {
    characteristics.add("intersection");
  }

  return {
    proofDepth: maximumDecisionDepth(trace),
    proofWidth: widths.length === 0 ? 0 : Math.max(...widths),
    deductionCount: forced,
    techniqueDiversity: characteristics.size,
    branchingFactor: round(meanWidth),
    informationGain: round(information),
    constraintDensity: round(puzzle.equations.length / Math.max(1, hiddenCount)),
  };
}

function difficultyScore(
  puzzle: Puzzle,
  metrics: DifficultyMetricVector,
  visitedNodes: number,
): number {
  const hiddenCount = puzzle.cells.filter(
    (cell) => cell.kind === "number" && !cell.given,
  ).length;
  const selections = Math.max(1, metrics.deductionCount + (
    metrics.branchingFactor > 1 ? Math.max(1, metrics.proofDepth - metrics.deductionCount) : 0
  ));
  const forcedRatio = Math.min(1, metrics.deductionCount / selections);
  const raw =
    hiddenCount * 1.5 +
    puzzle.equations.length * 2 +
    Math.max(0, metrics.proofDepth - 1) * 3 +
    Math.max(0, metrics.proofWidth - 1) * 7 +
    Math.max(0, metrics.branchingFactor - 1) * 8 +
    Math.max(0, visitedNodes - 1) * 0.35 +
    (1 - forcedRatio) * 8 +
    Math.max(0, metrics.techniqueDiversity - 1) * 2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function certifyDifficulty(puzzle: Puzzle): DifficultyCertification {
  const solved = solvePuzzle(puzzle, { solutionLimit: 2, includeTrace: true });
  if (solved.status !== "unique" || !solved.searchExhausted) {
    throw new Error(
      `Difficulty certification requires a proven unique puzzle; solver status was ${solved.status}.`,
    );
  }

  const metrics = metricVector(puzzle, solved.trace);
  const score = difficultyScore(puzzle, metrics, solved.visitedNodes);
  const hiddenCellCount = puzzle.cells.filter(
    (cell) => cell.kind === "number" && !cell.given,
  ).length;
  const selections = solved.trace.filter((event) => event.kind === "select");
  const forcedMoveCount = selections.filter(
    (event) => event.kind === "select" && event.candidates.length === 1,
  ).length;
  const branchPointCount = selections.length - forcedMoveCount;

  const payload = JSON.stringify({
    version: 1,
    puzzleId: puzzle.id,
    requestedTier: puzzle.difficulty,
    score,
    metrics,
    evidence: {
      hiddenCellCount,
      equationCount: puzzle.equations.length,
      forcedMoveCount,
      branchPointCount,
      visitedSearchNodes: solved.visitedNodes,
      traceEventCount: solved.trace.length,
    },
    trace: solved.trace,
  });

  return {
    certificationVersion: 1,
    requestedTier: puzzle.difficulty,
    certifiedTier: tierForScore(score),
    score,
    unique: true,
    metrics,
    evidence: {
      hiddenCellCount,
      equationCount: puzzle.equations.length,
      forcedMoveCount,
      branchPointCount,
      visitedSearchNodes: solved.visitedNodes,
      traceEventCount: solved.trace.length,
    },
    fingerprint: stableFingerprint(payload),
  };
}
