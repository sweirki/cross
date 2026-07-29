"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fingerprintPuzzle = fingerprintPuzzle;
function hash(prefix, value) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first ^= code;
        first = Math.imul(first, 0x01000193);
        second ^= code + index;
        second = Math.imul(second, 0x01000193);
    }
    return `${prefix}-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
function byPosition(left, right) {
    return left.position.row - right.position.row ||
        left.position.col - right.position.col ||
        left.id.localeCompare(right.id);
}
function fingerprintPuzzle(puzzle) {
    const cells = [...puzzle.cells].sort(byPosition);
    const equations = [...puzzle.equations].sort((a, b) => a.id.localeCompare(b.id));
    const exactPayload = JSON.stringify({
        width: puzzle.width, height: puzzle.height, difficulty: puzzle.difficulty,
        cells, equations, numberBank: [...puzzle.numberBank].sort((a, b) => a.id.localeCompare(b.id)),
    });
    const topologyPayload = JSON.stringify({
        width: puzzle.width, height: puzzle.height,
        cells: cells.map((cell) => ({ kind: cell.kind, position: cell.position })),
        equations: equations.map((equation) => ({
            orientation: equation.orientation,
            path: equation.cellIds.map((id) => {
                const cell = puzzle.cells.find((candidate) => candidate.id === id);
                return cell?.position;
            }),
        })),
    });
    const structuralPayload = JSON.stringify({
        topology: topologyPayload,
        operators: cells.filter((cell) => cell.kind === "operator").map((cell) => cell.operator),
        givens: cells.filter((cell) => cell.kind === "number").map((cell) => cell.given),
    });
    const solutionPayload = JSON.stringify(cells.filter((cell) => cell.kind === "number").map((cell) => cell.solution));
    return {
        exact: hash("exact-v1", exactPayload),
        structural: hash("structural-v1", structuralPayload),
        topology: hash("topology-v1", topologyPayload),
        solution: hash("solution-v1", solutionPayload),
    };
}
