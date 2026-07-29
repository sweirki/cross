"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arithmeticProfileForDifficulty = arithmeticProfileForDifficulty;
const PROFILES = {
    easy: {
        id: "arithmetic/easy/v1", difficulty: "easy",
        policy: { minimumValue: 1, maximumValue: 20, requireIntegerOperands: true, requireIntegerResults: true, allowNegativeResults: false, allowZeroResults: false },
        operators: ["+", "-"],
        operatorWeights: { "+": 6, "-": 4, "×": 0, "÷": 0 },
        maximumSearchNodes: 250_000, maximumRepeatedValueRatio: 0.95, maximumTrivialEquationRatio: 0.2,
    },
    medium: {
        id: "arithmetic/medium/v1", difficulty: "medium",
        policy: { minimumValue: 1, maximumValue: 50, requireIntegerOperands: true, requireIntegerResults: true, allowNegativeResults: false, allowZeroResults: false },
        operators: ["+", "-", "×"],
        operatorWeights: { "+": 4, "-": 3, "×": 3, "÷": 0 },
        maximumSearchNodes: 400_000, maximumRepeatedValueRatio: 0.95, maximumTrivialEquationRatio: 0.15,
    },
    hard: {
        id: "arithmetic/hard/v1", difficulty: "hard",
        policy: { minimumValue: 1, maximumValue: 100, requireIntegerOperands: true, requireIntegerResults: true, allowNegativeResults: false, allowZeroResults: false },
        operators: ["+", "-", "×", "÷"],
        operatorWeights: { "+": 3, "-": 3, "×": 2, "÷": 2 },
        maximumSearchNodes: 750_000, maximumRepeatedValueRatio: 0.95, maximumTrivialEquationRatio: 0.12,
    },
    expert: {
        id: "arithmetic/expert/v1", difficulty: "expert",
        policy: { minimumValue: 1, maximumValue: 144, requireIntegerOperands: true, requireIntegerResults: true, allowNegativeResults: false, allowZeroResults: false },
        operators: ["+", "-", "×", "÷"],
        operatorWeights: { "+": 2, "-": 3, "×": 2, "÷": 3 },
        maximumSearchNodes: 1_000_000, maximumRepeatedValueRatio: 0.95, maximumTrivialEquationRatio: 0.1,
    },
};
function arithmeticProfileForDifficulty(difficulty) {
    return PROFILES[difficulty];
}
