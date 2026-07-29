"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeBoard = composeBoard;
function coordinate(row, col) {
    return `${row}:${col}`;
}
function positionAt(equation, offset) {
    return equation.orientation === "horizontal"
        ? { row: equation.row, col: equation.col + offset }
        : { row: equation.row + offset, col: equation.col };
}
function arithmeticIsValid(equation) {
    switch (equation.operator) {
        case "+":
            return equation.left + equation.right === equation.result;
        case "-":
            return equation.left - equation.right === equation.result;
        case "×":
            return equation.left * equation.right === equation.result;
        case "÷":
            return equation.right !== 0 &&
                equation.left % equation.right === 0 &&
                equation.left / equation.right === equation.result;
    }
}
function equationCellCoordinates(equation) {
    return [0, 1, 2, 3, 4].map(offset => {
        const position = positionAt(equation, offset);
        return coordinate(position.row, position.col);
    });
}
function numberCoordinates(equation) {
    return [0, 2, 4].map(offset => {
        const position = positionAt(equation, offset);
        return coordinate(position.row, position.col);
    });
}
function validateComposition(composition) {
    if (composition.clusters.length < 2) {
        throw new Error(`${composition.id}: a composition requires at least two clusters.`);
    }
    const occupied = new Map();
    for (const cluster of composition.clusters) {
        if (cluster.equations.length < 3) {
            throw new Error(`${composition.id}/${cluster.id}: cluster is too small.`);
        }
        const equationCoordinates = new Map();
        for (const equation of cluster.equations) {
            if (!arithmeticIsValid(equation)) {
                throw new Error(`${composition.id}/${equation.id}: arithmetic is invalid.`);
            }
            for (let offset = 0; offset < 5; offset += 1) {
                const position = positionAt(equation, offset);
                if (position.row < 1 ||
                    position.col < 1 ||
                    position.row > composition.height ||
                    position.col > composition.width) {
                    throw new Error(`${composition.id}/${equation.id}: cell ${position.row}:${position.col} is out of bounds.`);
                }
                const key = coordinate(position.row, position.col);
                const isNumber = offset === 0 || offset === 2 || offset === 4;
                const kind = isNumber ? "number" : offset === 1 ? "operator" : "equals";
                const value = isNumber
                    ? offset === 0
                        ? equation.left
                        : offset === 2
                            ? equation.right
                            : equation.result
                    : undefined;
                const previous = occupied.get(key);
                if (previous !== undefined) {
                    if (previous.kind !== "number" ||
                        kind !== "number" ||
                        previous.value !== value) {
                        throw new Error(`${composition.id}/${equation.id}: illegal overlap at ${key}.`);
                    }
                }
                else {
                    occupied.set(key, { kind, value });
                }
            }
            equationCoordinates.set(equation.id, equationCellCoordinates(equation));
        }
        const adjacency = new Map(cluster.equations.map(equation => [equation.id, new Set()]));
        for (let index = 0; index < cluster.equations.length; index += 1) {
            for (let otherIndex = index + 1; otherIndex < cluster.equations.length; otherIndex += 1) {
                const left = cluster.equations[index];
                const right = cluster.equations[otherIndex];
                const leftNumbers = new Set(numberCoordinates(left));
                const crosses = numberCoordinates(right).some(value => leftNumbers.has(value));
                if (crosses) {
                    adjacency.get(left.id).add(right.id);
                    adjacency.get(right.id).add(left.id);
                }
            }
        }
        const seen = new Set();
        const stack = [cluster.equations[0].id];
        while (stack.length > 0) {
            const current = stack.pop();
            if (seen.has(current))
                continue;
            seen.add(current);
            for (const neighbor of adjacency.get(current) ?? []) {
                stack.push(neighbor);
            }
        }
        if (seen.size !== cluster.equations.length) {
            throw new Error(`${composition.id}/${cluster.id}: equations do not form one mini-crossword.`);
        }
        const crossingEquations = [...adjacency.values()].filter(neighbors => neighbors.size >= 1).length;
        if (crossingEquations !== cluster.equations.length) {
            throw new Error(`${composition.id}/${cluster.id}: contains a dangling equation.`);
        }
    }
}
function composeBoard(composition) {
    validateComposition(composition);
    const cellsByPosition = new Map();
    const equations = [];
    const numberSolutions = new Map();
    let symbolSequence = 0;
    for (const cluster of composition.clusters) {
        for (const equation of cluster.equations) {
            const values = [equation.left, equation.right, equation.result];
            const offsets = [0, 2, 4];
            const numberIds = [];
            offsets.forEach((offset, index) => {
                const position = positionAt(equation, offset);
                const key = coordinate(position.row, position.col);
                const solution = values[index];
                const existing = cellsByPosition.get(key);
                if (existing !== undefined) {
                    if (existing.kind !== "number" || existing.solution !== solution) {
                        throw new Error(`${composition.id}: invalid number intersection at ${key}.`);
                    }
                    numberIds.push(existing.id);
                    return;
                }
                const id = `n-${position.row}-${position.col}`;
                numberSolutions.set(id, solution);
                numberIds.push(id);
                cellsByPosition.set(key, {
                    id,
                    kind: "number",
                    position,
                    value: null,
                    solution,
                    given: false,
                    editable: true,
                });
            });
            const operatorPosition = positionAt(equation, 1);
            const equalsPosition = positionAt(equation, 3);
            const operatorKey = coordinate(operatorPosition.row, operatorPosition.col);
            const equalsKey = coordinate(equalsPosition.row, equalsPosition.col);
            const operatorId = `s-${++symbolSequence}-op`;
            const equalsId = `s-${symbolSequence}-eq`;
            cellsByPosition.set(operatorKey, {
                id: operatorId,
                kind: "operator",
                position: operatorPosition,
                operator: equation.operator,
            });
            cellsByPosition.set(equalsKey, {
                id: equalsId,
                kind: "equals",
                position: equalsPosition,
                operator: "=",
            });
            equations.push({
                id: `${cluster.id}-${equation.id}`,
                orientation: equation.orientation,
                cellIds: [
                    numberIds[0],
                    operatorId,
                    numberIds[1],
                    equalsId,
                    numberIds[2],
                ],
                operator: equation.operator,
            });
        }
    }
    const numberCells = [...cellsByPosition.values()]
        .filter((cell) => cell.kind === "number")
        .sort((left, right) => left.position.row - right.position.row ||
        left.position.col - right.position.col);
    const hiddenIds = new Set();
    numberCells.forEach((cell, index) => {
        const given = index % composition.givenModulo === 0;
        if (!given)
            hiddenIds.add(cell.id);
        cellsByPosition.set(coordinate(cell.position.row, cell.position.col), {
            ...cell,
            value: given ? cell.solution : null,
            given,
            editable: !given,
        });
    });
    const numberBank = numberCells
        .filter(cell => hiddenIds.has(cell.id))
        .map((cell, index) => ({
        id: `tile-${String(index + 1).padStart(3, "0")}`,
        value: numberSolutions.get(cell.id),
    }));
    return Object.freeze({
        schemaVersion: 1,
        id: composition.id,
        difficulty: composition.difficulty,
        width: composition.width,
        height: composition.height,
        cells: Object.freeze([...cellsByPosition.values()].sort((left, right) => left.position.row - right.position.row ||
            left.position.col - right.position.col)),
        equations: Object.freeze(equations),
        numberBank: Object.freeze(numberBank),
    });
}
