"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeOrganicTopology = analyzeOrganicTopology;
exports.serializeOrganicTopologyMetrics = serializeOrganicTopologyMetrics;
const board_1 = require("../../board");
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function coordinateKey(position) {
    return `${position.row}:${position.column}`;
}
function symmetryRatio(positions, axis) {
    if (positions.length === 0)
        return 1;
    const rows = positions.map((position) => position.row);
    const columns = positions.map((position) => position.column);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minColumn = Math.min(...columns);
    const maxColumn = Math.max(...columns);
    const occupied = new Set(positions.map(coordinateKey));
    let matches = 0;
    for (const position of positions) {
        const reflected = axis === "horizontal"
            ? { row: maxRow - (position.row - minRow), column: position.column }
            : { row: position.row, column: maxColumn - (position.column - minColumn) };
        if (occupied.has(coordinateKey(reflected)))
            matches += 1;
    }
    return clamp01(matches / positions.length);
}
/**
 * Derives deterministic layout-quality metrics from canonical topology data.
 * No generation state, arithmetic values, or runtime state is required.
 */
function analyzeOrganicTopology(topology) {
    const shape = (0, board_1.analyzeTopologyShape)(topology);
    const degreeByEquation = new Map(topology.equations.map((equation) => [equation.id, 0]));
    for (const intersection of shape.intersections) {
        for (const equationId of intersection.equationIds) {
            degreeByEquation.set(equationId, (degreeByEquation.get(equationId) ?? 0) + 1);
        }
    }
    const connectivity = [...degreeByEquation.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([equationId, degree]) => ({
        equationId,
        degree,
        deadEnd: degree <= 1,
        branching: degree >= 2,
    }));
    const deadEndCount = connectivity.filter((entry) => entry.deadEnd).length;
    const middleIntersectionRatio = shape.intersectionCount === 0
        ? 0
        : shape.middleIntersectionCount / shape.intersectionCount;
    const endpointIntersectionRatio = shape.intersectionCount === 0
        ? 0
        : shape.endpointOnlyIntersectionCount / shape.intersectionCount;
    const averageEquationDegree = shape.equationCount === 0
        ? 0
        : connectivity.reduce((sum, entry) => sum + entry.degree, 0) /
            shape.equationCount;
    const horizontalSymmetry = symmetryRatio(topology.nodes.map((node) => node.position), "horizontal");
    const verticalSymmetry = symmetryRatio(topology.nodes.map((node) => node.position), "vertical");
    const symmetry = Math.max(horizontalSymmetry, verticalSymmetry);
    return {
        equationCount: shape.equationCount,
        intersectionCount: shape.intersectionCount,
        middleIntersectionRatio,
        endpointIntersectionRatio,
        averageEquationDegree,
        branchingEquationRatio: shape.equationCount === 0
            ? 0
            : shape.branchingEquationCount / shape.equationCount,
        deadEndCount,
        deadEndRatio: shape.equationCount === 0 ? 0 : deadEndCount / shape.equationCount,
        boundingWidth: shape.boundingWidth,
        boundingHeight: shape.boundingHeight,
        aspectRatio: shape.boundingWidth === 0 || shape.boundingHeight === 0
            ? 0
            : Math.max(shape.boundingWidth, shape.boundingHeight) /
                Math.min(shape.boundingWidth, shape.boundingHeight),
        occupiedCellCount: shape.occupiedCellCount,
        density: shape.boundingDensity,
        horizontalSymmetry,
        verticalSymmetry,
        symmetry,
        irregularity: 1 - symmetry,
        connectivity,
    };
}
function serializeOrganicTopologyMetrics(metrics) {
    return JSON.stringify(metrics);
}
