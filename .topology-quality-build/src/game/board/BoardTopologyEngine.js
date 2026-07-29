"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBoardTopology = buildBoardTopology;
exports.serializeBoardTopology = serializeBoardTopology;
const OFFSETS = [0, 1, 2, 3, 4];
function positionKey(position) {
    return `${position.row}:${position.column}`;
}
function nodeId(position) {
    return `node-r${position.row}-c${position.column}`;
}
function positionAt(placement, offset) {
    return placement.orientation === "horizontal"
        ? {
            row: placement.start.row,
            column: placement.start.column + offset,
        }
        : {
            row: placement.start.row + offset,
            column: placement.start.column,
        };
}
function nodeFor(placement, position, offset) {
    const id = nodeId(position);
    if (offset === 1) {
        return {
            id,
            kind: "operator",
            position,
            operator: placement.operator,
        };
    }
    if (offset === 3) {
        return {
            id,
            kind: "equals",
            position,
        };
    }
    return {
        id,
        kind: "number",
        position,
    };
}
function assertCompatibleNode(existing, incoming) {
    if (existing.kind !== "number" || incoming.kind !== "number") {
        throw new Error(`Illegal intersection at ${positionKey(existing.position)}: ` +
            `${existing.kind} cannot overlap ${incoming.kind}.`);
    }
}
/**
 * Constructs an immutable topology from deterministic equation placements.
 *
 * Placements are processed in the supplied order. Nodes and equations in the
 * result are sorted by stable identifiers so equivalent requests serialize
 * identically regardless of object allocation order.
 */
function buildBoardTopology(request) {
    if (!Number.isInteger(request.width) || request.width <= 0) {
        throw new Error("Topology width must be a positive integer.");
    }
    if (!Number.isInteger(request.height) || request.height <= 0) {
        throw new Error("Topology height must be a positive integer.");
    }
    const nodesByPosition = new Map();
    const equationIds = new Set();
    const equations = [];
    for (const placement of request.equations) {
        if (equationIds.has(placement.id)) {
            throw new Error(`Duplicate equation ID: ${placement.id}.`);
        }
        equationIds.add(placement.id);
        const ids = [];
        for (const offset of OFFSETS) {
            const position = positionAt(placement, offset);
            if (position.row < 0 ||
                position.row >= request.height ||
                position.column < 0 ||
                position.column >= request.width) {
                throw new Error(`Equation ${placement.id} exceeds board bounds at ` +
                    `${positionKey(position)}.`);
            }
            const incoming = nodeFor(placement, position, offset);
            const key = positionKey(position);
            const existing = nodesByPosition.get(key);
            if (existing !== undefined) {
                assertCompatibleNode(existing, incoming);
                ids.push(existing.id);
            }
            else {
                nodesByPosition.set(key, incoming);
                ids.push(incoming.id);
            }
        }
        equations.push({
            id: placement.id,
            orientation: placement.orientation,
            nodeIds: ids,
        });
    }
    return {
        width: request.width,
        height: request.height,
        nodes: [...nodesByPosition.values()].sort((left, right) => left.id.localeCompare(right.id)),
        equations: equations.sort((left, right) => left.id.localeCompare(right.id)),
    };
}
function serializeBoardTopology(topology) {
    return JSON.stringify(topology);
}
