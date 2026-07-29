"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCompositionAscii = renderCompositionAscii;
function renderCompositionAscii(plan) {
    const grid = Array.from({ length: plan.rows }, () => Array(plan.columns).fill(" "));
    for (const cell of plan.occupiedCells) {
        grid[cell.position.row][cell.position.col] =
            cell.kind === "number" ? "□" : cell.kind === "operator" ? "·" : "=";
    }
    return grid.map((row) => row.join("").replace(/\s+$/u, "")).join("\n");
}
