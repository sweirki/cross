"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateToPuzzle = candidateToPuzzle;
const clusters_1 = require("../clusters");
function candidateToPuzzle(candidate, puzzleId = candidate.id) {
    if (!candidate.certificate?.valid)
        throw new Error("Only certified candidates can become catalog puzzles.");
    const given = new Set(candidate.clues.givenCellIds);
    const cellsById = new Map();
    for (const occupied of candidate.composition.occupiedCells) {
        if (occupied.kind === "number") {
            const solution = candidate.fill.values[occupied.cellId];
            if (solution === undefined)
                throw new Error(`Missing solution for ${occupied.cellId}.`);
            const isGiven = given.has(occupied.cellId);
            cellsById.set(occupied.cellId, {
                id: occupied.cellId,
                kind: "number",
                position: occupied.position,
                solution,
                value: isGiven ? solution : null,
                given: isGiven,
                editable: !isGiven,
            });
        }
        else if (occupied.kind === "equals") {
            cellsById.set(occupied.cellId, {
                id: occupied.cellId,
                kind: "equals",
                position: occupied.position,
                operator: "=",
            });
        }
    }
    const equations = [];
    for (const cluster of candidate.composition.clusters) {
        const template = (0, clusters_1.transformClusterTemplate)((0, clusters_1.getClusterTemplate)(cluster.templateId), cluster.transform);
        const positionByLocalId = new Map(template.cells.map((cell) => [cell.id, cell.position]));
        for (const path of template.equations) {
            const equationId = `${cluster.id}:${path.id.split(":").pop()}`;
            const operator = candidate.fill.operators[equationId];
            if (!operator)
                throw new Error(`Missing operator for ${equationId}.`);
            const ids = path.cellIds.map((id) => cluster.cellIdMap[id]);
            const operatorId = ids[1];
            if (!cellsById.has(operatorId)) {
                const localPosition = positionByLocalId.get(path.cellIds[1]);
                cellsById.set(operatorId, {
                    id: operatorId,
                    kind: "operator",
                    position: {
                        row: cluster.origin.row + localPosition.row,
                        col: cluster.origin.col + localPosition.col,
                    },
                    operator,
                });
            }
            equations.push({ id: equationId, orientation: path.orientation, cellIds: ids, operator });
        }
    }
    const cells = [...cellsById.values()].sort((a, b) => a.position.row - b.position.row || a.position.col - b.position.col || a.id.localeCompare(b.id));
    const hiddenIds = candidate.clues.hiddenCellIds.slice().sort();
    const numberBank = hiddenIds.map((cellId, index) => {
        const value = candidate.fill.values[cellId];
        if (value === undefined)
            throw new Error(`Missing hidden value for ${cellId}.`);
        return { id: `tile-${String(index + 1).padStart(4, "0")}`, value };
    });
    return {
        schemaVersion: 1,
        id: puzzleId,
        difficulty: candidate.request.difficulty,
        width: candidate.composition.columns,
        height: candidate.composition.rows,
        cells,
        equations: equations.sort((a, b) => a.id.localeCompare(b.id)),
        numberBank,
    };
}
