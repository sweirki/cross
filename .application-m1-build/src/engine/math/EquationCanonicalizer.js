"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeEquation = canonicalizeEquation;
exports.serializeCanonicalEquation = serializeCanonicalEquation;
function isCommutative(operation) {
    return operation === "add" || operation === "multiply";
}
function canonicalizeEquation(equation) {
    if (isCommutative(equation.operation) &&
        equation.left > equation.right) {
        return {
            left: equation.right,
            operation: equation.operation,
            right: equation.left,
            result: equation.result,
        };
    }
    return equation;
}
function serializeCanonicalEquation(equation) {
    const canonical = canonicalizeEquation(equation);
    return [
        canonical.left,
        canonical.operation,
        canonical.right,
        canonical.result,
    ].join("|");
}
