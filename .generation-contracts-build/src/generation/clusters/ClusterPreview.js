"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderClusterAscii = renderClusterAscii;
const GLYPHS = {
    number: "□",
    operator: "·",
    equals: "=",
};
function renderClusterAscii(template) {
    const maxRow = Math.max(...template.cells.map((cell) => cell.position.row));
    const maxCol = Math.max(...template.cells.map((cell) => cell.position.col));
    const grid = Array.from({ length: maxRow + 1 }, () => Array.from({ length: maxCol + 1 }, () => " "));
    for (const cell of template.cells) {
        grid[cell.position.row][cell.position.col] = GLYPHS[cell.kind];
    }
    return grid.map((row) => row.join("").replace(/\s+$/u, "")).join("\n");
}
