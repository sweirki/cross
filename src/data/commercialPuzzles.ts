import { composeBoard, type BoardComposition } from "./BoardCompositionEngine";

const COMPOSITIONS: readonly BoardComposition[] = [
  {
    id: "commercial-easy-001",
    difficulty: "easy",
    width: 15,
    height: 15,
    givenModulo: 2,
    clusters: [
      {
        id: "top-left",
        equations: [
          { id: "h1", row: 2, col: 2, orientation: "horizontal", left: 8, operator: "+", right: 1, result: 9 },
          { id: "v1", row: 2, col: 4, orientation: "vertical", left: 1, operator: "+", right: 4, result: 5 },
          { id: "h2", row: 6, col: 2, orientation: "horizontal", left: 7, operator: "-", right: 5, result: 2 },
        ],
      },
      {
        id: "bottom-right",
        equations: [
          { id: "h1", row: 9, col: 9, orientation: "horizontal", left: 6, operator: "+", right: 3, result: 9 },
          { id: "v1", row: 9, col: 11, orientation: "vertical", left: 3, operator: "+", right: 4, result: 7 },
          { id: "h2", row: 13, col: 9, orientation: "horizontal", left: 9, operator: "-", right: 7, result: 2 },
        ],
      },
    ],
  },
  {
    id: "commercial-medium-001",
    difficulty: "medium",
    width: 19,
    height: 19,
    givenModulo: 3,
    clusters: [
      {
        id: "top-left",
        equations: [
          { id: "h1", row: 2, col: 2, orientation: "horizontal", left: 3, operator: "+", right: 4, result: 7 },
          { id: "v1", row: 2, col: 4, orientation: "vertical", left: 4, operator: "×", right: 2, result: 8 },
          { id: "h2", row: 6, col: 2, orientation: "horizontal", left: 10, operator: "-", right: 8, result: 2 },
        ],
      },
      {
        id: "top-right",
        equations: [
          { id: "h1", row: 2, col: 12, orientation: "horizontal", left: 5, operator: "+", right: 10, result: 15 },
          { id: "v1", row: 2, col: 14, orientation: "vertical", left: 10, operator: "÷", right: 2, result: 5 },
          { id: "h2", row: 6, col: 12, orientation: "horizontal", left: 9, operator: "-", right: 5, result: 4 },
        ],
      },
      {
        id: "bottom-center",
        equations: [
          { id: "h1", row: 11, col: 7, orientation: "horizontal", left: 6, operator: "×", right: 3, result: 18 },
          { id: "v1", row: 11, col: 9, orientation: "vertical", left: 3, operator: "+", right: 5, result: 8 },
          { id: "h2", row: 15, col: 7, orientation: "horizontal", left: 12, operator: "-", right: 8, result: 4 },
        ],
      },
    ],
  },
  {
    id: "commercial-hard-001",
    difficulty: "hard",
    width: 21,
    height: 21,
    givenModulo: 4,
    clusters: [
      {
        id: "top-left",
        equations: [
          { id: "h1", row: 2, col: 2, orientation: "horizontal", left: 24, operator: "÷", right: 6, result: 4 },
          { id: "h2", row: 6, col: 2, orientation: "horizontal", left: 9, operator: "+", right: 3, result: 12 },
          { id: "v1", row: 2, col: 2, orientation: "vertical", left: 24, operator: "-", right: 15, result: 9 },
          { id: "v2", row: 2, col: 4, orientation: "vertical", left: 6, operator: "-", right: 3, result: 3 },
        ],
      },
      {
        id: "top-right",
        equations: [
          { id: "h1", row: 2, col: 13, orientation: "horizontal", left: 18, operator: "+", right: 7, result: 25 },
          { id: "h2", row: 6, col: 13, orientation: "horizontal", left: 6, operator: "×", right: 5, result: 30 },
          { id: "v1", row: 2, col: 13, orientation: "vertical", left: 18, operator: "-", right: 12, result: 6 },
          { id: "v2", row: 2, col: 15, orientation: "vertical", left: 7, operator: "-", right: 2, result: 5 },
        ],
      },
      {
        id: "bottom-center",
        equations: [
          { id: "h1", row: 12, col: 7, orientation: "horizontal", left: 32, operator: "÷", right: 4, result: 8 },
          { id: "h2", row: 16, col: 7, orientation: "horizontal", left: 11, operator: "+", right: 13, result: 24 },
          { id: "v1", row: 12, col: 7, orientation: "vertical", left: 32, operator: "-", right: 21, result: 11 },
          { id: "v2", row: 12, col: 9, orientation: "vertical", left: 4, operator: "+", right: 9, result: 13 },
        ],
      },
    ],
  },
  {
    id: "commercial-expert-001",
    difficulty: "expert",
    width: 23,
    height: 23,
    givenModulo: 5,
    clusters: [
      {
        id: "top-left",
        equations: [
          { id: "h1", row: 2, col: 2, orientation: "horizontal", left: 36, operator: "÷", right: 6, result: 6 },
          { id: "h2", row: 6, col: 2, orientation: "horizontal", left: 9, operator: "+", right: 9, result: 18 },
          { id: "v1", row: 2, col: 2, orientation: "vertical", left: 36, operator: "-", right: 27, result: 9 },
          { id: "v2", row: 2, col: 4, orientation: "vertical", left: 6, operator: "+", right: 3, result: 9 },
        ],
      },
      {
        id: "top-right",
        equations: [
          { id: "h1", row: 2, col: 15, orientation: "horizontal", left: 48, operator: "÷", right: 8, result: 6 },
          { id: "h2", row: 6, col: 15, orientation: "horizontal", left: 13, operator: "+", right: 1, result: 14 },
          { id: "v1", row: 2, col: 15, orientation: "vertical", left: 48, operator: "-", right: 35, result: 13 },
          { id: "v2", row: 2, col: 17, orientation: "vertical", left: 8, operator: "-", right: 7, result: 1 },
        ],
      },
      {
        id: "bottom-center",
        equations: [
          { id: "h1", row: 13, col: 8, orientation: "horizontal", left: 42, operator: "÷", right: 7, result: 6 },
          { id: "h2", row: 17, col: 8, orientation: "horizontal", left: 18, operator: "-", right: 15, result: 3 },
          { id: "v1", row: 13, col: 8, orientation: "vertical", left: 42, operator: "-", right: 24, result: 18 },
          { id: "v2", row: 13, col: 10, orientation: "vertical", left: 7, operator: "+", right: 8, result: 15 },
        ],
      },
    ],
  },
];

export const COMMERCIAL_PUZZLES = Object.freeze(
  COMPOSITIONS.map(composition => composeBoard(composition)),
);
