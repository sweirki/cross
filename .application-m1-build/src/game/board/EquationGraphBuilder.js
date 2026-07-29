"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEquationGraph = buildEquationGraph;
exports.serializeEquationGraph = serializeEquationGraph;
exports.validateEquationGraph = validateEquationGraph;
function variableId(nodeId) {
    return `var-${nodeId}`;
}
function requireNode(nodes, equation, index) {
    const nodeId = equation.nodeIds[index];
    const node = nodes.get(nodeId);
    if (node === undefined) {
        throw new Error(`Equation ${equation.id} references missing node ${nodeId}.`);
    }
    return node;
}
function requireNumber(nodes, equation, index) {
    const node = requireNode(nodes, equation, index);
    if (node.kind !== "number") {
        throw new Error(`Equation ${equation.id} expected a number at path index ${index}.`);
    }
    return node;
}
function requireOperator(nodes, equation) {
    const node = requireNode(nodes, equation, 1);
    if (node.kind !== "operator") {
        throw new Error(`Equation ${equation.id} expected an operator at path index 1.`);
    }
    return node;
}
/**
 * Constructs the canonical equation dependency graph from board topology.
 *
 * Number topology nodes become graph variables. Equations reference their
 * ordered left, right, and result variables. Shared variables produce stable
 * undirected intersection edges.
 */
function buildEquationGraph(topology) {
    const nodesById = new Map(topology.nodes.map((node) => [node.id, node]));
    const participation = new Map();
    const equations = [...topology.equations]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((equation) => {
        const left = requireNumber(nodesById, equation, 0);
        const right = requireNumber(nodesById, equation, 2);
        const result = requireNumber(nodesById, equation, 4);
        const operator = requireOperator(nodesById, equation);
        for (const node of [left, right, result]) {
            const ids = participation.get(node.id) ?? [];
            ids.push(equation.id);
            participation.set(node.id, ids);
        }
        return {
            id: equation.id,
            orientation: equation.orientation,
            operator: operator.operator,
            leftVariableId: variableId(left.id),
            rightVariableId: variableId(right.id),
            resultVariableId: variableId(result.id),
        };
    });
    const variables = topology.nodes
        .filter((node) => node.kind === "number")
        .map((node) => ({
        id: variableId(node.id),
        nodeId: node.id,
        position: node.position,
        equationIds: [...(participation.get(node.id) ?? [])].sort(),
    }))
        .sort((left, right) => left.id.localeCompare(right.id));
    const intersections = variables
        .filter((variable) => variable.equationIds.length === 2)
        .map((variable) => ({
        variableId: variable.id,
        equationIds: [
            variable.equationIds[0],
            variable.equationIds[1],
        ],
    }))
        .sort((left, right) => left.variableId.localeCompare(right.variableId));
    return { variables, equations, intersections };
}
function serializeEquationGraph(graph) {
    return JSON.stringify(graph);
}
function graphIssue(code, message, context = {}) {
    return { code, message, ...context };
}
function validateEquationGraph(graph) {
    const issues = [];
    const variables = new Map();
    for (const variable of graph.variables) {
        if (variables.has(variable.id)) {
            issues.push(graphIssue("DUPLICATE_VARIABLE_ID", `Duplicate variable ID: ${variable.id}.`, { variableId: variable.id }));
        }
        else {
            variables.set(variable.id, variable);
        }
        if (variable.equationIds.length < 1 || variable.equationIds.length > 2) {
            issues.push(graphIssue("INVALID_VARIABLE_PARTICIPATION", `Variable ${variable.id} must participate in one or two equations.`, { variableId: variable.id }));
        }
    }
    const equationIds = new Set();
    for (const equation of graph.equations) {
        if (equationIds.has(equation.id)) {
            issues.push(graphIssue("DUPLICATE_EQUATION_ID", `Duplicate equation ID: ${equation.id}.`, { equationId: equation.id }));
        }
        equationIds.add(equation.id);
        for (const id of [
            equation.leftVariableId,
            equation.rightVariableId,
            equation.resultVariableId,
        ]) {
            if (!variables.has(id)) {
                issues.push(graphIssue("MISSING_VARIABLE_REFERENCE", `Equation ${equation.id} references missing variable ${id}.`, { equationId: equation.id, variableId: id }));
            }
        }
    }
    const adjacency = new Map();
    for (const id of equationIds)
        adjacency.set(id, new Set());
    for (const intersection of graph.intersections) {
        const variable = variables.get(intersection.variableId);
        const [left, right] = intersection.equationIds;
        const expected = variable?.equationIds;
        if (variable === undefined ||
            expected?.length !== 2 ||
            expected[0] !== left ||
            expected[1] !== right ||
            left === right ||
            !equationIds.has(left) ||
            !equationIds.has(right)) {
            issues.push(graphIssue("INVALID_INTERSECTION", `Intersection ${intersection.variableId} is inconsistent.`, { variableId: intersection.variableId }));
            continue;
        }
        adjacency.get(left)?.add(right);
        adjacency.get(right)?.add(left);
    }
    if (graph.equations.length > 1) {
        const start = graph.equations[0]?.id;
        const visited = new Set();
        const stack = start === undefined ? [] : [start];
        while (stack.length > 0) {
            const current = stack.pop();
            if (current === undefined || visited.has(current))
                continue;
            visited.add(current);
            for (const neighbor of adjacency.get(current) ?? [])
                stack.push(neighbor);
        }
        if (visited.size !== graph.equations.length) {
            issues.push(graphIssue("DISCONNECTED_GRAPH", "Equation graph must form one connected component."));
        }
    }
    return { valid: issues.length === 0, issues };
}
