
import { applyArithmetic } from "../../engine/math/ArithmeticEngine";
import type { ArithmeticOperation } from "../../engine/math/ArithmeticTypes";
import type { Operator } from "../../types/Operator";
import type { CompositionPlan, EquationFillPlan, GenerationRequest } from "../contracts/GenerationContracts";
import { getClusterTemplate } from "../clusters/ClusterLibrary";
import { transformClusterTemplate } from "../clusters/ClusterTransforms";
import { allocateStageSeeds } from "../random/GenerationSeeds";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { arithmeticProfileForDifficulty } from "./ArithmeticProfiles";
import { assertValidEquationFillPlan } from "./EquationFillValidator";
import type { EquationFillingDiagnostics, EquationFillingResult } from "./FillingTypes";

type ArithmeticOperator = Exclude<Operator, "=">;
interface Equation { readonly id: string; readonly left: string; readonly right: string; readonly result: string; }
interface Candidate { readonly operator: ArithmeticOperator; readonly left: number; readonly right: number; readonly result: number; }

const OPERATION: Readonly<Record<ArithmeticOperator, ArithmeticOperation>> = {
  "+": "add", "-": "subtract", "×": "multiply", "÷": "divide",
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function mix32(value: number): number {
  let mixed = value | 0;
  mixed ^= mixed >>> 16; mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15; mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}
function deterministicOrder<T>(values: readonly T[], seed: number, key: (value: T) => string): T[] {
  return [...values].sort((a, b) => {
    const ak = key(a), bk = key(b);
    return mix32(seed ^ hashText(ak)) - mix32(seed ^ hashText(bk)) || ak.localeCompare(bk);
  });
}
function extractEquations(composition: CompositionPlan): Equation[] {
  const equations: Equation[] = [];
  for (const cluster of composition.clusters) {
    const template = transformClusterTemplate(getClusterTemplate(cluster.templateId), cluster.transform);
    for (const path of template.equations) {
      equations.push({
        id: `${cluster.id}:${path.id.split(":").pop()!}`,
        left: cluster.cellIdMap[path.cellIds[0]]!,
        right: cluster.cellIdMap[path.cellIds[2]]!,
        result: cluster.cellIdMap[path.cellIds[4]]!,
      });
    }
  }
  return equations.sort((a, b) => a.id.localeCompare(b.id));
}
function weightedOperators(
  operators: readonly ArithmeticOperator[],
  weights: Readonly<Record<ArithmeticOperator, number>>,
  seed: number,
  equationId: string,
): ArithmeticOperator[] {
  return [...operators].sort((left, right) =>
    weights[right] - weights[left]
    || mix32(seed ^ hashText(`${equationId}:${left}`)) - mix32(seed ^ hashText(`${equationId}:${right}`))
    || left.localeCompare(right),
  );
}
function enumerateCandidates(
  equation: Equation,
  operators: readonly ArithmeticOperator[],
  weights: Readonly<Record<ArithmeticOperator, number>>,
  minimum: number,
  maximum: number,
  seed: number,
  policy: Parameters<typeof applyArithmetic>[3],
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const operator of weightedOperators(operators, weights, seed, equation.id)) {
    for (let left = minimum; left <= maximum; left += 1) {
      for (let right = minimum; right <= maximum; right += 1) {
        const applied = applyArithmetic(OPERATION[operator], left, right, policy);
        if (!applied.ok) continue;
        if ((operator === "×" || operator === "÷") && right === 1) continue;
        if (operator === "×" && left === 1) continue;
        candidates.push({ operator, left, right, result: applied.result });
      }
    }
  }
  const rank = new Map(weightedOperators(operators, weights, seed, equation.id).map((operator, index) => [operator, index] as const));
  return candidates.sort((left, right) =>
    (rank.get(left.operator) ?? 99) - (rank.get(right.operator) ?? 99)
    || Math.max(left.left, left.right, left.result) - Math.max(right.left, right.right, right.result)
    || mix32(seed ^ hashText(`${equation.id}:${left.operator}:${left.left}:${left.right}`))
      - mix32(seed ^ hashText(`${equation.id}:${right.operator}:${right.left}:${right.right}`))
    || left.left - right.left
    || left.right - right.right,
  );
}
function assignedCount(equation: Equation, values: ReadonlyMap<string, number>): number {
  return [equation.left, equation.right, equation.result].filter((id) => values.has(id)).length;
}
function matches(equation: Equation, candidate: Candidate, values: ReadonlyMap<string, number>): boolean {
  return (values.get(equation.left) ?? candidate.left) === candidate.left
    && (values.get(equation.right) ?? candidate.right) === candidate.right
    && (values.get(equation.result) ?? candidate.result) === candidate.result;
}
function makeDiagnostics(
  searchNodes: number,
  backtracks: number,
  candidateTriples: number,
  equations: readonly Equation[],
  values: ReadonlyMap<string, number>,
  selectedOperators: ReadonlyMap<string, ArithmeticOperator>,
): EquationFillingDiagnostics {
  const counts: Record<string, number> = { "+": 0, "-": 0, "×": 0, "÷": 0 };
  for (const operator of selectedOperators.values()) counts[operator] = (counts[operator] ?? 0) + 1;
  const allValues = [...values.values()];
  const repeatedValueRatio = allValues.length === 0 ? 0 : 1 - new Set(allValues).size / allValues.length;
  let trivial = 0;
  for (const equation of equations) {
    const operator = selectedOperators.get(equation.id);
    const left = values.get(equation.left), right = values.get(equation.right);
    if ((operator === "×" && (left === 1 || right === 1)) || (operator === "÷" && right === 1)) trivial += 1;
  }
  return Object.freeze({
    searchNodes,
    backtracks,
    candidateTriples,
    elapsedMilliseconds: 0,
    operatorCounts: Object.freeze(counts),
    repeatedValueRatio: Number(repeatedValueRatio.toFixed(6)),
    trivialEquationRatio: equations.length === 0 ? 0 : Number((trivial / equations.length).toFixed(6)),
  });
}

export function fillEquations(
  request: GenerationRequest,
  composition: CompositionPlan,
  candidateIndex = 0,
): EquationFillingResult {
  const profile = arithmeticProfileForDifficulty(request.difficulty);
  const constrained = request.constraints.allowedOperators?.filter((operator) => profile.operators.includes(operator));
  const allowed = constrained && constrained.length > 0 ? constrained : profile.operators;
  const stageSeed = allocateStageSeeds(request.rootSeed, candidateIndex).numeric;
  if (request.constraints.allowedOperators !== undefined && constrained?.length === 0) {
    return {
      ok: false,
      code: "NO_ALLOWED_OPERATORS",
      message: "The request operator constraints do not intersect the arithmetic profile.",
      diagnostics: makeDiagnostics(0, 0, 0, [], new Map(), new Map()),
    };
  }

  const equations = extractEquations(composition);
  const candidates = new Map<string, readonly Candidate[]>();
  let candidateTriples = 0;
  for (const equation of equations) {
    const list = enumerateCandidates(
      equation,
      allowed,
      profile.operatorWeights,
      profile.policy.minimumValue,
      profile.policy.maximumValue,
      stageSeed.value,
      profile.policy,
    );
    candidates.set(equation.id, list);
    candidateTriples += list.length;
  }

  const values = new Map<string, number>();
  const selectedOperators = new Map<string, ArithmeticOperator>();
  const complete = new Set<string>();
  let searchNodes = 0;
  let backtracks = 0;
  let exhausted = false;

  function search(): boolean {
    if (complete.size === equations.length) {
      const finalMetrics = makeDiagnostics(searchNodes, backtracks, candidateTriples, equations, values, selectedOperators);
      return finalMetrics.repeatedValueRatio <= profile.maximumRepeatedValueRatio
        && finalMetrics.trivialEquationRatio <= profile.maximumTrivialEquationRatio;
    }
    if (searchNodes >= profile.maximumSearchNodes) { exhausted = true; return false; }
    const equation = equations
      .filter((candidate) => !complete.has(candidate.id))
      .sort((a, b) => assignedCount(b, values) - assignedCount(a, values) || a.id.localeCompare(b.id))[0];
    if (!equation) return true;

    for (const candidate of candidates.get(equation.id) ?? []) {
      searchNodes += 1;
      if (searchNodes > profile.maximumSearchNodes) { exhausted = true; return false; }
      if (!matches(equation, candidate, values)) continue;
      const introduced: string[] = [];
      for (const [id, value] of [
        [equation.left, candidate.left],
        [equation.right, candidate.right],
        [equation.result, candidate.result],
      ] as const) {
        if (!values.has(id)) { values.set(id, value); introduced.push(id); }
      }
      selectedOperators.set(equation.id, candidate.operator);
      complete.add(equation.id);
      if (search()) return true;
      complete.delete(equation.id);
      selectedOperators.delete(equation.id);
      for (const id of introduced) values.delete(id);
      backtracks += 1;
    }
    return false;
  }

  if (!search()) {
    return {
      ok: false,
      code: exhausted ? "SEARCH_BUDGET_EXHAUSTED" : "UNSATISFIABLE_STRUCTURE",
      message: exhausted ? "Equation filling exceeded its deterministic search budget." : "No arithmetic fill satisfies the composition.",
      diagnostics: makeDiagnostics(searchNodes, backtracks, candidateTriples, equations, values, selectedOperators),
    };
  }

  const resultDiagnostics = makeDiagnostics(searchNodes, backtracks, candidateTriples, equations, values, selectedOperators);
  if (
    resultDiagnostics.repeatedValueRatio > profile.maximumRepeatedValueRatio
    || resultDiagnostics.trivialEquationRatio > profile.maximumTrivialEquationRatio
  ) {
    return {
      ok: false,
      code: "QUALITY_REJECTED",
      message: "The arithmetic fill violates the profile quality thresholds.",
      diagnostics: resultDiagnostics,
    };
  }

  const operators = Object.fromEntries([...selectedOperators.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const plan: EquationFillPlan = Object.freeze({
    schema: GENERATION_SCHEMA_IDS.equationFillPlan,
    id: `${composition.id}:fill`,
    operators: Object.freeze(operators),
    values: Object.freeze(Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b)))),
    profileId: profile.id,
    synthesisSeed: stageSeed,
  });
  assertValidEquationFillPlan(request.difficulty, composition, plan);
  return { ok: true, plan, diagnostics: resultDiagnostics };
}
