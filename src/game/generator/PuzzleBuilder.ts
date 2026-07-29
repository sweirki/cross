import type { NumberSynthesisResult } from "../../types/NumberSynthesis";
import type { Puzzle, NumberBankTile } from "../../types/Puzzle";
import type { PuzzleCreationOptions } from "../../types/PuzzleCreation";
import type { Cell } from "../../types/Cell";
import type { Equation } from "../../types/Equation";
import type { BoardTopology, ArithmeticOperator } from "../../types/Topology";
import { DeterministicTopologyValidator } from "../board/TopologyValidator";
import { validateNumberSynthesis } from "./NumberSynthesizer";

const SYMBOLS: Readonly<Record<ArithmeticOperator, "+" | "-" | "×" | "÷">> = {
  add: "+",
  subtract: "-",
  multiply: "×",
  divide: "÷",
};

function assertId(id: string): void {
  if (id.trim().length === 0) throw new Error("Puzzle ID must not be empty.");
}

export function createPuzzle(
  topology: BoardTopology,
  synthesis: NumberSynthesisResult,
  options: PuzzleCreationOptions,
): Puzzle {
  assertId(options.id);

  const topologyValidation = new DeterministicTopologyValidator().validate(topology);
  if (!topologyValidation.valid) {
    throw new Error(`Cannot create puzzle from invalid topology: ${JSON.stringify(topologyValidation.issues)}`);
  }

  const synthesisValidation = validateNumberSynthesis(synthesis);
  if (!synthesisValidation.valid) {
    throw new Error(`Cannot create puzzle from invalid synthesis: ${JSON.stringify(synthesisValidation.issues)}`);
  }

  const graphEquationIds = synthesis.graph.equations.map((equation) => equation.id).sort();
  const topologyEquationIds = topology.equations.map((equation) => equation.id).sort();
  if (JSON.stringify(graphEquationIds) !== JSON.stringify(topologyEquationIds)) {
    throw new Error("Topology and synthesis describe different equation sets.");
  }

  const variableByNode = new Map(
    synthesis.graph.variables.map((variable) => [variable.nodeId, variable]),
  );
  const valueByVariable = new Map(
    synthesis.variables.map((assignment) => [assignment.variableId, assignment.value]),
  );
  const visible = new Set(options.visibleVariableIds ?? []);
  for (const id of visible) {
    if (!synthesis.graph.variables.some((variable) => variable.id === id)) {
      throw new Error(`Visible variable does not exist: ${id}.`);
    }
  }

  const cells: Cell[] = topology.nodes
    .map((node): Cell => {
      const position = { row: node.position.row, col: node.position.column };
      if (node.kind === "operator") {
        return { id: node.id, kind: "operator", position, operator: SYMBOLS[node.operator] };
      }
      if (node.kind === "equals") {
        return { id: node.id, kind: "equals", position, operator: "=" };
      }

      const variable = variableByNode.get(node.id);
      if (variable === undefined) throw new Error(`Missing graph variable for ${node.id}.`);
      const solution = valueByVariable.get(variable.id);
      if (solution === undefined) throw new Error(`Missing synthesized value for ${variable.id}.`);
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
  const equations: Equation[] = topology.equations
    .map((path) => {
      const graphEquation = graphById.get(path.id);
      if (graphEquation === undefined) throw new Error(`Missing graph equation ${path.id}.`);
      return {
        id: path.id,
        orientation: path.orientation,
        cellIds: [...path.nodeIds] as [string, string, string, string, string],
        operator: SYMBOLS[graphEquation.operator],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const numberBank: NumberBankTile[] = synthesis.graph.variables
    .filter((variable) => !visible.has(variable.id))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((variable, index) => {
      const value = valueByVariable.get(variable.id);
      if (value === undefined) throw new Error(`Missing synthesized value for ${variable.id}.`);
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

export function serializePuzzle(puzzle: Puzzle): string {
  return JSON.stringify(puzzle);
}
