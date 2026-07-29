"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformClusterTemplate = transformClusterTemplate;
exports.canonicalClusterSignature = canonicalClusterSignature;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
function transformPoint(row, col, transform) {
    switch (transform) {
        case "identity": return { row, col };
        case "rotate-90": return { row: col, col: -row };
        case "rotate-180": return { row: -row, col: -col };
        case "rotate-270": return { row: -col, col: row };
        case "reflect-horizontal": return { row: -row, col };
        case "reflect-vertical": return { row, col: -col };
    }
}
function transformDirection(direction, transform) {
    const vectors = {
        north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1],
    };
    const [row, col] = vectors[direction];
    const point = transformPoint(row, col, transform);
    if (point.row === -1 && point.col === 0)
        return "north";
    if (point.row === 0 && point.col === 1)
        return "east";
    if (point.row === 1 && point.col === 0)
        return "south";
    return "west";
}
function transformClusterTemplate(template, transform) {
    if (!template.allowedTransforms.includes(transform)) {
        throw new Error(`Transform ${transform} is not allowed for ${template.id}.`);
    }
    const raw = template.cells.map((cell) => ({
        ...cell,
        position: transformPoint(cell.position.row, cell.position.col, transform),
    }));
    const minRow = Math.min(...raw.map((cell) => cell.position.row));
    const minCol = Math.min(...raw.map((cell) => cell.position.col));
    const positionById = new Map(raw.map((cell) => [cell.id, {
            row: cell.position.row - minRow,
            col: cell.position.col - minCol,
        }]));
    const orientationFlips = transform === "rotate-90" || transform === "rotate-270";
    const equations = template.equations.map((equation) => {
        const orientation = orientationFlips
            ? equation.orientation === "horizontal" ? "vertical" : "horizontal"
            : equation.orientation;
        const ordered = [...equation.cellIds].sort((left, right) => {
            const a = positionById.get(left);
            const b = positionById.get(right);
            return orientation === "horizontal" ? a.col - b.col : a.row - b.row;
        });
        return {
            ...equation,
            orientation,
            cellIds: ordered,
        };
    });
    const expectedKinds = ["number", "operator", "number", "equals", "number"];
    const kindById = new Map();
    for (const equation of equations) {
        equation.cellIds.forEach((cellId, index) => {
            const kind = expectedKinds[index];
            const existing = kindById.get(cellId);
            if (existing && existing !== kind) {
                throw new Error(`Transform ${transform} creates an illegal overlap in ${template.id}.`);
            }
            kindById.set(cellId, kind);
        });
    }
    const cells = template.cells.map((cell) => ({
        id: cell.id,
        position: positionById.get(cell.id),
        kind: kindById.get(cell.id) ?? cell.kind,
    }));
    return {
        ...template,
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.clusterTemplate,
        id: `${template.id}@${transform}`,
        cells,
        equations,
        ports: template.ports.map((port) => ({
            ...port,
            direction: transformDirection(port.direction, transform),
        })),
    };
}
function geometrySignature(template) {
    const positionById = new Map(template.cells.map((cell) => [cell.id, `${cell.position.row},${cell.position.col}`]));
    const cells = template.cells
        .map((cell) => `${cell.position.row},${cell.position.col}:${cell.kind}`)
        .sort()
        .join("|");
    const equations = template.equations
        .map((equation) => equation.cellIds.map((id) => positionById.get(id)).join(">"))
        .sort()
        .join("|");
    return `${cells}#${equations}`;
}
function canonicalClusterSignature(template) {
    return [...template.allowedTransforms]
        .map((transform) => geometrySignature(transformClusterTemplate(template, transform)))
        .sort()[0];
}
