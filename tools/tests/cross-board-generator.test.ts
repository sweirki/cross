import { generateCrossBoard } from "../../src/engine/board/CrossBoardGenerator";
import { evaluateEquation } from "../../src/engine/math/EquationEvaluator";
import type {
  EquationPath,
  NodeId,
  NumberTopologyNode,
} from "../../src/types/Topology";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} Expected ${String(expected)}, received ${String(actual)}.`,
    );
  }
}

const options = {
  minimumOperand: 1,
  maximumOperand: 9,
  minimumTarget: 1,
  maximumTarget: 30,
} as const;

function numberNodeIds(equation: EquationPath): readonly [NodeId, NodeId, NodeId] {
  return [equation.nodeIds[0], equation.nodeIds[2], equation.nodeIds[4]];
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "generator creates a five-by-five crossed board",
    () => {
      const board = generateCrossBoard(options);
      assertEqual(board.topology.width, 5, "Unexpected board width.");
      assertEqual(board.topology.height, 5, "Unexpected board height.");
      assertEqual(board.topology.equations.length, 2, "Unexpected equation count.");
      assertEqual(board.topology.nodes.length, 9, "Unexpected unique node count.");
    },
  ],
  [
    "equations intersect at exactly one shared number node",
    () => {
      const board = generateCrossBoard(options);
      const [horizontal, vertical] = board.topology.equations;
      const shared = horizontal.nodeIds.filter((nodeId) =>
        vertical.nodeIds.includes(nodeId),
      );

      assertEqual(shared.length, 1, "Expected exactly one shared node.");
      assertEqual(shared[0], board.sharedNodeId, "Unexpected shared node.");

      const node = board.topology.nodes.find(
        (candidate) => candidate.id === board.sharedNodeId,
      );
      assert(node?.kind === "number", "Shared node must be a number node.");
    },
  ],
  [
    "all occupied coordinates are unique",
    () => {
      const board = generateCrossBoard(options);
      const coordinates = board.topology.nodes.map(
        (node) => `${node.position.row}:${node.position.column}`,
      );

      assertEqual(
        new Set(coordinates).size,
        coordinates.length,
        "Board contains duplicate occupied coordinates.",
      );
    },
  ],
  [
    "canonical solution covers every number node",
    () => {
      const board = generateCrossBoard(options);
      const numberNodes = board.topology.nodes.filter(
        (node): node is NumberTopologyNode => node.kind === "number",
      );

      assertEqual(
        Object.keys(board.canonicalSolution).length,
        numberNodes.length,
        "Canonical solution size does not match number-node count.",
      );

      for (const node of numberNodes) {
        assert(
          Number.isInteger(board.canonicalSolution[node.id]),
          `Missing integer solution for ${node.id}.`,
        );
      }
    },
  ],
  [
    "both assembled equations are mathematically valid",
    () => {
      const board = generateCrossBoard(options);

      for (const equation of board.topology.equations) {
        const [leftId, rightId, resultId] = numberNodeIds(equation);
        const operatorNode = board.topology.nodes.find(
          (node) => node.id === equation.nodeIds[1],
        );

        assert(operatorNode?.kind === "operator", "Missing operator node.");

        const evaluation = evaluateEquation(
          board.canonicalSolution[leftId],
          operatorNode.operator,
          board.canonicalSolution[rightId],
          board.canonicalSolution[resultId],
        );

        assert(evaluation.valid, `Equation ${equation.id} is invalid.`);
      }
    },
  ],
  [
    "generation is deterministic",
    () => {
      const first = JSON.stringify(generateCrossBoard(options));
      const second = JSON.stringify(generateCrossBoard(options));
      assertEqual(first, second, "Cross-board generation is not deterministic.");
    },
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  test();
  passed++;
  console.log(`PASS ${name}`);
}

console.log("");
console.log(`${passed}/${tests.length} cross-board-generator tests passed.`);
