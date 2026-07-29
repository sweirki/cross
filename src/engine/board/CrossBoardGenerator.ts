import {
  generateExpressionArray,
  type ExpressionGeneratorOptions,
  type GeneratedExpression,
} from "../math/ExpressionGenerator";
import type {
  BoardTopology,
  EquationPath,
  NodeId,
  TopologyNode,
} from "../../types/Topology";

export interface CrossBoardGenerationOptions
  extends ExpressionGeneratorOptions {
  readonly horizontalSharedSlot?: "left" | "right" | "result";
  readonly verticalSharedSlot?: "left" | "right" | "result";
}

export interface GeneratedCrossBoard {
  readonly topology: BoardTopology;
  readonly canonicalSolution: Readonly<Record<NodeId, number>>;
  readonly horizontalExpression: GeneratedExpression;
  readonly verticalExpression: GeneratedExpression;
  readonly sharedNodeId: NodeId;
}

type NumberSlot = "left" | "right" | "result";

const SLOT_TO_PATH_INDEX: Readonly<Record<NumberSlot, 0 | 2 | 4>> = {
  left: 0,
  right: 2,
  result: 4,
};

function slotValue(
  expression: GeneratedExpression,
  slot: NumberSlot,
): number {
  return expression[slot];
}

function createHorizontalNodes(
  expression: GeneratedExpression,
): readonly TopologyNode[] {
  return [
    {
      id: "n-h-left",
      kind: "number",
      position: { row: 2, column: 0 },
    },
    {
      id: "o-h",
      kind: "operator",
      operator: expression.operation,
      position: { row: 2, column: 1 },
    },
    {
      id: "n-h-right",
      kind: "number",
      position: { row: 2, column: 2 },
    },
    {
      id: "e-h",
      kind: "equals",
      position: { row: 2, column: 3 },
    },
    {
      id: "n-h-result",
      kind: "number",
      position: { row: 2, column: 4 },
    },
  ];
}

function horizontalNumberId(slot: NumberSlot): NodeId {
  switch (slot) {
    case "left":
      return "n-h-left";
    case "right":
      return "n-h-right";
    case "result":
      return "n-h-result";
  }
}

function coordinateForHorizontalSlot(
  slot: NumberSlot,
): { readonly row: number; readonly column: number } {
  return {
    row: 2,
    column: SLOT_TO_PATH_INDEX[slot],
  };
}

function createVerticalNodes(
  expression: GeneratedExpression,
  sharedNodeId: NodeId,
  sharedSlot: NumberSlot,
  column: number,
): readonly TopologyNode[] {
  const ids: readonly [NodeId, NodeId, NodeId, NodeId, NodeId] = [
    "n-v-left",
    "o-v",
    "n-v-right",
    "e-v",
    "n-v-result",
  ];

  return ids.flatMap((id, index): readonly TopologyNode[] => {
    if (index === SLOT_TO_PATH_INDEX[sharedSlot]) {
      return [];
    }

    if (index === 1) {
      return [
        {
          id,
          kind: "operator",
          operator: expression.operation,
          position: { row: index, column },
        },
      ];
    }

    if (index === 3) {
      return [
        {
          id,
          kind: "equals",
          position: { row: index, column },
        },
      ];
    }

    return [
      {
        id,
        kind: "number",
        position: { row: index, column },
      },
    ];
  });
}

function verticalPathNodeIds(
  sharedNodeId: NodeId,
  sharedSlot: NumberSlot,
): readonly [NodeId, NodeId, NodeId, NodeId, NodeId] {
  const ids: [NodeId, NodeId, NodeId, NodeId, NodeId] = [
    "n-v-left",
    "o-v",
    "n-v-right",
    "e-v",
    "n-v-result",
  ];

  ids[SLOT_TO_PATH_INDEX[sharedSlot]] = sharedNodeId;
  return ids;
}

function assignExpressionValues(
  target: Record<NodeId, number>,
  expression: GeneratedExpression,
  prefix: "h" | "v",
): void {
  target[`n-${prefix}-left`] = expression.left;
  target[`n-${prefix}-right`] = expression.right;
  target[`n-${prefix}-result`] = expression.result;
}

function chooseCompatiblePair(
  expressions: readonly GeneratedExpression[],
  horizontalSlot: NumberSlot,
  verticalSlot: NumberSlot,
): readonly [GeneratedExpression, GeneratedExpression] | null {
  for (const horizontal of expressions) {
    const sharedValue = slotValue(horizontal, horizontalSlot);

    for (const vertical of expressions) {
      if (slotValue(vertical, verticalSlot) === sharedValue) {
        return [horizontal, vertical];
      }
    }
  }

  return null;
}

export function generateCrossBoard(
  options: CrossBoardGenerationOptions,
): GeneratedCrossBoard {
  const horizontalSharedSlot = options.horizontalSharedSlot ?? "result";
  const verticalSharedSlot = options.verticalSharedSlot ?? "right";
  const expressions = generateExpressionArray(options);
  const pair = chooseCompatiblePair(
    expressions,
    horizontalSharedSlot,
    verticalSharedSlot,
  );

  if (pair === null) {
    throw new Error(
      "No compatible expression pair exists for the configured shared slots.",
    );
  }

  const [horizontalExpression, verticalExpression] = pair;
  const sharedNodeId = horizontalNumberId(horizontalSharedSlot);
  const sharedPosition = coordinateForHorizontalSlot(horizontalSharedSlot);

  const nodes = [
    ...createHorizontalNodes(horizontalExpression),
    ...createVerticalNodes(
      verticalExpression,
      sharedNodeId,
      verticalSharedSlot,
      sharedPosition.column,
    ),
  ];

  const horizontalNodeIds: readonly [
    NodeId,
    NodeId,
    NodeId,
    NodeId,
    NodeId,
  ] = ["n-h-left", "o-h", "n-h-right", "e-h", "n-h-result"];

  const equations: readonly EquationPath[] = [
    {
      id: "eq-horizontal",
      orientation: "horizontal",
      nodeIds: horizontalNodeIds,
    },
    {
      id: "eq-vertical",
      orientation: "vertical",
      nodeIds: verticalPathNodeIds(sharedNodeId, verticalSharedSlot),
    },
  ];

  const canonicalSolution: Record<NodeId, number> = {};
  assignExpressionValues(
    canonicalSolution,
    horizontalExpression,
    "h",
  );
  assignExpressionValues(canonicalSolution, verticalExpression, "v");
  canonicalSolution[sharedNodeId] = slotValue(
    horizontalExpression,
    horizontalSharedSlot,
  );

  delete canonicalSolution[
    verticalSharedSlot === "left"
      ? "n-v-left"
      : verticalSharedSlot === "right"
        ? "n-v-right"
        : "n-v-result"
  ];

  return {
    topology: {
      width: 5,
      height: 5,
      nodes,
      equations,
    },
    canonicalSolution,
    horizontalExpression,
    verticalExpression,
    sharedNodeId,
  };
}
