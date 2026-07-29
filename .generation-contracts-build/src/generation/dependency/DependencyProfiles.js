"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPENDENCY_PROFILES = void 0;
exports.dependencyProfileForDifficulty = dependencyProfileForDifficulty;
exports.DEPENDENCY_PROFILES = {
    easy: {
        id: "dependency/easy/v1",
        difficulty: "easy",
        minimumDepth: 1,
        maximumDepth: 4,
        minimumBranchingFactor: 0,
        maximumBranchingFactor: 2.5,
        minimumStartingNodes: 2,
        maximumStartingNodes: 32,
        maximumComponentCount: 6,
    },
    medium: {
        id: "dependency/medium/v1",
        difficulty: "medium",
        minimumDepth: 2,
        maximumDepth: 6,
        minimumBranchingFactor: 0.25,
        maximumBranchingFactor: 3.5,
        minimumStartingNodes: 1,
        maximumStartingNodes: 24,
        maximumComponentCount: 6,
    },
    hard: {
        id: "dependency/hard/v1",
        difficulty: "hard",
        minimumDepth: 2,
        maximumDepth: 9,
        minimumBranchingFactor: 0.5,
        maximumBranchingFactor: 5,
        minimumStartingNodes: 1,
        maximumStartingNodes: 20,
        maximumComponentCount: 6,
    },
    expert: {
        id: "dependency/expert/v1",
        difficulty: "expert",
        minimumDepth: 3,
        maximumDepth: 12,
        minimumBranchingFactor: 0.75,
        maximumBranchingFactor: 8,
        minimumStartingNodes: 1,
        maximumStartingNodes: 16,
        maximumComponentCount: 6,
    },
};
function dependencyProfileForDifficulty(difficulty) {
    return exports.DEPENDENCY_PROFILES[difficulty];
}
