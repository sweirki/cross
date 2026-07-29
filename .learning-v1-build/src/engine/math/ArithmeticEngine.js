"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyArithmetic = applyArithmetic;
const OperatorRules_1 = require("./OperatorRules");
function fail(operation, left, right, code, message) {
    return {
        ok: false,
        operation,
        left,
        right,
        code,
        message,
    };
}
function validateOperand(value, side, operation, left, right, policy) {
    if (!Number.isFinite(value)) {
        return fail(operation, left, right, "NON_FINITE_OPERAND", `${side} operand must be finite.`);
    }
    if (policy.requireIntegerOperands && !Number.isInteger(value)) {
        return fail(operation, left, right, "NON_INTEGER_OPERAND", `${side} operand must be an integer.`);
    }
    return null;
}
function calculateRaw(operation, left, right) {
    switch (operation) {
        case "add":
            return left + right;
        case "subtract":
            return left - right;
        case "multiply":
            return left * right;
        case "divide":
            return left / right;
    }
}
function applyArithmetic(operation, left, right, policy = OperatorRules_1.DEFAULT_ARITHMETIC_POLICY) {
    const leftFailure = validateOperand(left, "left", operation, left, right, policy);
    if (leftFailure) {
        return leftFailure;
    }
    const rightFailure = validateOperand(right, "right", operation, left, right, policy);
    if (rightFailure) {
        return rightFailure;
    }
    if (operation === "divide" && right === 0) {
        return fail(operation, left, right, "DIVISION_BY_ZERO", "Division by zero is forbidden.");
    }
    const result = calculateRaw(operation, left, right);
    if (!Number.isSafeInteger(result) && Number.isInteger(result)) {
        return fail(operation, left, right, "UNSAFE_INTEGER_RESULT", "Result exceeds the safe integer range.");
    }
    if (policy.requireIntegerResults && !Number.isInteger(result)) {
        return fail(operation, left, right, operation === "divide"
            ? "NON_INTEGER_DIVISION"
            : "RESULT_OUT_OF_RANGE", "Result must be an integer.");
    }
    if (!policy.allowNegativeResults && result < 0) {
        return fail(operation, left, right, "NEGATIVE_RESULT_FORBIDDEN", "Negative results are forbidden by policy.");
    }
    if (!policy.allowZeroResults && result === 0) {
        return fail(operation, left, right, "ZERO_RESULT_FORBIDDEN", "Zero results are forbidden by policy.");
    }
    if (result < policy.minimumValue ||
        result > policy.maximumValue) {
        return fail(operation, left, right, "RESULT_OUT_OF_RANGE", `Result must be between ${policy.minimumValue} and ${policy.maximumValue}.`);
    }
    return {
        ok: true,
        operation,
        left,
        right,
        result,
    };
}
