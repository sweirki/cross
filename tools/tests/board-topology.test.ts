import {
  buildBoardTopology,
  serializeBoardTopology,
  validateBoardTopology,
} from "../../src/game/board";
import type { BoardTopology } from "../../src/types/Topology";

function assert(condition: unknown, message: string): asserts condition {
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

function issueCodes(topology: BoardTopology): readonly string[] {
  return validateBoardTopology(topology).issues.map((entry) => entry.code);
}

const cross = () =>
  buildBoardTopology({
    width: 5,
    height: 5,
    equations: [
      {
        id: "eq-h",
        orientation: "horizontal",
        start: { row: 2, column: 0 },
        operator: "add",
      },
      {
        id: "eq-v",
        orientation: "vertical",
        start: { row: 0, column: 2 },
        operator: "multiply",
      },
    ],
  });

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "builds a valid crossed topology",
    () => {
      const result = validateBoardTopology(cross());
      assert(result.valid, JSON.stringify(result.issues));
    },
  ],
  [
    "shares exactly one number node",
    () => {
      const topology = cross();
      assertEqual(topology.nodes.length, 9, "Unexpected unique node count.");
      const shared = topology.nodes.find(
        (node) => node.position.row === 2 && node.position.column === 2,
      );
      assert(shared?.kind === "number", "Intersection must be a number.");
    },
  ],
  [
    "assigns stable node identifiers",
    () => {
      const topology = cross();
      assert(
        topology.nodes.some((node) => node.id === "node-r2-c2"),
        "Expected stable coordinate-derived ID.",
      );
    },
  ],
  [
    "serializes deterministically",
    () => {
      assertEqual(
        serializeBoardTopology(cross()),
        serializeBoardTopology(cross()),
        "Equivalent topology serialization differs.",
      );
    },
  ],
  [
    "rejects an operator intersection during construction",
    () => {
      let threw = false;
      try {
        buildBoardTopology({
          width: 5,
          height: 5,
          equations: [
            {
              id: "h",
              orientation: "horizontal",
              start: { row: 1, column: 0 },
              operator: "add",
            },
            {
              id: "v",
              orientation: "vertical",
              start: { row: 0, column: 1 },
              operator: "add",
            },
          ],
        });
      } catch {
        threw = true;
      }
      assert(threw, "Illegal intersection should throw.");
    },
  ],
  [
    "rejects equations outside board bounds",
    () => {
      let threw = false;
      try {
        buildBoardTopology({
          width: 4,
          height: 5,
          equations: [
            {
              id: "h",
              orientation: "horizontal",
              start: { row: 0, column: 0 },
              operator: "add",
            },
          ],
        });
      } catch {
        threw = true;
      }
      assert(threw, "Out-of-bounds equation should throw.");
    },
  ],
  [
    "detects disconnected equations",
    () => {
      const topology = buildBoardTopology({
        width: 9,
        height: 9,
        equations: [
          {
            id: "a",
            orientation: "horizontal",
            start: { row: 0, column: 0 },
            operator: "add",
          },
          {
            id: "b",
            orientation: "horizontal",
            start: { row: 8, column: 4 },
            operator: "subtract",
          },
        ],
      });
      assert(
        issueCodes(topology).includes("DISCONNECTED_EQUATION_GRAPH"),
        "Disconnected graph not detected.",
      );
    },
  ],
  [
    "requires a genuine intersection",
    () => {
      const topology = buildBoardTopology({
        width: 5,
        height: 5,
        equations: [
          {
            id: "only",
            orientation: "horizontal",
            start: { row: 0, column: 0 },
            operator: "add",
          },
        ],
      });
      assert(
        issueCodes(topology).includes("NO_GENUINE_INTERSECTION"),
        "Missing intersection not detected.",
      );
    },
  ],
  [
    "detects missing node references",
    () => {
      const topology = cross();
      const broken: BoardTopology = {
        ...topology,
        equations: [
          {
            ...topology.equations[0],
            nodeIds: [
              "missing",
              ...topology.equations[0].nodeIds.slice(1),
            ] as [string, string, string, string, string],
          },
          topology.equations[1],
        ],
      };
      assert(
        issueCodes(broken).includes("MISSING_NODE_REFERENCE"),
        "Missing node reference not detected.",
      );
    },
  ],
  [
    "detects invalid equation geometry",
    () => {
      const topology = cross();
      const first = topology.equations[0];
      const malformed: BoardTopology = {
        ...topology,
        equations: [
          {
            ...first,
            nodeIds: [
              first.nodeIds[0],
              first.nodeIds[1],
              first.nodeIds[2],
              first.nodeIds[4],
              first.nodeIds[3],
            ],
          },
          topology.equations[1],
        ],
      };
      assert(
        issueCodes(malformed).includes("INVALID_EQUATION_PATH"),
        "Invalid path geometry not detected.",
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
console.log(`${passed}/${tests.length} board-topology tests passed.`);
