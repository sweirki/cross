import { certifyDifficulty } from "../../src/game/difficulty";
import { validateDifficultyCertification } from "../../src/game/validation/DifficultyValidation";
import type { DifficultyCertification } from "../../src/types/DifficultyCertification";
import type { Puzzle } from "../../src/types/Puzzle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function oneEquation(options: {
  readonly givenLeft?: boolean;
  readonly bank?: readonly number[];
  readonly difficulty?: Puzzle["difficulty"];
} = {}): Puzzle {
  const givenLeft = options.givenLeft ?? true;
  const bank = options.bank ?? (givenLeft ? [3, 5] : [2, 3, 5]);
  return {
    schemaVersion: 1,
    id: "difficulty-test",
    difficulty: options.difficulty ?? "easy",
    width: 5,
    height: 1,
    cells: [
      { id: "n1", kind: "number", position: { row: 0, col: 0 }, value: givenLeft ? 2 : null, solution: 2, given: givenLeft, editable: !givenLeft },
      { id: "op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
      { id: "n2", kind: "number", position: { row: 0, col: 2 }, value: null, solution: 3, given: false, editable: true },
      { id: "eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
      { id: "n3", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
    ],
    equations: [
      { id: "e1", orientation: "horizontal", cellIds: ["n1", "op", "n2", "eq", "n3"], operator: "+" },
    ],
    numberBank: bank.map((value, index) => ({ id: `t${index + 1}`, value })),
  };
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ["certifies a proven unique puzzle", () => {
    const certification = certifyDifficulty(oneEquation());
    assert(certification.unique, "Certification must record uniqueness.");
    assertEqual(certification.certificationVersion, 1, "Version mismatch.");
    assertEqual(certification.requestedTier, "easy", "Requested tier mismatch.");
  }],
  ["produces a deterministic certification", () => {
    const first = certifyDifficulty(oneEquation());
    const second = certifyDifficulty(oneEquation());
    assertEqual(JSON.stringify(first), JSON.stringify(second), "Certification is not deterministic.");
  }],
  ["preserves the requested tier independently", () => {
    const certification = certifyDifficulty(oneEquation({ difficulty: "expert" }));
    assertEqual(certification.requestedTier, "expert", "Requested tier was not preserved.");
    assertEqual(certification.certifiedTier, "easy", "Certified tier should derive from metrics.");
  }],
  ["records forced deductions", () => {
    const certification = certifyDifficulty(oneEquation());
    assert(certification.metrics.deductionCount > 0, "Expected forced deductions.");
    assert(certification.evidence.forcedMoveCount > 0, "Expected forced-move evidence.");
  }],
  ["records structural density", () => {
    const certification = certifyDifficulty(oneEquation());
    assertEqual(certification.evidence.equationCount, 1, "Equation count mismatch.");
    assertEqual(certification.evidence.hiddenCellCount, 2, "Hidden count mismatch.");
    assertEqual(certification.metrics.constraintDensity, 0.5, "Constraint density mismatch.");
  }],
  ["creates a stable formatted fingerprint", () => {
    const certification = certifyDifficulty(oneEquation());
    assert(/^difficulty-v1-[0-9a-f]{16}$/.test(certification.fingerprint), "Fingerprint format mismatch.");
  }],
  ["rejects a multiple-solution puzzle", () => {
    let threw = false;
    try { certifyDifficulty(oneEquation({ givenLeft: false })); } catch { threw = true; }
    assert(threw, "Multiple-solution puzzle should not be certified.");
  }],
  ["rejects an unsatisfiable puzzle", () => {
    let threw = false;
    try { certifyDifficulty(oneEquation({ bank: [4, 5] })); } catch { threw = true; }
    assert(threw, "Unsatisfiable puzzle should not be certified.");
  }],
  ["validates a generated certification", () => {
    const validation = validateDifficultyCertification(certifyDifficulty(oneEquation()));
    assert(validation.valid, `Generated certification is invalid: ${validation.issues.join(", ")}`);
  }],
  ["reports malformed certification data", () => {
    const valid = certifyDifficulty(oneEquation());
    const broken = {
      ...valid,
      score: 101,
      fingerprint: "bad",
    } as unknown as DifficultyCertification;
    const validation = validateDifficultyCertification(broken);
    assert(!validation.valid, "Malformed certification should be invalid.");
    assert(validation.issues.length >= 2, "Expected score and fingerprint issues.");
  }],
];

let passed = 0;
for (const [name, execute] of tests) {
  execute();
  passed += 1;
  console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} difficulty-certification tests passed.`);
