export type NodeId = string;
export type EquationId = string;

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export type ArithmeticOperator =
  | "add"
  | "subtract"
  | "multiply"
  | "divide";

export type TopologyNodeKind =
  | "number"
  | "operator"
  | "equals";

export type EquationOrientation =
  | "horizontal"
  | "vertical";

export interface NumberTopologyNode {
  readonly id: NodeId;
  readonly kind: "number";
  readonly position: GridPosition;
}

export interface OperatorTopologyNode {
  readonly id: NodeId;
  readonly kind: "operator";
  readonly position: GridPosition;
  readonly operator: ArithmeticOperator;
}

export interface EqualsTopologyNode {
  readonly id: NodeId;
  readonly kind: "equals";
  readonly position: GridPosition;
}

export type TopologyNode =
  | NumberTopologyNode
  | OperatorTopologyNode
  | EqualsTopologyNode;

export interface EquationPath {
  readonly id: EquationId;
  readonly orientation: EquationOrientation;

  /**
   * Ordered canonical path:
   * number, operator, number, equals, number
   */
  readonly nodeIds: readonly [
    NodeId,
    NodeId,
    NodeId,
    NodeId,
    NodeId,
  ];
}

export interface BoardTopology {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly TopologyNode[];
  readonly equations: readonly EquationPath[];
}
