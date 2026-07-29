"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVersionedContract = validateVersionedContract;
exports.validateGenerationRequest = validateGenerationRequest;
exports.validateCompositionPlan = validateCompositionPlan;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
function assertNonEmpty(value, name) {
    if (value.trim().length === 0)
        throw new Error(`${name} must not be empty.`);
}
function assertPositiveInteger(value, name) {
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${name} must be a positive integer.`);
    }
}
function validateVersionedContract(contract) {
    (0, SchemaVersions_1.assertSupportedGenerationSchema)(contract.schema);
}
function validateGenerationRequest(request) {
    validateVersionedContract(request);
    if (request.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.generationRequest) {
        throw new Error("GenerationRequest has the wrong schema.");
    }
    assertNonEmpty(request.requestId, "requestId");
    assertNonEmpty(request.rootSeed, "rootSeed");
    assertNonEmpty(request.generatorVersion, "generatorVersion");
    assertPositiveInteger(request.candidateCount, "candidateCount");
    const c = request.constraints;
    const pairs = [
        [c.minimumRows, c.maximumRows, "rows"],
        [c.minimumColumns, c.maximumColumns, "columns"],
    ];
    for (const [minimum, maximum, name] of pairs) {
        if (minimum !== undefined)
            assertPositiveInteger(minimum, `minimum ${name}`);
        if (maximum !== undefined)
            assertPositiveInteger(maximum, `maximum ${name}`);
        if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
            throw new Error(`minimum ${name} must not exceed maximum ${name}.`);
        }
    }
}
function validateCompositionPlan(plan) {
    validateVersionedContract(plan);
    if (plan.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.compositionPlan) {
        throw new Error("CompositionPlan has the wrong schema.");
    }
    assertNonEmpty(plan.id, "composition id");
    assertPositiveInteger(plan.rows, "composition rows");
    assertPositiveInteger(plan.columns, "composition columns");
    const positions = new Set();
    const cellIds = new Set();
    for (const cell of plan.occupiedCells) {
        if (cell.position.row < 0 || cell.position.row >= plan.rows ||
            cell.position.col < 0 || cell.position.col >= plan.columns) {
            throw new Error(`Cell ${cell.cellId} is outside composition bounds.`);
        }
        const positionKey = `${cell.position.row}:${cell.position.col}`;
        if (positions.has(positionKey))
            throw new Error(`Duplicate occupied position ${positionKey}.`);
        if (cellIds.has(cell.cellId))
            throw new Error(`Duplicate cell id ${cell.cellId}.`);
        positions.add(positionKey);
        cellIds.add(cell.cellId);
    }
}
