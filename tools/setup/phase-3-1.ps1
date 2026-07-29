Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\cross

$files = @{
  ".\src\engine\math\ArithmeticTypes.ts" = @'
export type ArithmeticOperation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide";

export type ArithmeticFailureCode =
  | "NON_FINITE_OPERAND"
  | "NON_INTEGER_OPERAND"
  | "DIVISION_BY_ZERO"
  | "NON_INTEGER_DIVISION"
  | "NEGATIVE_RESULT_FORBIDDEN"
  | "ZERO_RESULT_FORBIDDEN"
  | "RESULT_OUT_OF_RANGE"
  | "UNSAFE_INTEGER_RESULT";

export interface ArithmeticPolicy {
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly requireIntegerOperands: boolean;
  readonly requireIntegerResults: boolean;
  readonly allowNegativeResults: boolean;
  readonly allowZeroResults: boolean;
}

export interface ArithmeticSuccess {
  readonly ok: true;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly result: number;
}

export interface ArithmeticFailure {
  readonly ok: false;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly code: ArithmeticFailureCode;
  readonly message: string;
}

export type ArithmeticResult =
  | ArithmeticSuccess
  | ArithmeticFailure;

export interface EquationEvaluation {
  readonly valid: boolean;
  readonly operation: ArithmeticOperation;
  readonly left: number;
  readonly right: number;
  readonly expectedResult: number;
  readonly actualResult?: number;
  readonly failure?: ArithmeticFailure;
}
'@

  ".\src\engine\math\OperatorRules.ts" = @'
import type {
  ArithmeticOperation,
  ArithmeticPolicy,
} from "./ArithmeticTypes";

export const DEFAULT_ARITHMETIC_POLICY: ArithmeticPolicy = Object.freeze({
  minimumValue: 0,
  maximumValue: 100,
  requireIntegerOperands: true,
  requireIntegerResults: true,
  allowNegativeResults: false,
  allowZeroResults: true,
});

export const ARITHMETIC_OPERATIONS: readonly ArithmeticOperation[] =
  Object.freeze([
    "add",
    "subtract",
    "multiply",
    "divide",
  ]);

export function isArithmeticOperation(
  value: unknown,
): value is ArithmeticOperation {
  return (
    value === "add" ||
    value === "subtract" ||
    value === "multiply" ||
    value === "divide"
  );
}

export function getOperationSymbol(
  operation: ArithmeticOperation,
): "+" | "-" | "×" | "÷" {
  switch (operation) {
    case "add":
      return "+";
    case "subtract":
      return "-";
    case "multiply":
      return "×";
    case "divide":
      return "÷";
  }
}
'@

  ".\src\engine\math\ArithmeticEngine.ts" = @'
import type {
  ArithmeticFailure,
  ArithmeticFailureCode,
  ArithmeticOperation,
  ArithmeticPolicy,
  ArithmeticResult,
} from "./ArithmeticTypes";
import { DEFAULT_ARITHMETIC_POLICY } from "./OperatorRules";

function fail(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  code: ArithmeticFailureCode,
  message: string,
): ArithmeticFailure {
  return {
    ok: false,
    operation,
    left,
    right,
    code,
    message,
  };
}

function validateOperand(
  value: number,
  side: "left" | "right",
  operation: ArithmeticOperation,
  left: number,
  right: number,
  policy: ArithmeticPolicy,
): ArithmeticFailure | null {
  if (!Number.isFinite(value)) {
    return fail(
      operation,
      left,
      right,
      "NON_FINITE_OPERAND",
      `${side} operand must be finite.`,
    );
  }

  if (policy.requireIntegerOperands && !Number.isInteger(value)) {
    return fail(
      operation,
      left,
      right,
      "NON_INTEGER_OPERAND",
      `${side} operand must be an integer.`,
    );
  }

  return null;
}

function calculateRaw(
  operation: ArithmeticOperation,
  left: number,
  right: number,
): number {
  switch (operation) {
    case "add":
      return left + right;
    case "subtract":
      return left - right;
    case "multiply":
      return left * right;
    case "divide":
      return left / right;
  }
}

export function applyArithmetic(
  operation: ArithmeticOperation,
  left: number,
  right: number,
  policy: ArithmeticPolicy = DEFAULT_ARITHMETIC_POLICY,
): ArithmeticResult {
  const leftFailure = validateOperand(
    left,
    "left",
    operation,
    left,
    right,
    policy,
  );

  if (leftFailure) {
    return leftFailure;
  }

  const rightFailure = validateOperand(
    right,
    "right",
    operation,
    left,
    right,
    policy,
  );

  if (rightFailure) {
    return rightFailure;
  }

  if (operation === "divide" && right === 0) {
    return fail(
      operation,
      left,
      right,
      "DIVISION_BY_ZERO",
      "Division by zero is forbidden.",
    );
  }

  const result = calculateRaw(operation, left, right);

  if (!Number.isSafeInteger(result) && Number.isInteger(result)) {
    return fail(
      operation,
      left,
      right,
      "UNSAFE_INTEGER_RESULT",
      "Result exceeds the safe integer range.",
    );
  }

  if (policy.requireIntegerResults && !Number.isInteger(result)) {
    return fail(
      operation,
      left,
      right,
      operation === "divide"
        ? "NON_INTEGER_DIVISION"
        : "RESULT_OUT_OF_RANGE",
      "Result must be an integer.",
    );
  }

  if (!policy.allowNegativeResults && result < 0) {
    return fail(
      operation,
      left,
      right,
      "NEGATIVE_RESULT_FORBIDDEN",
      "Negative results are forbidden by policy.",
    );
  }

  if (!policy.allowZeroResults && result === 0) {
    return fail(
      operation,
      left,
      right,
      "ZERO_RESULT_FORBIDDEN",
      "Zero results are forbidden by policy.",
    );
  }

  if (
    result < policy.minimumValue ||
    result > policy.maximumValue
  ) {
    return fail(
      operation,
      left,
      right,
      "RESULT_OUT_OF_RANGE",
      `Result must be between ${policy.minimumValue} and ${policy.maximumValue}.`,
    );
  }

  return {
    ok: true,
    operation,
    left,
    right,
    result,
  };
}
'@

  ".\src\engine\math\EquationEvaluator.ts" = @'
import { applyArithmetic } from "./ArithmeticEngine";
import type {
  ArithmeticOperation,
  ArithmeticPolicy,
  EquationEvaluation,
} from "./ArithmeticTypes";
import { DEFAULT_ARITHMETIC_POLICY } from "./OperatorRules";

export function evaluateEquation(
  left: number,
  operation: ArithmeticOperation,
  right: number,
  expectedResult: number,
  policy: ArithmeticPolicy = DEFAULT_ARITHMETIC_POLICY,
): EquationEvaluation {
  const arithmetic = applyArithmetic(
    operation,
    left,
    right,
    policy,
  );

  if (!arithmetic.ok) {
    return {
      valid: false,
      operation,
      left,
      right,
      expectedResult,
      failure: arithmetic,
    };
  }

  return {
    valid: arithmetic.result === expectedResult,
    operation,
    left,
    right,
    expectedResult,
    actualResult: arithmetic.result,
  };
}
'@

  ".\src\engine\math\EquationCanonicalizer.ts" = @'
import type { ArithmeticOperation } from "./ArithmeticTypes";

export interface CanonicalEquation {
  readonly left: number;
  readonly operation: ArithmeticOperation;
  readonly right: number;
  readonly result: number;
}

function isCommutative(
  operation: ArithmeticOperation,
): boolean {
  return operation === "add" || operation === "multiply";
}

export function canonicalizeEquation(
  equation: CanonicalEquation,
): CanonicalEquation {
  if (
    isCommutative(equation.operation) &&
    equation.left > equation.right
  ) {
    return {
      left: equation.right,
      operation: equation.operation,
      right: equation.left,
      result: equation.result,
    };
  }

  return equation;
}

export function serializeCanonicalEquation(
  equation: CanonicalEquation,
): string {
  const canonical = canonicalizeEquation(equation);

  return [
    canonical.left,
    canonical.operation,
    canonical.right,
    canonical.result,
  ].join("|");
}
'@

  ".\src\engine\math\index.ts" = @'
export * from "./ArithmeticEngine";
export * from "./ArithmeticTypes";
export * from "./EquationCanonicalizer";
export * from "./EquationEvaluator";
export * from "./OperatorRules";
'@

  ".\tools\tests\arithmetic-engine.test.ts" = @'
import {
  applyArithmetic,
  canonicalizeEquation,
  evaluateEquation,
  serializeCanonicalEquation,
} from "../../src/engine/math";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(
  actual: T,
  expected: T,
  message: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `${message} Expected ${String(expected)}, received ${String(actual)}.`,
    );
  }
}

const tests: ReadonlyArray<readonly [string, () => void]> = [
  [
    "addition succeeds",
    () => {
      const result = applyArithmetic("add", 7, 5);
      assert(result.ok, "Addition should succeed.");
      assertEqual(result.result, 12, "Addition result mismatch.");
    },
  ],
  [
    "subtraction rejects negative result under default policy",
    () => {
      const result = applyArithmetic("subtract", 3, 8);
      assert(!result.ok, "Negative subtraction should fail.");
      assertEqual(
        result.code,
        "NEGATIVE_RESULT_FORBIDDEN",
        "Unexpected subtraction failure.",
      );
    },
  ],
  [
    "multiplication succeeds",
    () => {
      const result = applyArithmetic("multiply", 6, 4);
      assert(result.ok, "Multiplication should succeed.");
      assertEqual(result.result, 24, "Multiplication result mismatch.");
    },
  ],
  [
    "division rejects zero divisor",
    () => {
      const result = applyArithmetic("divide", 10, 0);
      assert(!result.ok, "Division by zero should fail.");
      assertEqual(
        result.code,
        "DIVISION_BY_ZERO",
        "Unexpected zero-division failure.",
      );
    },
  ],
  [
    "division rejects fractional result",
    () => {
      const result = applyArithmetic("divide", 7, 2);
      assert(!result.ok, "Fractional division should fail.");
      assertEqual(
        result.code,
        "NON_INTEGER_DIVISION",
        "Unexpected fractional-division failure.",
      );
    },
  ],
  [
    "equation evaluator validates exact result",
    () => {
      const evaluation = evaluateEquation(
        9,
        "subtract",
        4,
        5,
      );
      assert(evaluation.valid, "Equation should be valid.");
      assertEqual(
        evaluation.actualResult,
        5,
        "Equation result mismatch.",
      );
    },
  ],
  [
    "equation evaluator rejects incorrect result",
    () => {
      const evaluation = evaluateEquation(
        9,
        "subtract",
        4,
        6,
      );
      assert(!evaluation.valid, "Equation should be invalid.");
      assertEqual(
        evaluation.actualResult,
        5,
        "Actual result should still be reported.",
      );
    },
  ],
  [
    "commutative equations canonicalize operand order",
    () => {
      const canonical = canonicalizeEquation({
        left: 9,
        operation: "add",
        right: 2,
        result: 11,
      });

      assertEqual(canonical.left, 2, "Canonical left mismatch.");
      assertEqual(canonical.right, 9, "Canonical right mismatch.");
    },
  ],
  [
    "noncommutative equations preserve operand order",
    () => {
      const canonical = canonicalizeEquation({
        left: 9,
        operation: "subtract",
        right: 2,
        result: 7,
      });

      assertEqual(canonical.left, 9, "Subtraction left changed.");
      assertEqual(canonical.right, 2, "Subtraction right changed.");
    },
  ],
  [
    "canonical serialization is deterministic",
    () => {
      const first = serializeCanonicalEquation({
        left: 9,
        operation: "multiply",
        right: 2,
        result: 18,
      });

      const second = serializeCanonicalEquation({
        left: 2,
        operation: "multiply",
        right: 9,
        result: 18,
      });

      assertEqual(
        first,
        second,
        "Equivalent multiplication equations must serialize equally.",
      );
    },
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  test();
  passed += 1;
  console.log(`PASS ${name}`);
}

console.log("");
console.log(`${passed}/${tests.length} arithmetic-engine tests passed.`);
'@
}

foreach ($path in $files.Keys) {
  $parent = Split-Path -Parent $path

  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $files[$path] | Set-Content -Encoding utf8 -Path $path
}

Write-Host ""
Write-Host "Phase 3.1 files created:"
Write-Host "  src/engine/math/ArithmeticTypes.ts"
Write-Host "  src/engine/math/OperatorRules.ts"
Write-Host "  src/engine/math/ArithmeticEngine.ts"
Write-Host "  src/engine/math/EquationEvaluator.ts"
Write-Host "  src/engine/math/EquationCanonicalizer.ts"
Write-Host "  src/engine/math/index.ts"
Write-Host "  tools/tests/arithmetic-engine.test.ts"
Write-Host ""

Write-Host "Running project TypeScript validation..."
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
  throw "Project TypeScript validation failed."
}

$tempRoot = ".\.tmp\phase-3-1"

if (Test-Path $tempRoot) {
  Remove-Item -Recurse -Force $tempRoot
}

Write-Host ""
Write-Host "Compiling targeted arithmetic tests..."

npx tsc `
  --target ES2020 `
  --module commonjs `
  --moduleResolution node `
  --strict `
  --skipLibCheck `
  --esModuleInterop `
  --outDir $tempRoot `
  .\src\engine\math\ArithmeticTypes.ts `
  .\src\engine\math\OperatorRules.ts `
  .\src\engine\math\ArithmeticEngine.ts `
  .\src\engine\math\EquationEvaluator.ts `
  .\src\engine\math\EquationCanonicalizer.ts `
  .\src\engine\math\index.ts `
  .\tools\tests\arithmetic-engine.test.ts

if ($LASTEXITCODE -ne 0) {
  throw "Arithmetic test compilation failed."
}

Write-Host ""
Write-Host "Running arithmetic tests..."
node "$tempRoot\tools\tests\arithmetic-engine.test.js"

if ($LASTEXITCODE -ne 0) {
  throw "Arithmetic engine tests failed."
}

Remove-Item -Recurse -Force $tempRoot

Write-Host ""
Write-Host "=============================================="
Write-Host "Phase 3.1 Arithmetic Engine completed."
Write-Host "TypeScript validation: PASS"
Write-Host "Targeted tests: PASS"
Write-Host "=============================================="
