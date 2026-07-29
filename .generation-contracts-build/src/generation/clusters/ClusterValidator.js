"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateClusterTemplate = validateClusterTemplate;
exports.assertValidClusterTemplate = assertValidClusterTemplate;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const EXPECTED_KINDS = [
    "number",
    "operator",
    "number",
    "equals",
    "number",
];
function positionKey(row, col) {
    return `${row}:${col}`;
}
function validateClusterTemplate(template) {
    const errors = [];
    if (template.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.clusterTemplate) {
        errors.push("wrong cluster-template schema");
    }
    if (template.id.trim() === "")
        errors.push("template id is empty");
    if (template.canonicalId.trim() === "")
        errors.push("canonical id is empty");
    if (template.cells.length === 0)
        errors.push("template has no cells");
    if (template.equations.length < 2)
        errors.push("template must contain at least two equations");
    const cellsById = new Map();
    const cellsByPosition = new Map();
    for (const cell of template.cells) {
        if (cellsById.has(cell.id))
            errors.push(`duplicate cell id ${cell.id}`);
        cellsById.set(cell.id, cell);
        const key = positionKey(cell.position.row, cell.position.col);
        if (cellsByPosition.has(key))
            errors.push(`duplicate cell position ${key}`);
        cellsByPosition.set(key, cell);
        if (!Number.isInteger(cell.position.row) || !Number.isInteger(cell.position.col)) {
            errors.push(`cell ${cell.id} has non-integer coordinates`);
        }
        if (cell.position.row < 0 || cell.position.col < 0) {
            errors.push(`cell ${cell.id} has negative coordinates`);
        }
    }
    const equationIds = new Set();
    const usage = new Map();
    for (const equation of template.equations) {
        if (equationIds.has(equation.id))
            errors.push(`duplicate equation id ${equation.id}`);
        equationIds.add(equation.id);
        if (new Set(equation.cellIds).size !== 5) {
            errors.push(`equation ${equation.id} must reference five distinct cells`);
            continue;
        }
        const cells = equation.cellIds.map((id) => cellsById.get(id));
        if (cells.some((cell) => cell === undefined)) {
            errors.push(`equation ${equation.id} references an unknown cell`);
            continue;
        }
        const resolved = cells;
        resolved.forEach((cell, index) => {
            usage.set(cell.id, (usage.get(cell.id) ?? 0) + 1);
            if (cell.kind !== EXPECTED_KINDS[index]) {
                errors.push(`equation ${equation.id} has ${cell.kind} at index ${index}`);
            }
        });
        for (let index = 1; index < resolved.length; index += 1) {
            const before = resolved[index - 1].position;
            const after = resolved[index].position;
            const rowDelta = after.row - before.row;
            const colDelta = after.col - before.col;
            const expected = equation.orientation === "horizontal"
                ? rowDelta === 0 && colDelta === 1
                : rowDelta === 1 && colDelta === 0;
            if (!expected)
                errors.push(`equation ${equation.id} is not contiguous`);
        }
    }
    for (const [cellId, count] of usage) {
        if (count > 1 && cellsById.get(cellId)?.kind !== "number") {
            errors.push(`shared cell ${cellId} must be a number`);
        }
    }
    const equationAdjacency = new Map();
    for (const equation of template.equations)
        equationAdjacency.set(equation.id, new Set());
    for (let left = 0; left < template.equations.length; left += 1) {
        for (let right = left + 1; right < template.equations.length; right += 1) {
            const a = template.equations[left];
            const b = template.equations[right];
            if (a.cellIds.some((cellId) => b.cellIds.includes(cellId))) {
                equationAdjacency.get(a.id)?.add(b.id);
                equationAdjacency.get(b.id)?.add(a.id);
            }
        }
    }
    if (template.equations.length > 0) {
        const visited = new Set();
        const pending = [template.equations[0].id];
        while (pending.length > 0) {
            const current = pending.pop();
            if (visited.has(current))
                continue;
            visited.add(current);
            for (const neighbor of equationAdjacency.get(current) ?? [])
                pending.push(neighbor);
        }
        if (visited.size !== template.equations.length)
            errors.push("equation graph is disconnected");
    }
    const portIds = new Set();
    for (const port of template.ports) {
        if (portIds.has(port.id))
            errors.push(`duplicate port id ${port.id}`);
        portIds.add(port.id);
        const cell = cellsById.get(port.cellId);
        if (!cell)
            errors.push(`port ${port.id} references an unknown cell`);
        else if (cell.kind !== "number")
            errors.push(`port ${port.id} must reference a number cell`);
    }
    const rows = template.cells.length === 0
        ? 0
        : Math.max(...template.cells.map((cell) => cell.position.row)) + 1;
    const columns = template.cells.length === 0
        ? 0
        : Math.max(...template.cells.map((cell) => cell.position.col)) + 1;
    const intersectionCount = [...usage.values()].filter((count) => count > 1).length;
    const edgeCount = [...equationAdjacency.values()]
        .reduce((total, neighbors) => total + neighbors.size, 0) / 2;
    const cycleRank = Math.max(0, edgeCount - template.equations.length + 1);
    return {
        valid: errors.length === 0,
        errors,
        metrics: {
            rows,
            columns,
            equationCount: template.equations.length,
            intersectionCount,
            cycleRank,
            portCount: template.ports.length,
        },
    };
}
function assertValidClusterTemplate(template) {
    const result = validateClusterTemplate(template);
    if (!result.valid) {
        throw new Error(`Invalid cluster ${template.id}: ${result.errors.join("; ")}`);
    }
}
