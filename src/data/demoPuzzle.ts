import type { Puzzle } from "../types/Puzzle";

/**
 * A connected CrossMath puzzle used by the bundled runtime.
 *
 * Layout:
 *
 *  8 + 4 = 12
 *  +       -
 *  3       5
 *  =       =
 * 11 - 4 = 7
 *  +       +
 *  6       8
 *  =       =
 * 17 - 2 = 15
 *
 * Shared number cells are referenced by both their horizontal and vertical
 * equations. Operators and equals signs are fixed; only hidden number cells
 * receive number-bank tiles.
 */
export const DEMO_PUZZLE: Puzzle = {
  schemaVersion: 1,
  id: "crossmath-easy-0001",
  difficulty: "easy",
  width: 5,
  height: 9,
  cells: [
    { id: "n-a", kind: "number", position: { row: 0, col: 0 }, value: null, solution: 8, given: false, editable: true },
    { id: "op-h1", kind: "operator", position: { row: 0, col: 1 }, operator: "+" },
    { id: "n-b", kind: "number", position: { row: 0, col: 2 }, value: null, solution: 4, given: false, editable: true },
    { id: "eq-h1", kind: "equals", position: { row: 0, col: 3 }, operator: "=" },
    { id: "n-c", kind: "number", position: { row: 0, col: 4 }, value: 12, solution: 12, given: true, editable: false },

    { id: "op-v1", kind: "operator", position: { row: 1, col: 0 }, operator: "+" },
    { id: "op-v2", kind: "operator", position: { row: 1, col: 4 }, operator: "-" },

    { id: "n-d", kind: "number", position: { row: 2, col: 0 }, value: null, solution: 3, given: false, editable: true },
    { id: "n-f", kind: "number", position: { row: 2, col: 4 }, value: null, solution: 5, given: false, editable: true },

    { id: "eq-v1", kind: "equals", position: { row: 3, col: 0 }, operator: "=" },
    { id: "eq-v2", kind: "equals", position: { row: 3, col: 4 }, operator: "=" },

    { id: "n-e", kind: "number", position: { row: 4, col: 0 }, value: 11, solution: 11, given: true, editable: false },
    { id: "op-h2", kind: "operator", position: { row: 4, col: 1 }, operator: "-" },
    { id: "n-h", kind: "number", position: { row: 4, col: 2 }, value: null, solution: 4, given: false, editable: true },
    { id: "eq-h2", kind: "equals", position: { row: 4, col: 3 }, operator: "=" },
    { id: "n-g", kind: "number", position: { row: 4, col: 4 }, value: null, solution: 7, given: false, editable: true },

    { id: "op-v3", kind: "operator", position: { row: 5, col: 0 }, operator: "+" },
    { id: "op-v4", kind: "operator", position: { row: 5, col: 4 }, operator: "+" },

    { id: "n-i", kind: "number", position: { row: 6, col: 0 }, value: null, solution: 6, given: false, editable: true },
    { id: "n-k", kind: "number", position: { row: 6, col: 4 }, value: null, solution: 8, given: false, editable: true },

    { id: "eq-v3", kind: "equals", position: { row: 7, col: 0 }, operator: "=" },
    { id: "eq-v4", kind: "equals", position: { row: 7, col: 4 }, operator: "=" },

    { id: "n-j", kind: "number", position: { row: 8, col: 0 }, value: null, solution: 17, given: false, editable: true },
    { id: "op-h3", kind: "operator", position: { row: 8, col: 1 }, operator: "-" },
    { id: "n-m", kind: "number", position: { row: 8, col: 2 }, value: null, solution: 2, given: false, editable: true },
    { id: "eq-h3", kind: "equals", position: { row: 8, col: 3 }, operator: "=" },
    { id: "n-l", kind: "number", position: { row: 8, col: 4 }, value: 15, solution: 15, given: true, editable: false },
  ],
  equations: [
    { id: "horizontal-top", orientation: "horizontal", cellIds: ["n-a", "op-h1", "n-b", "eq-h1", "n-c"], operator: "+" },
    { id: "vertical-left-top", orientation: "vertical", cellIds: ["n-a", "op-v1", "n-d", "eq-v1", "n-e"], operator: "+" },
    { id: "vertical-right-top", orientation: "vertical", cellIds: ["n-c", "op-v2", "n-f", "eq-v2", "n-g"], operator: "-" },
    { id: "horizontal-middle", orientation: "horizontal", cellIds: ["n-e", "op-h2", "n-h", "eq-h2", "n-g"], operator: "-" },
    { id: "vertical-left-bottom", orientation: "vertical", cellIds: ["n-e", "op-v3", "n-i", "eq-v3", "n-j"], operator: "+" },
    { id: "vertical-right-bottom", orientation: "vertical", cellIds: ["n-g", "op-v4", "n-k", "eq-v4", "n-l"], operator: "+" },
    { id: "horizontal-bottom", orientation: "horizontal", cellIds: ["n-j", "op-h3", "n-m", "eq-h3", "n-l"], operator: "-" },
  ],
  numberBank: [
    { id: "tile-01", value: 8 },
    { id: "tile-02", value: 4 },
    { id: "tile-03", value: 3 },
    { id: "tile-04", value: 5 },
    { id: "tile-05", value: 4 },
    { id: "tile-06", value: 7 },
    { id: "tile-07", value: 6 },
    { id: "tile-08", value: 8 },
    { id: "tile-09", value: 17 },
    { id: "tile-10", value: 2 },
  ],
};
