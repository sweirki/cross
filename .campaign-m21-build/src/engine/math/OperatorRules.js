"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARITHMETIC_OPERATIONS = exports.DEFAULT_ARITHMETIC_POLICY = void 0;
exports.isArithmeticOperation = isArithmeticOperation;
exports.getOperationSymbol = getOperationSymbol;
exports.DEFAULT_ARITHMETIC_POLICY = Object.freeze({
    minimumValue: 0,
    maximumValue: 100,
    requireIntegerOperands: true,
    requireIntegerResults: true,
    allowNegativeResults: false,
    allowZeroResults: true,
});
exports.ARITHMETIC_OPERATIONS = Object.freeze([
    "add",
    "subtract",
    "multiply",
    "divide",
]);
function isArithmeticOperation(value) {
    return (value === "add" ||
        value === "subtract" ||
        value === "multiply" ||
        value === "divide");
}
function getOperationSymbol(operation) {
    switch (operation) {
        case "add":
            return "+";
        case "subtract":
            return "-";
        case "multiply":
            return "Ã—";
        case "divide":
            return "Ã·";
    }
}
