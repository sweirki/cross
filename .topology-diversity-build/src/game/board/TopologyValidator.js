"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologyValidator = exports.DeterministicTopologyValidator = void 0;
exports.validateBoardTopology = validateBoardTopology;
const EXPECTED_PATTERN = [
    "number",
    "operator",
    "number",
    "equals",
    "number",
];
function positionKey(node) {
    return `${node.position.row}:${node.position.column}`;
}
function issue(code, message, context = {}) {
    return { code, message, ...context };
}
function validatePathGeometry(equation, nodes) {
    if (nodes.length !== 5) {
        return false;
    }
    const [first] = nodes;
    return nodes.every((node, index) => {
        if (equation.orientation === "horizontal") {
            return (node.position.row === first.position.row &&
                node.position.column === first.position.column + index);
        }
        return (node.position.column === first.position.column &&
            node.position.row === first.position.row + index);
    });
}
class DeterministicTopologyValidator {
    validate(topology) {
        const issues = [];
        if (!Number.isInteger(topology.width) ||
            topology.width <= 0 ||
            !Number.isInteger(topology.height) ||
            topology.height <= 0) {
            issues.push(issue("INVALID_DIMENSIONS", "Board dimensions must be positive integers."));
        }
        const nodesById = new Map();
        const nodesByPosition = new Map();
        for (const node of topology.nodes) {
            if (nodesById.has(node.id)) {
                issues.push(issue("DUPLICATE_NODE_ID", `Duplicate node ID: ${node.id}.`, {
                    nodeId: node.id,
                }));
            }
            else {
                nodesById.set(node.id, node);
            }
            if (node.position.row < 0 ||
                node.position.row >= topology.height ||
                node.position.column < 0 ||
                node.position.column >= topology.width) {
                issues.push(issue("POSITION_OUT_OF_BOUNDS", `Node ${node.id} lies outside the board.`, { nodeId: node.id }));
            }
            const key = positionKey(node);
            if (nodesByPosition.has(key)) {
                issues.push(issue("DUPLICATE_POSITION", `Multiple nodes occupy ${key}.`, { nodeId: node.id }));
            }
            else {
                nodesByPosition.set(key, node);
            }
        }
        const equationIds = new Set();
        const participation = new Map();
        const signatures = new Set();
        for (const equation of topology.equations) {
            if (equationIds.has(equation.id)) {
                issues.push(issue("DUPLICATE_EQUATION_ID", `Duplicate equation ID: ${equation.id}.`, { equationId: equation.id }));
            }
            equationIds.add(equation.id);
            const signature = `${equation.orientation}:${equation.nodeIds.join(",")}`;
            if (signatures.has(signature)) {
                issues.push(issue("INVALID_EQUATION_PATH", `Equation ${equation.id} duplicates an existing path.`, { equationId: equation.id }));
            }
            signatures.add(signature);
            const referenced = [];
            let missingReference = false;
            for (const nodeId of equation.nodeIds) {
                const node = nodesById.get(nodeId);
                if (node === undefined) {
                    missingReference = true;
                    issues.push(issue("MISSING_NODE_REFERENCE", `Equation ${equation.id} references missing node ${nodeId}.`, { nodeId, equationId: equation.id }));
                    continue;
                }
                referenced.push(node);
                const counts = participation.get(nodeId) ?? {
                    horizontal: 0,
                    vertical: 0,
                };
                counts[equation.orientation] += 1;
                participation.set(nodeId, counts);
            }
            if (!missingReference && referenced.length === 5) {
                const validPattern = referenced.every((node, index) => node.kind === EXPECTED_PATTERN[index]);
                if (!validPattern) {
                    issues.push(issue("INVALID_EQUATION_PATTERN", `Equation ${equation.id} does not follow number-operator-number-equals-number.`, { equationId: equation.id }));
                }
                if (!validatePathGeometry(equation, referenced)) {
                    issues.push(issue("INVALID_EQUATION_PATH", `Equation ${equation.id} is not a contiguous straight path.`, { equationId: equation.id }));
                }
            }
        }
        let genuineIntersections = 0;
        for (const node of topology.nodes) {
            const counts = participation.get(node.id) ?? {
                horizontal: 0,
                vertical: 0,
            };
            const total = counts.horizontal + counts.vertical;
            if (node.kind === "number") {
                if (counts.horizontal > 1 || counts.vertical > 1 || total > 2) {
                    issues.push(issue("NODE_PARTICIPATION_EXCEEDED", `Number node ${node.id} exceeds participation limits.`, { nodeId: node.id }));
                }
                if (counts.horizontal === 1 && counts.vertical === 1) {
                    genuineIntersections += 1;
                }
            }
            else {
                if (total > 1) {
                    issues.push(issue("ILLEGAL_INTERSECTION", `${node.kind} node ${node.id} is shared by equations.`, { nodeId: node.id }));
                }
                if (total !== 1) {
                    issues.push(issue("NODE_PARTICIPATION_EXCEEDED", `${node.kind} node ${node.id} must belong to exactly one equation.`, { nodeId: node.id }));
                }
            }
        }
        if (topology.equations.length > 1) {
            const adjacency = new Map();
            for (const equation of topology.equations) {
                adjacency.set(equation.id, new Set());
            }
            const equationsByNode = new Map();
            for (const equation of topology.equations) {
                for (const nodeId of equation.nodeIds) {
                    const list = equationsByNode.get(nodeId) ?? [];
                    list.push(equation.id);
                    equationsByNode.set(nodeId, list);
                }
            }
            for (const [nodeId, ids] of equationsByNode) {
                const node = nodesById.get(nodeId);
                if (node?.kind !== "number") {
                    continue;
                }
                for (const left of ids) {
                    for (const right of ids) {
                        if (left !== right) {
                            adjacency.get(left)?.add(right);
                        }
                    }
                }
            }
            const first = topology.equations[0]?.id;
            const visited = new Set();
            if (first !== undefined) {
                const stack = [first];
                while (stack.length > 0) {
                    const current = stack.pop();
                    if (current === undefined || visited.has(current)) {
                        continue;
                    }
                    visited.add(current);
                    for (const neighbor of adjacency.get(current) ?? []) {
                        stack.push(neighbor);
                    }
                }
            }
            if (visited.size !== topology.equations.length) {
                issues.push(issue("DISCONNECTED_EQUATION_GRAPH", "All equations must form one connected component."));
            }
        }
        if (genuineIntersections === 0) {
            issues.push(issue("NO_GENUINE_INTERSECTION", "At least one horizontal/vertical number intersection is required."));
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
}
exports.DeterministicTopologyValidator = DeterministicTopologyValidator;
exports.topologyValidator = new DeterministicTopologyValidator();
function validateBoardTopology(topology) {
    return exports.topologyValidator.validate(topology);
}
