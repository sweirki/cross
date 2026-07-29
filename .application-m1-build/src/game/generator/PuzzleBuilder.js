"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPuzzle = createPuzzle;
exports.serializePuzzle = serializePuzzle;
const TopologyValidator_1 = require("../board/TopologyValidator");
const NumberSynthesizer_1 = require("./NumberSynthesizer");
const SYMBOLS = {
    add: "+",
    subtract: "-",
    multiply: "×",
    divide: "÷",
};
function assertId(id) {
    if (id.trim().length === 0)
        throw new Error("Puzzle ID must not be empty.");
}
function createPuzzle(topology, synthesis, options) {
    assertId(options.id);
    const topologyValidation = new TopologyValidator_1.DeterministicTopologyValidator().validate(topology);
    if (!topologyValidation.valid) {
        throw new Error(`Cannot create puzzle from invalid topology: ${JSON.stringify(topologyValidation.issues)}`);
    }
    const synthesisValidation = (0, NumberSynthesizer_1.validateNumberSynthesis)(synthesis);
    if (!synthesisValidation.valid) {
        throw new Error(`Cannot create puzzle from invalid synthesis: ${JSON.stringify(synthesisValidation.issues)}`);
    }
    const graphEquationIds = synthesis.graph.equations.map((equation) => equation.id).sort();
    const topologyEquationIds = topology.equations.map((equation) => equation.id).sort();
    if (JSON.stringify(graphEquationIds) !== JSON.stringify(topologyEquationIds)) {
        throw new Error("Topology and synthesis describe different equation sets.");
    }
    const variableByNode = new Map(synthesis.graph.variables.map((variable) => [variable.nodeId, variable]));
    const valueByVariable = new Map(synthesis.variables.map((assignment) => [assignment.variableId, assignment.value]));
    const visible = new Set(options.visibleVariableIds ?? []);
    for (const id of visible) {
        if (!synthesis.graph.variables.some((variable) => variable.id === id)) {
            throw new Error(`Visible variable does not exist: ${id}.`);
        }
    }
    const cells = topology.nodes
        .map((node) => {
        const position = { row: node.position.row, col: node.position.column };
        if (node.kind === "operator") {
            return { id: node.id, kind: "operator", position, operator: SYMBOLS[node.operator] };
        }
        if (node.kind === "equals") {
            return { id: node.id, kind: "equals", position, operator: "=" };
        }
        const variable = variableByNode.get(node.id);
        if (variable === undefined)
            throw new Error(`Missing graph variable for ${node.id}.`);
        const solution = valueByVariable.get(variable.id);
        if (solution === undefined)
            throw new Error(`Missing synthesized value for ${variable.id}.`);
        const given = visible.has(variable.id);
        return {
            id: node.id,
            kind: "number",
            position,
            value: given ? solution : null,
            solution,
            given,
            editable: !given,
        };
    })
        .sort((left, right) => left.id.localeCompare(right.id));
    const graphById = new Map(synthesis.graph.equations.map((equation) => [equation.id, equation]));
    const equations = topology.equations
        .map((path) => {
        const graphEquation = graphById.get(path.id);
        if (graphEquation === undefined)
            throw new Error(`Missing graph equation ${path.id}.`);
        return {
            id: path.id,
            orientation: path.orientation,
            cellIds: [...path.nodeIds],
            operator: SYMBOLS[graphEquation.operator],
        };
    })
        .sort((left, right) => left.id.localeCompare(right.id));
    const numberBank = synthesis.graph.variables
        .filter((variable) => !visible.has(variable.id))
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((variable, index) => {
        const value = valueByVariable.get(variable.id);
        if (value === undefined)
            throw new Error(`Missing synthesized value for ${variable.id}.`);
        return { id: `tile-${String(index + 1).padStart(4, "0")}`, value };
    });
    return {
        schemaVersion: 1,
        id: options.id,
        difficulty: options.difficulty,
        width: topology.width,
        height: topology.height,
        cells,
        equations,
        numberBank,
    };
}
function serializePuzzle(puzzle) {
    return JSON.stringify(puzzle);
}
