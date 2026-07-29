import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import type { ArithmeticPolicy } from "../../engine/math/ArithmeticTypes";
import { DEFAULT_ARITHMETIC_POLICY } from "../../engine/math/OperatorRules";
import type {
  EquationGraph,
  EquationGraphEquation,
  VariableId,
} from "../../types/EquationGraph";
import type {
  NumberSynthesisOptions,
  NumberSynthesisResult,
  NumberSynthesisValidationIssue,
  NumberSynthesisValidationResult,
  SynthesizedEquation,
  SynthesizedVariable,
} from "../../types/NumberSynthesis";
import { validateEquationGraph } from "../board/EquationGraphBuilder";

interface ArithmeticTriple {
  readonly left: number;
  readonly right: number;
  readonly result: number;
}

function assertSeed(seed: number): void {
  if (!Number.isSafeInteger(seed)) {
    throw new Error("Number synthesis seed must be a safe integer.");
  }
}

function mix32(value: number): number {
  let mixed = value | 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicOrder<T>(
  values: readonly T[],
  seed: number,
  key: (value: T) => string,
): T[] {
  return [...values].sort((left, right) => {
    const leftScore = mix32(seed ^ hashText(key(left)));
    const rightScore = mix32(seed ^ hashText(key(right)));
    return leftScore - rightScore || key(left).localeCompare(key(right));
  });
}

function enumerateTriples(
  equation: EquationGraphEquation,
  policy: ArithmeticPolicy,
  seed: number,
): ArithmeticTriple[] {
  const triples: ArithmeticTriple[] = [];
  for (let left = policy.minimumValue; left <= policy.maximumValue; left += 1) {
    for (let right = policy.minimumValue; right <= policy.maximumValue; right += 1) {
      const arithmetic = applyArithmetic(equation.operator, left, right, policy);
      if (arithmetic.ok) {
        triples.push({ left, right, result: arithmetic.result });
      }
    }
  }
  return deterministicOrder(
    triples,
    seed ^ hashText(equation.id),
    (triple) => `${triple.left}:${triple.right}:${triple.result}`,
  );
}

function assignedCount(
  equation: EquationGraphEquation,
  assignments: ReadonlyMap<VariableId, number>,
): number {
  return [
    equation.leftVariableId,
    equation.rightVariableId,
    equation.resultVariableId,
  ].filter((id) => assignments.has(id)).length;
}

function tripleMatches(
  equation: EquationGraphEquation,
  triple: ArithmeticTriple,
  assignments: ReadonlyMap<VariableId, number>,
): boolean {
  return (
    (assignments.get(equation.leftVariableId) ?? triple.left) === triple.left &&
    (assignments.get(equation.rightVariableId) ?? triple.right) === triple.right &&
    (assignments.get(equation.resultVariableId) ?? triple.result) === triple.result
  );
}

function canAssignDistinctly(
  equation: EquationGraphEquation,
  triple: ArithmeticTriple,
  assignments: ReadonlyMap<VariableId, number>,
): boolean {
  const proposed: ReadonlyArray<readonly [VariableId, number]> = [
    [equation.leftVariableId, triple.left],
    [equation.rightVariableId, triple.right],
    [equation.resultVariableId, triple.result],
  ];
  const values = new Map<number, VariableId>();
  for (const [id, value] of assignments) values.set(value, id);
  for (const [id, value] of proposed) {
    const owner = values.get(value);
    if (owner !== undefined && owner !== id) return false;
    values.set(value, id);
  }
  return true;
}

/**
 * Assigns integer values to every equation-graph variable.
 *
 * Search is equation-oriented rather than variable-oriented: each step chooses
 * the most constrained unresolved equation, then propagates one valid arithmetic
 * triple through all shared variables. Seeded ordering makes equivalent requests
 * byte-for-byte reproducible.
 */
export function synthesizeNumbers(
  graph: EquationGraph,
  options: NumberSynthesisOptions,
): NumberSynthesisResult {
  assertSeed(options.seed);
  const graphValidation = validateEquationGraph(graph);
  if (!graphValidation.valid) {
    throw new Error(`Cannot synthesize an invalid equation graph: ${JSON.stringify(graphValidation.issues)}`);
  }

  const policy = options.policy ?? DEFAULT_ARITHMETIC_POLICY;
  const triples = new Map(
    graph.equations.map((equation) => [
      equation.id,
      enumerateTriples(equation, policy, options.seed),
    ]),
  );
  const assignments = new Map<VariableId, number>();
  const completed = new Set<string>();

  function search(): boolean {
    if (completed.size === graph.equations.length) return true;

    const equation = graph.equations
      .filter((candidate) => !completed.has(candidate.id))
      .sort((left, right) =>
        assignedCount(right, assignments) - assignedCount(left, assignments) ||
        left.id.localeCompare(right.id),
      )[0];
    if (equation === undefined) return true;

    for (const triple of triples.get(equation.id) ?? []) {
      if (!tripleMatches(equation, triple, assignments)) continue;
      if (
        options.requireDistinctValues === true &&
        !canAssignDistinctly(equation, triple, assignments)
      ) continue;

      const introduced: VariableId[] = [];
      const proposed: ReadonlyArray<readonly [VariableId, number]> = [
        [equation.leftVariableId, triple.left],
        [equation.rightVariableId, triple.right],
        [equation.resultVariableId, triple.result],
      ];
      for (const [id, value] of proposed) {
        if (!assignments.has(id)) {
          assignments.set(id, value);
          introduced.push(id);
        }
      }
      completed.add(equation.id);
      if (search()) return true;
      completed.delete(equation.id);
      for (const id of introduced) assignments.delete(id);
    }
    return false;
  }

  if (!search()) {
    throw new Error("No number assignment satisfies the equation graph and arithmetic policy.");
  }

  const variables: SynthesizedVariable[] = graph.variables
    .map((variable) => {
      const value = assignments.get(variable.id);
      if (value === undefined) throw new Error(`Missing synthesized value for ${variable.id}.`);
      return { variableId: variable.id, value };
    })
    .sort((left, right) => left.variableId.localeCompare(right.variableId));

  const equations: SynthesizedEquation[] = graph.equations
    .map((equation) => ({
      equationId: equation.id,
      left: assignments.get(equation.leftVariableId) as number,
      right: assignments.get(equation.rightVariableId) as number,
      result: assignments.get(equation.resultVariableId) as number,
    }))
    .sort((left, right) => left.equationId.localeCompare(right.equationId));

  return {
    graph,
    variables,
    equations,
    numberBank: variables.map((variable) => variable.value),
  };
}

export function serializeNumberSynthesis(result: NumberSynthesisResult): string {
  return JSON.stringify(result);
}

function issue(
  code: NumberSynthesisValidationIssue["code"],
  message: string,
  context: Pick<NumberSynthesisValidationIssue, "variableId" | "equationId"> = {},
): NumberSynthesisValidationIssue {
  return { code, message, ...context };
}

export function validateNumberSynthesis(
  result: NumberSynthesisResult,
  policy: ArithmeticPolicy = DEFAULT_ARITHMETIC_POLICY,
  requireDistinctValues = false,
): NumberSynthesisValidationResult {
  const issues: NumberSynthesisValidationIssue[] = [];
  const values = new Map<VariableId, number>();

  for (const assignment of result.variables) {
    if (values.has(assignment.variableId)) {
      issues.push(issue("DUPLICATE_ASSIGNMENT", `Duplicate assignment for ${assignment.variableId}.`, {
        variableId: assignment.variableId,
      }));
      continue;
    }
    values.set(assignment.variableId, assignment.value);
    if (
      !Number.isSafeInteger(assignment.value) ||
      assignment.value < policy.minimumValue ||
      assignment.value > policy.maximumValue
    ) {
      issues.push(issue("OUT_OF_RANGE_VALUE", `Value for ${assignment.variableId} violates the arithmetic policy.`, {
        variableId: assignment.variableId,
      }));
    }
  }

  for (const variable of result.graph.variables) {
    if (!values.has(variable.id)) {
      issues.push(issue("MISSING_ASSIGNMENT", `Missing assignment for ${variable.id}.`, {
        variableId: variable.id,
      }));
    }
  }

  if (requireDistinctValues) {
    const owners = new Map<number, VariableId>();
    for (const [id, value] of values) {
      const owner = owners.get(value);
      if (owner !== undefined && owner !== id) {
        issues.push(issue("DUPLICATE_VALUE", `Variables ${owner} and ${id} share value ${value}.`, {
          variableId: id,
        }));
      } else {
        owners.set(value, id);
      }
    }
  }

  for (const equation of result.graph.equations) {
    const left = values.get(equation.leftVariableId);
    const right = values.get(equation.rightVariableId);
    const expected = values.get(equation.resultVariableId);
    if (left === undefined || right === undefined || expected === undefined) continue;
    const arithmetic = applyArithmetic(equation.operator, left, right, policy);
    if (!arithmetic.ok || arithmetic.result !== expected) {
      issues.push(issue("INVALID_EQUATION", `Equation ${equation.id} is not satisfied.`, {
        equationId: equation.id,
      }));
    }
  }

  return { valid: issues.length === 0, issues };
}
