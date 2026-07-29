import type {
  ArithmeticOperator,
  EquationId,
  EquationOrientation,
  GridPosition,
  NodeId,
} from "./Topology";

export type VariableId = string;

export interface EquationVariable {
  readonly id: VariableId;
  readonly nodeId: NodeId;
  readonly position: GridPosition;
  readonly equationIds: readonly EquationId[];
}

export interface EquationGraphEquation {
  readonly id: EquationId;
  readonly orientation: EquationOrientation;
  readonly operator: ArithmeticOperator;
  readonly leftVariableId: VariableId;
  readonly rightVariableId: VariableId;
  readonly resultVariableId: VariableId;
}

export interface EquationGraphIntersection {
  readonly variableId: VariableId;
  readonly equationIds: readonly [EquationId, EquationId];
}

export interface EquationGraph {
  readonly variables: readonly EquationVariable[];
  readonly equations: readonly EquationGraphEquation[];
  readonly intersections: readonly EquationGraphIntersection[];
}

export type EquationGraphValidationCode =
  | "DUPLICATE_VARIABLE_ID"
  | "DUPLICATE_EQUATION_ID"
  | "MISSING_VARIABLE_REFERENCE"
  | "INVALID_VARIABLE_PARTICIPATION"
  | "INVALID_INTERSECTION"
  | "DISCONNECTED_GRAPH";

export interface EquationGraphValidationIssue {
  readonly code: EquationGraphValidationCode;
  readonly message: string;
  readonly variableId?: VariableId;
  readonly equationId?: EquationId;
}

export interface EquationGraphValidationResult {
  readonly valid: boolean;
  readonly issues: readonly EquationGraphValidationIssue[];
}
