"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExpressionGenerator_1 = require("../../src/engine/math/ExpressionGenerator");
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
    }
}
const baseOptions = {
    minimumOperand: 1,
    maximumOperand: 5,
    minimumTarget: 1,
    maximumTarget: 25,
};
const tests = [
    [
        "generator produces expressions",
        () => {
            const expressions = (0, ExpressionGenerator_1.generateExpressionArray)(baseOptions);
            assert(expressions.length > 0, "Generator produced no expressions.");
        },
    ],
    [
        "results stay within target range",
        () => {
            const expressions = (0, ExpressionGenerator_1.generateExpressionArray)(baseOptions);
            for (const expression of expressions) {
                assert(expression.result >= baseOptions.minimumTarget &&
                    expression.result <= baseOptions.maximumTarget, "Expression target outside configured range.");
            }
        },
    ],
    [
        "commutative equations are canonicalized",
        () => {
            const expressions = (0, ExpressionGenerator_1.generateExpressionArray)({
                ...baseOptions,
                allowedOperations: ["add"],
            });
            for (const expression of expressions) {
                assert(expression.left <= expression.right, "Addition expression is not canonical.");
            }
        },
    ],
    [
        "subtraction never becomes negative",
        () => {
            const expressions = (0, ExpressionGenerator_1.generateExpressionArray)({
                ...baseOptions,
                allowedOperations: ["subtract"],
            });
            for (const expression of expressions) {
                assert(expression.result >= 0, "Negative subtraction generated.");
            }
        },
    ],
    [
        "division is always integral",
        () => {
            const expressions = (0, ExpressionGenerator_1.generateExpressionArray)({
                ...baseOptions,
                allowedOperations: ["divide"],
            });
            for (const expression of expressions) {
                assert(Number.isInteger(expression.result), "Fractional division generated.");
            }
        },
    ],
    [
        "generation is deterministic",
        () => {
            const first = JSON.stringify((0, ExpressionGenerator_1.generateExpressionArray)(baseOptions));
            const second = JSON.stringify((0, ExpressionGenerator_1.generateExpressionArray)(baseOptions));
            assertEqual(first, second, "Generation is not deterministic.");
        },
    ],
];
let passed = 0;
for (const [name, test] of tests) {
    test();
    passed++;
    console.log(`PASS ${name}`);
}
console.log("");
console.log(`${passed}/${tests.length} expression-generator tests passed.`);
