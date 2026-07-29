import {
  generateTopologySkeleton,
  materializeTopologySkeleton,
  serializeTopologySkeleton,
  validateBoardTopology,
} from "../../src/game/board";

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

function generate(seed = 12345, equationCount = 4) {
  return generateTopologySkeleton({
    width: 9,
    height: 9,
    equationCount,
    seed,
  });
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "generates the requested equation count",
    () => {
      assertEqual(generate().equations.length, 4, "Unexpected equation count.");
    },
  ],
  [
    "is deterministic for identical requests",
    () => {
      assertEqual(
        serializeTopologySkeleton(generate()),
        serializeTopologySkeleton(generate()),
        "Identical seeds produced different skeletons.",
      );
    },
  ],
  [
    "uses stable sequential equation identifiers",
    () => {
      const ids = generate().equations.map((equation) => equation.id).join(",");
      assertEqual(ids, "eq-0001,eq-0002,eq-0003,eq-0004", "IDs are unstable.");
    },
  ],
  [
    "materializes into a valid board topology",
    () => {
      const topology = materializeTopologySkeleton(generate(), "add");
      const validation = validateBoardTopology(topology);
      assert(validation.valid, JSON.stringify(validation.issues));
    },
  ],
  [
    "supports deterministic per-equation operator assignment",
    () => {
      const topology = materializeTopologySkeleton(
        generate(7, 3),
        (_equation, index) => (index % 2 === 0 ? "add" : "multiply"),
      );
      const operators = topology.nodes
        .filter((node) => node.kind === "operator")
        .map((node) => node.operator);
      assert(
        operators.includes("add") && operators.includes("multiply"),
        "Expected assigned operators were not materialized.",
      );
    },
  ],
  [
    "rejects incomplete operator maps",
    () => {
      let threw = false;
      try {
        materializeTopologySkeleton(generate(9, 2), {
          "eq-0001": "add",
        });
      } catch {
        threw = true;
      }
      assert(threw, "Missing operator assignment should throw.");
    },
  ],
  [
    "rejects boards smaller than the canonical equation length",
    () => {
      let threw = false;
      try {
        generateTopologySkeleton({
          width: 4,
          height: 9,
          equationCount: 2,
          seed: 1,
        });
      } catch {
        threw = true;
      }
      assert(threw, "Invalid dimensions should throw.");
    },
  ],
  [
    "rejects non-integer seeds",
    () => {
      let threw = false;
      try {
        generateTopologySkeleton({
          width: 9,
          height: 9,
          equationCount: 2,
          seed: 1.5,
        });
      } catch {
        threw = true;
      }
      assert(threw, "Non-integer seed should throw.");
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
console.log(`${passed}/${tests.length} topology-skeleton tests passed.`);
