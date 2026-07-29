"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIRST_INTERSECTION_PUZZLE = exports.LESSON_TWO_PUZZLE = exports.LESSON_ONE_PUZZLE = void 0;
exports.LESSON_ONE_PUZZLE = {
    schemaVersion: 1,
    id: "learn-001-place-number",
    difficulty: "easy",
    width: 5,
    height: 1,
    cells: [
        { id: "l1-a", kind: "number", position: { row: 0, col: 0 }, value: 2, solution: 2, given: true, editable: false },
        { id: "l1-op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
        { id: "l1-b", kind: "number", position: { row: 0, col: 2 }, value: 3, solution: 3, given: true, editable: false },
        { id: "l1-eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
        { id: "l1-c", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
    ],
    equations: [
        { id: "l1-horizontal", orientation: "horizontal", cellIds: ["l1-a", "l1-op", "l1-b", "l1-eq", "l1-c"], operator: "+" },
    ],
    numberBank: [{ id: "l1-tile-5", value: 5 }],
};
exports.LESSON_TWO_PUZZLE = {
    schemaVersion: 1,
    id: "learn-002-complete-equation",
    difficulty: "easy",
    width: 5,
    height: 1,
    cells: [
        { id: "l2-a", kind: "number", position: { row: 0, col: 0 }, value: 2, solution: 2, given: true, editable: false },
        { id: "l2-op", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
        { id: "l2-b", kind: "number", position: { row: 0, col: 2 }, value: null, solution: 3, given: false, editable: true },
        { id: "l2-eq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
        { id: "l2-c", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
    ],
    equations: [
        { id: "l2-horizontal", orientation: "horizontal", cellIds: ["l2-a", "l2-op", "l2-b", "l2-eq", "l2-c"], operator: "+" },
    ],
    numberBank: [
        { id: "l2-tile-3", value: 3 },
        { id: "l2-tile-5", value: 5 },
    ],
};
exports.FIRST_INTERSECTION_PUZZLE = {
    schemaVersion: 1,
    id: "learn-003-first-intersection",
    difficulty: "easy",
    width: 5,
    height: 5,
    cells: [
        { id: "l3-a", kind: "number", position: { row: 0, col: 0 }, value: 2, solution: 2, given: true, editable: false },
        { id: "l3-hop", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
        { id: "l3-b", kind: "number", position: { row: 0, col: 2 }, value: null, solution: 3, given: false, editable: true },
        { id: "l3-heq", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
        { id: "l3-shared", kind: "number", position: { row: 0, col: 4 }, value: null, solution: 5, given: false, editable: true },
        { id: "l3-vop", kind: "operator", position: { row: 1, col: 4 }, operator: "+" },
        { id: "l3-d", kind: "number", position: { row: 2, col: 4 }, value: 4, solution: 4, given: true, editable: false },
        { id: "l3-veq", kind: "equals", position: { row: 3, col: 4 }, operator: "=" },
        { id: "l3-e", kind: "number", position: { row: 4, col: 4 }, value: null, solution: 9, given: false, editable: true },
    ],
    equations: [
        { id: "l3-horizontal", orientation: "horizontal", cellIds: ["l3-a", "l3-hop", "l3-b", "l3-heq", "l3-shared"], operator: "+" },
        { id: "l3-vertical", orientation: "vertical", cellIds: ["l3-shared", "l3-vop", "l3-d", "l3-veq", "l3-e"], operator: "+" },
    ],
    numberBank: [
        { id: "l3-tile-3", value: 3 },
        { id: "l3-tile-5", value: 5 },
        { id: "l3-tile-9", value: 9 },
    ],
};
