"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateEquation = evaluateEquation;
const ArithmeticEngine_1 = require("./ArithmeticEngine");
const OperatorRules_1 = require("./OperatorRules");
function evaluateEquation(left, operation, right, expectedResult, policy = OperatorRules_1.DEFAULT_ARITHMETIC_POLICY) {
    const arithmetic = (0, ArithmeticEngine_1.applyArithmetic)(operation, left, right, policy);
    if (!arithmetic.ok) {
        return {
            valid: false,
            operation,
            left,
            right,
            expectedResult,
            failure: arithmetic,
        };
    }
    return {
        valid: arithmetic.result === expectedResult,
        operation,
        left,
        right,
        expectedResult,
        actualResult: arithmetic.result,
    };
}
