"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEquationFillPlan = validateEquationFillPlan;
exports.assertValidEquationFillPlan = assertValidEquationFillPlan;
const ArithmeticEngine_1 = require("../../engine/math/ArithmeticEngine");
const ClusterLibrary_1 = require("../clusters/ClusterLibrary");
const ClusterTransforms_1 = require("../clusters/ClusterTransforms");
const ArithmeticProfiles_1 = require("./ArithmeticProfiles");
const OPERATION = {
    "+": "add", "-": "subtract", "×": "multiply", "÷": "divide",
};
function validateEquationFillPlan(difficulty, composition, plan) {
    const errors = [];
    const profile = (0, ArithmeticProfiles_1.arithmeticProfileForDifficulty)(difficulty);
    for (const cluster of composition.clusters) {
        const template = (0, ClusterTransforms_1.transformClusterTemplate)((0, ClusterLibrary_1.getClusterTemplate)(cluster.templateId), cluster.transform);
        for (const equation of template.equations) {
            const sourceId = `${cluster.id}:${equation.id.split(":").pop()}`;
            const operator = plan.operators[sourceId];
            if (!operator) {
                errors.push(`Missing operator for ${sourceId}.`);
                continue;
            }
            if (!profile.operators.includes(operator))
                errors.push(`Operator ${operator} is not allowed for ${difficulty}.`);
            const ids = [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]].map((id) => cluster.cellIdMap[id]);
            const values = ids.map((id) => plan.values[id]);
            if (values.some((value) => value === undefined)) {
                errors.push(`Missing value for ${sourceId}.`);
                continue;
            }
            const result = (0, ArithmeticEngine_1.applyArithmetic)(OPERATION[operator], values[0], values[1], profile.policy);
            if (!result.ok || result.result !== values[2])
                errors.push(`Invalid arithmetic for ${sourceId}.`);
        }
    }
    const numberCells = composition.occupiedCells.filter((cell) => cell.kind === "number").map((cell) => cell.cellId);
    for (const id of numberCells)
        if (plan.values[id] === undefined)
            errors.push(`Missing number cell ${id}.`);
    for (const id of Object.keys(plan.values))
        if (!numberCells.includes(id))
            errors.push(`Unknown number cell ${id}.`);
    return { valid: errors.length === 0, errors: Object.freeze(errors) };
}
function assertValidEquationFillPlan(difficulty, composition, plan) {
    const validation = validateEquationFillPlan(difficulty, composition, plan);
    if (!validation.valid)
        throw new Error(`Invalid equation fill plan: ${validation.errors.join(" ")}`);
}
