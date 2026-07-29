"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExpressions = generateExpressions;
exports.generateExpressionArray = generateExpressionArray;
const ArithmeticEngine_1 = require("./ArithmeticEngine");
const EquationCanonicalizer_1 = require("./EquationCanonicalizer");
const OperatorRules_1 = require("./OperatorRules");
function uniqueSorted(operations) {
    return [...new Set(operations)].sort();
}
function* generateExpressions(options) {
    const policy = options.policy ?? OperatorRules_1.DEFAULT_ARITHMETIC_POLICY;
    const operations = uniqueSorted(options.allowedOperations ??
        OperatorRules_1.ARITHMETIC_OPERATIONS);
    for (let left = options.minimumOperand; left <= options.maximumOperand; left++) {
        for (let right = options.minimumOperand; right <= options.maximumOperand; right++) {
            for (const operation of operations) {
                const result = (0, ArithmeticEngine_1.applyArithmetic)(operation, left, right, policy);
                if (!result.ok) {
                    continue;
                }
                if (result.result < options.minimumTarget ||
                    result.result > options.maximumTarget) {
                    continue;
                }
                yield (0, EquationCanonicalizer_1.canonicalizeEquation)({
                    left,
                    operation,
                    right,
                    result: result.result,
                });
            }
        }
    }
}
function generateExpressionArray(options) {
    return [...generateExpressions(options)];
}
