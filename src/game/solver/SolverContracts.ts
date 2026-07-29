import type {
  BoardTopology,
  NodeId,
} from "../../types/Topology";
import type {
  SolveResult,
  SolverLimits,
  SolverMode,
} from "../../types/Solver";

export interface SolverNumberTile {
  readonly id: string;
  readonly value: number;
}

export interface SolverPuzzleInput {
  readonly puzzleId: string;
  readonly puzzleFingerprint: string;
  readonly topology: BoardTopology;
  readonly givenValues: Readonly<Record<NodeId, number>>;
  readonly hiddenNodeIds: readonly NodeId[];
  readonly numberBank: readonly SolverNumberTile[];
  readonly minimumValue: number;
  readonly maximumValue: number;
}

export interface SolveRequest {
  readonly mode: SolverMode;
  readonly puzzle: SolverPuzzleInput;
  readonly limits: SolverLimits;
}

export interface CrossSolver {
  readonly version: string;
  solve(request: SolveRequest): SolveResult;
}
