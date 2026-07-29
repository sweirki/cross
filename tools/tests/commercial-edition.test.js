const {
  COMMERCIAL_PUZZLES,
} = require("../../.commercial-build/src/data/commercialPuzzles.js");
const {
  validatePuzzle,
} = require("../../.commercial-build/src/game/validation/PuzzleValidation.js");

const expected = {
  easy: { equations: 6, clusters: 2 },
  medium: { equations: 9, clusters: 3 },
  hard: { equations: 12, clusters: 3 },
  expert: { equations: 12, clusters: 3 },
};

function equationAdjacency(puzzle) {
  const adjacency = new Map(puzzle.equations.map(equation => [equation.id, new Set()]));

  for (let index = 0; index < puzzle.equations.length; index += 1) {
    for (let other = index + 1; other < puzzle.equations.length; other += 1) {
      const left = puzzle.equations[index];
      const right = puzzle.equations[other];
      const leftCells = new Set(left.cellIds);
      if (right.cellIds.some(cellId => leftCells.has(cellId))) {
        adjacency.get(left.id).add(right.id);
        adjacency.get(right.id).add(left.id);
      }
    }
  }

  return adjacency;
}

function componentCount(puzzle) {
  const adjacency = equationAdjacency(puzzle);
  const seen = new Set();
  let components = 0;

  for (const equation of puzzle.equations) {
    if (seen.has(equation.id)) continue;
    components += 1;
    const stack = [equation.id];

    while (stack.length > 0) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      for (const neighbor of adjacency.get(current) || []) stack.push(neighbor);
    }
  }

  return components;
}

function assertEquationShape(puzzle) {
  const cells = new Map(puzzle.cells.map(cell => [cell.id, cell]));

  for (const equation of puzzle.equations) {
    const kinds = equation.cellIds.map(id => cells.get(id)?.kind).join(",");
    if (kinds !== "number,operator,number,equals,number") {
      throw new Error(`${puzzle.id}/${equation.id}: malformed equation ${kinds}`);
    }

    for (const id of equation.cellIds) {
      const cell = cells.get(id);
      if (!cell) throw new Error(`${puzzle.id}/${equation.id}: missing cell ${id}`);
      if (
        cell.position.row < 1 ||
        cell.position.col < 1 ||
        cell.position.row > puzzle.height ||
        cell.position.col > puzzle.width
      ) {
        throw new Error(`${puzzle.id}/${equation.id}: out-of-bounds cell ${id}`);
      }
    }
  }
}

let assertions = 0;

for (const puzzle of COMMERCIAL_PUZZLES) {
  const validation = validatePuzzle(puzzle);
  if (!validation.valid) {
    throw new Error(`${puzzle.id}: ${JSON.stringify(validation.issues)}`);
  }
  assertions += 1;

  const profile = expected[puzzle.difficulty];
  if (puzzle.equations.length !== profile.equations) {
    throw new Error(`${puzzle.id}: wrong equation count`);
  }
  assertions += 1;

  const components = componentCount(puzzle);
  if (components !== profile.clusters) {
    throw new Error(
      `${puzzle.id}: expected ${profile.clusters} composed clusters, found ${components}`,
    );
  }
  assertions += 1;

  assertEquationShape(puzzle);
  assertions += puzzle.equations.length;

  const adjacency = equationAdjacency(puzzle);
  for (const [equationId, neighbors] of adjacency) {
    if (neighbors.size < 1) {
      throw new Error(`${puzzle.id}/${equationId}: dangling equation`);
    }
    assertions += 1;
  }
}

console.log(`${assertions}/${assertions} board-composition assertions passed.`);
