import {
  buildEquationGraph,
  generateTopologySkeleton,
  materializeTopologySkeleton,
  serializeEquationGraph,
  validateEquationGraph,
} from "../../src/game/board";
import type { EquationGraph } from "../../src/types/EquationGraph";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} Expected ${String(expected)}, received ${String(actual)}.`,
    );
  }
}

function graph(seed = 12345, equationCount = 4): EquationGraph {
  const skeleton = generateTopologySkeleton({
    width: 9,
    height: 9,
    equationCount,
    seed,
  });
  return buildEquationGraph(
    materializeTopologySkeleton(
      skeleton,
      (_equation, index) => (index % 2 === 0 ? "add" : "multiply"),
    ),
  );
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "creates one graph equation per topology equation",
    () => assertEqual(graph().equations.length, 4, "Equation count mismatch."),
  ],
  [
    "creates variables only for number nodes",
    () => {
      const value = graph();
      assert(
        value.variables.every((variable) => variable.id.startsWith("var-node-")),
        "Variable IDs must derive from number node IDs.",
      );
      assertEqual(
        value.variables.length,
        9,
        "Four equations with three single intersections should have nine variables.",
      );
    },
  ],
  [
    "preserves ordered equation roles and operators",
    () => {
      const first = graph().equations[0];
      assert(first !== undefined, "Missing first equation.");
      assert(first.leftVariableId !== first.rightVariableId, "Operands collapsed.");
      assertEqual(first.operator, "add", "Operator was not preserved.");
    },
  ],
  [
    "creates a stable edge for every shared variable",
    () => {
      const value = graph();
      assertEqual(value.intersections.length, 3, "Intersection count mismatch.");
      assert(
        value.intersections.every(
          (intersection) => intersection.equationIds[0] < intersection.equationIds[1],
        ),
        "Intersection equation IDs are not canonical.",
      );
    },
  ],
  [
    "produces a valid connected equation graph",
    () => {
      const result = validateEquationGraph(graph());
      assert(result.valid, JSON.stringify(result.issues));
    },
  ],
  [
    "serializes deterministically",
    () => {
      assertEqual(
        serializeEquationGraph(graph()),
        serializeEquationGraph(graph()),
        "Equivalent graphs serialized differently.",
      );
    },
  ],
  [
    "detects missing variable references",
    () => {
      const value = graph();
      const broken: EquationGraph = {
        ...value,
        equations: [
          { ...value.equations[0], leftVariableId: "missing" },
          ...value.equations.slice(1),
        ],
      };
      assert(
        validateEquationGraph(broken).issues.some(
          (issue) => issue.code === "MISSING_VARIABLE_REFERENCE",
        ),
        "Missing variable reference was not detected.",
      );
    },
  ],
  [
    "detects a disconnected graph",
    () => {
      const value = graph();
      const broken: EquationGraph = { ...value, intersections: [] };
      assert(
        validateEquationGraph(broken).issues.some(
          (issue) => issue.code === "DISCONNECTED_GRAPH",
        ),
        "Disconnected graph was not detected.",
      );
    },
  ],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} equation-graph tests passed.`);
