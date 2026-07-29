"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectCompositionPlan = inspectCompositionPlan;
exports.assertValidCompositionPlan = assertValidCompositionPlan;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
function inspectCompositionPlan(plan) {
    const errors = [];
    if (plan.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.compositionPlan)
        errors.push("wrong composition-plan schema");
    if (!Number.isInteger(plan.rows) || plan.rows <= 0)
        errors.push("rows must be a positive integer");
    if (!Number.isInteger(plan.columns) || plan.columns <= 0)
        errors.push("columns must be a positive integer");
    if (plan.clusters.length === 0)
        errors.push("composition must contain clusters");
    const clusterIds = new Set();
    for (const cluster of plan.clusters) {
        if (cluster.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.clusterInstance)
            errors.push(`cluster ${cluster.id} has wrong schema`);
        if (clusterIds.has(cluster.id))
            errors.push(`duplicate cluster id ${cluster.id}`);
        clusterIds.add(cluster.id);
        if (!Number.isInteger(cluster.origin.row) || !Number.isInteger(cluster.origin.col)) {
            errors.push(`cluster ${cluster.id} has non-integer origin`);
        }
    }
    const positions = new Set();
    const cellIds = new Set();
    for (const cell of plan.occupiedCells) {
        const key = `${cell.position.row}:${cell.position.col}`;
        if (positions.has(key))
            errors.push(`overlapping occupied cell at ${key}`);
        positions.add(key);
        if (cellIds.has(cell.cellId))
            errors.push(`duplicate occupied cell id ${cell.cellId}`);
        cellIds.add(cell.cellId);
        if (cell.position.row < 0 || cell.position.col < 0 ||
            cell.position.row >= plan.rows || cell.position.col >= plan.columns) {
            errors.push(`occupied cell ${cell.cellId} is out of bounds`);
        }
        if (cell.clusterIds.length !== 1 || !clusterIds.has(cell.clusterIds[0] ?? "")) {
            errors.push(`occupied cell ${cell.cellId} has invalid cluster ownership`);
        }
    }
    for (const cluster of plan.clusters) {
        const mapped = Object.values(cluster.cellIdMap);
        if (mapped.length === 0)
            errors.push(`cluster ${cluster.id} has no mapped cells`);
        for (const id of mapped) {
            if (!cellIds.has(id))
                errors.push(`cluster ${cluster.id} maps unknown cell ${id}`);
        }
    }
    return { valid: errors.length === 0, errors };
}
function assertValidCompositionPlan(plan) {
    const result = inspectCompositionPlan(plan);
    if (!result.valid)
        throw new Error(`Invalid composition ${plan.id}: ${result.errors.join("; ")}`);
}
