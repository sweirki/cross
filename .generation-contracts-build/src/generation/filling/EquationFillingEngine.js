"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillEquations = fillEquations;
const ArithmeticEngine_1 = require("../../engine/math/ArithmeticEngine");
const ClusterLibrary_1 = require("../clusters/ClusterLibrary");
const ClusterTransforms_1 = require("../clusters/ClusterTransforms");
const GenerationSeeds_1 = require("../random/GenerationSeeds");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const ArithmeticProfiles_1 = require("./ArithmeticProfiles");
const EquationFillValidator_1 = require("./EquationFillValidator");
const OPERATION = {
    "+": "add", "-": "subtract", "×": "multiply", "÷": "divide",
};
function hashText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function mix32(value) {
    let mixed = value | 0;
    mixed ^= mixed >>> 16;
    mixed = Math.imul(mixed, 0x7feb352d);
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x846ca68b);
    mixed ^= mixed >>> 16;
    return mixed >>> 0;
}
function deterministicOrder(values, seed, key) {
    return [...values].sort((a, b) => {
        const ak = key(a), bk = key(b);
        return mix32(seed ^ hashText(ak)) - mix32(seed ^ hashText(bk)) || ak.localeCompare(bk);
    });
}
function extractEquations(composition) {
    const equations = [];
    for (const cluster of composition.clusters) {
        const template = (0, ClusterTransforms_1.transformClusterTemplate)((0, ClusterLibrary_1.getClusterTemplate)(cluster.templateId), cluster.transform);
        for (const path of template.equations) {
            equations.push({
                id: `${cluster.id}:${path.id.split(":").pop()}`,
                left: cluster.cellIdMap[path.cellIds[0]],
                right: cluster.cellIdMap[path.cellIds[2]],
                result: cluster.cellIdMap[path.cellIds[4]],
            });
        }
    }
    return equations.sort((a, b) => a.id.localeCompare(b.id));
}
function weightedOperators(operators, weights, seed, equationId) {
    return [...operators].sort((left, right) => weights[right] - weights[left]
        || mix32(seed ^ hashText(`${equationId}:${left}`)) - mix32(seed ^ hashText(`${equationId}:${right}`))
        || left.localeCompare(right));
}
function enumerateCandidates(equation, operators, weights, minimum, maximum, seed, policy) {
    const candidates = [];
    for (const operator of weightedOperators(operators, weights, seed, equation.id)) {
        for (let left = minimum; left <= maximum; left += 1) {
            for (let right = minimum; right <= maximum; right += 1) {
                const applied = (0, ArithmeticEngine_1.applyArithmetic)(OPERATION[operator], left, right, policy);
                if (!applied.ok)
                    continue;
                if ((operator === "×" || operator === "÷") && right === 1)
                    continue;
                if (operator === "×" && left === 1)
                    continue;
                candidates.push({ operator, left, right, result: applied.result });
            }
        }
    }
    const rank = new Map(weightedOperators(operators, weights, seed, equation.id).map((operator, index) => [operator, index]));
    return candidates.sort((left, right) => (rank.get(left.operator) ?? 99) - (rank.get(right.operator) ?? 99)
        || Math.max(left.left, left.right, left.result) - Math.max(right.left, right.right, right.result)
        || mix32(seed ^ hashText(`${equation.id}:${left.operator}:${left.left}:${left.right}`))
            - mix32(seed ^ hashText(`${equation.id}:${right.operator}:${right.left}:${right.right}`))
        || left.left - right.left
        || left.right - right.right);
}
function assignedCount(equation, values) {
    return [equation.left, equation.right, equation.result].filter((id) => values.has(id)).length;
}
function matches(equation, candidate, values) {
    return (values.get(equation.left) ?? candidate.left) === candidate.left
        && (values.get(equation.right) ?? candidate.right) === candidate.right
        && (values.get(equation.result) ?? candidate.result) === candidate.result;
}
function makeDiagnostics(searchNodes, backtracks, candidateTriples, equations, values, selectedOperators) {
    const counts = { "+": 0, "-": 0, "×": 0, "÷": 0 };
    for (const operator of selectedOperators.values())
        counts[operator] = (counts[operator] ?? 0) + 1;
    const allValues = [...values.values()];
    const repeatedValueRatio = allValues.length === 0 ? 0 : 1 - new Set(allValues).size / allValues.length;
    let trivial = 0;
    for (const equation of equations) {
        const operator = selectedOperators.get(equation.id);
        const left = values.get(equation.left), right = values.get(equation.right);
        if ((operator === "×" && (left === 1 || right === 1)) || (operator === "÷" && right === 1))
            trivial += 1;
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
function fillEquations(request, composition, candidateIndex = 0) {
    const profile = (0, ArithmeticProfiles_1.arithmeticProfileForDifficulty)(request.difficulty);
    const constrained = request.constraints.allowedOperators?.filter((operator) => profile.operators.includes(operator));
    const allowed = constrained && constrained.length > 0 ? constrained : profile.operators;
    const stageSeed = (0, GenerationSeeds_1.allocateStageSeeds)(request.rootSeed, candidateIndex).numeric;
    if (request.constraints.allowedOperators !== undefined && constrained?.length === 0) {
        return {
            ok: false,
            code: "NO_ALLOWED_OPERATORS",
            message: "The request operator constraints do not intersect the arithmetic profile.",
            diagnostics: makeDiagnostics(0, 0, 0, [], new Map(), new Map()),
        };
    }
    const equations = extractEquations(composition);
    const candidates = new Map();
    let candidateTriples = 0;
    for (const equation of equations) {
        const list = enumerateCandidates(equation, allowed, profile.operatorWeights, profile.policy.minimumValue, profile.policy.maximumValue, stageSeed.value, profile.policy);
        candidates.set(equation.id, list);
        candidateTriples += list.length;
    }
    const values = new Map();
    const selectedOperators = new Map();
    const complete = new Set();
    let searchNodes = 0;
    let backtracks = 0;
    let exhausted = false;
    function search() {
        if (complete.size === equations.length) {
            const finalMetrics = makeDiagnostics(searchNodes, backtracks, candidateTriples, equations, values, selectedOperators);
            return finalMetrics.repeatedValueRatio <= profile.maximumRepeatedValueRatio
                && finalMetrics.trivialEquationRatio <= profile.maximumTrivialEquationRatio;
        }
        if (searchNodes >= profile.maximumSearchNodes) {
            exhausted = true;
            return false;
        }
        const equation = equations
            .filter((candidate) => !complete.has(candidate.id))
            .sort((a, b) => assignedCount(b, values) - assignedCount(a, values) || a.id.localeCompare(b.id))[0];
        if (!equation)
            return true;
        for (const candidate of candidates.get(equation.id) ?? []) {
            searchNodes += 1;
            if (searchNodes > profile.maximumSearchNodes) {
                exhausted = true;
                return false;
            }
            if (!matches(equation, candidate, values))
                continue;
            const introduced = [];
            for (const [id, value] of [
                [equation.left, candidate.left],
                [equation.right, candidate.right],
                [equation.result, candidate.result],
            ]) {
                if (!values.has(id)) {
                    values.set(id, value);
                    introduced.push(id);
                }
            }
            selectedOperators.set(equation.id, candidate.operator);
            complete.add(equation.id);
            if (search())
                return true;
            complete.delete(equation.id);
            selectedOperators.delete(equation.id);
            for (const id of introduced)
                values.delete(id);
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
    if (resultDiagnostics.repeatedValueRatio > profile.maximumRepeatedValueRatio
        || resultDiagnostics.trivialEquationRatio > profile.maximumTrivialEquationRatio) {
        return {
            ok: false,
            code: "QUALITY_REJECTED",
            message: "The arithmetic fill violates the profile quality thresholds.",
            diagnostics: resultDiagnostics,
        };
    }
    const operators = Object.fromEntries([...selectedOperators.entries()].sort(([a], [b]) => a.localeCompare(b)));
    const plan = Object.freeze({
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.equationFillPlan,
        id: `${composition.id}:fill`,
        operators: Object.freeze(operators),
        values: Object.freeze(Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b)))),
        profileId: profile.id,
        synthesisSeed: stageSeed,
    });
    (0, EquationFillValidator_1.assertValidEquationFillPlan)(request.difficulty, composition, plan);
    return { ok: true, plan, diagnostics: resultDiagnostics };
}
