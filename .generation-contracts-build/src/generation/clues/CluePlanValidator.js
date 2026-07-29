"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCluePlan = validateCluePlan;
exports.assertValidCluePlan = assertValidCluePlan;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const DeductionSimulator_1 = require("./DeductionSimulator");
function sorted(values) {
    return [...values].sort();
}
function validateCluePlan(composition, fill, plan) {
    const errors = [];
    if (plan.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.cluePlan)
        errors.push("Unsupported clue-plan schema.");
    const numberIds = sorted(composition.occupiedCells.filter((cell) => cell.kind === "number").map((cell) => cell.cellId));
    const givens = sorted(plan.givenCellIds);
    const hidden = sorted(plan.hiddenCellIds);
    if (new Set(givens).size !== givens.length)
        errors.push("Given cell IDs contain duplicates.");
    if (new Set(hidden).size !== hidden.length)
        errors.push("Hidden cell IDs contain duplicates.");
    if (givens.some((id) => hidden.includes(id)))
        errors.push("Given and hidden cell sets overlap.");
    if (sorted([...givens, ...hidden]).join("|") !== numberIds.join("|"))
        errors.push("Clue cells do not cover all number cells.");
    const expectedBank = hidden.map((id) => fill.values[id]).filter((value) => value !== undefined).sort((a, b) => a - b);
    const actualBank = [...plan.numberBank].sort((a, b) => a - b);
    if (expectedBank.join("|") !== actualBank.join("|"))
        errors.push("Number bank does not match hidden-cell values.");
    if (Object.keys(fill.values).some((id) => fill.values[id] === undefined))
        errors.push("Fill plan contains undefined values.");
    if (errors.length === 0) {
        const trace = (0, DeductionSimulator_1.simulateDeductions)(composition, fill, plan);
        if (!trace.solved)
            errors.push(`Clue plan stalls with ${trace.unresolvedCellIds.length} unresolved cells.`);
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
function assertValidCluePlan(composition, fill, plan) {
    const result = validateCluePlan(composition, fill, plan);
    if (!result.valid)
        throw new Error(`Invalid clue plan: ${result.errors.join("; ")}`);
}
