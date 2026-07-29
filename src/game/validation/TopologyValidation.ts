import type {
  BoardTopology,
  EquationId,
  NodeId,
} from "../../types/Topology";

export type TopologyValidationCode =
  | "INVALID_DIMENSIONS"
  | "DUPLICATE_NODE_ID"
  | "DUPLICATE_EQUATION_ID"
  | "POSITION_OUT_OF_BOUNDS"
  | "DUPLICATE_POSITION"
  | "MISSING_NODE_REFERENCE"
  | "INVALID_EQUATION_PATTERN"
  | "INVALID_EQUATION_PATH"
  | "ILLEGAL_INTERSECTION"
  | "NODE_PARTICIPATION_EXCEEDED"
  | "DISCONNECTED_EQUATION_GRAPH"
  | "NO_GENUINE_INTERSECTION";

export interface TopologyValidationIssue {
  readonly code: TopologyValidationCode;
  readonly message: string;
  readonly nodeId?: NodeId;
  readonly equationId?: EquationId;
}

export interface TopologyValidationResult {
  readonly valid: boolean;
  readonly issues: readonly TopologyValidationIssue[];
}

export interface TopologyValidator {
  validate(topology: BoardTopology): TopologyValidationResult;
}
