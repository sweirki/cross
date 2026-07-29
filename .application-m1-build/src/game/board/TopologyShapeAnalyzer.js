"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTopologyShape = analyzeTopologyShape;
exports.serializeTopologyShapeAnalysis = serializeTopologyShapeAnalysis;
const ROLE_BY_INDEX = {
    0: "left",
    2: "middle",
    4: "result",
};
function equationRole(equation, nodeId) {
    const index = equation.nodeIds.indexOf(nodeId);
    return ROLE_BY_INDEX[index];
}
/**
 * Computes deterministic structural metrics from canonical topology data.
 *
 * This analyzer does not mutate or validate the topology. It intentionally
 * derives all information from stable equation/node identifiers so the result
 * can be used by generation tests, balancing tools, and content reports.
 */
function analyzeTopologyShape(topology) {
    const equationsByNode = new Map();
    for (const equation of topology.equations) {
        for (const nodeId of equation.nodeIds) {
            const equations = equationsByNode.get(nodeId) ?? [];
            equations.push(equation);
            equationsByNode.set(nodeId, equations);
        }
    }
    const intersections = [];
    for (const node of topology.nodes) {
        if (node.kind !== "number")
            continue;
        const equations = [...(equationsByNode.get(node.id) ?? [])]
            .sort((left, right) => left.id.localeCompare(right.id));
        if (equations.length !== 2)
            continue;
        const leftRole = equationRole(equations[0], node.id);
        const rightRole = equationRole(equations[1], node.id);
        if (leftRole === undefined || rightRole === undefined)
            continue;
        const roles = [leftRole, rightRole];
        const middleConnected = roles.includes("middle");
        intersections.push({
            nodeId: node.id,
            equationIds: [equations[0].id, equations[1].id],
            roles,
            middleConnected,
            endpointOnly: !middleConnected,
        });
    }
    intersections.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
    const degrees = new Map();
    for (const equation of topology.equations)
        degrees.set(equation.id, 0);
    for (const intersection of intersections) {
        for (const equationId of intersection.equationIds) {
            degrees.set(equationId, (degrees.get(equationId) ?? 0) + 1);
        }
    }
    const rows = topology.nodes.map((node) => node.position.row);
    const columns = topology.nodes.map((node) => node.position.column);
    const boundingHeight = rows.length === 0 ? 0 : Math.max(...rows) - Math.min(...rows) + 1;
    const boundingWidth = columns.length === 0 ? 0 : Math.max(...columns) - Math.min(...columns) + 1;
    const boundingArea = boundingWidth * boundingHeight;
    return {
        equationCount: topology.equations.length,
        intersectionCount: intersections.length,
        middleIntersectionCount: intersections.filter((intersection) => intersection.middleConnected).length,
        endpointOnlyIntersectionCount: intersections.filter((intersection) => intersection.endpointOnly).length,
        branchingEquationCount: [...degrees.values()].filter((degree) => degree >= 2)
            .length,
        boundingWidth,
        boundingHeight,
        occupiedCellCount: topology.nodes.length,
        boundingDensity: boundingArea === 0 ? 0 : topology.nodes.length / boundingArea,
        intersections,
    };
}
function serializeTopologyShapeAnalysis(analysis) {
    return JSON.stringify(analysis);
}
