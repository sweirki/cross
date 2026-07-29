import type {
  ClusterCell,
  ClusterEquationPath,
  ClusterPort,
  ClusterTemplate,
} from "../contracts/GenerationContracts";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { assertValidClusterTemplate, validateClusterTemplate } from "./ClusterValidator";

type Orientation = "horizontal" | "vertical";

interface EquationSpec {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly orientation: Orientation;
}

interface TemplateSpec {
  readonly id: string;
  readonly equations: readonly EquationSpec[];
  readonly difficultyEligibility: ClusterTemplate["difficultyEligibility"];
  readonly symmetry: "asymmetric" | "bilateral" | "rotational";
  readonly family: string;
}

const ALL_TRANSFORMS: ClusterTemplate["allowedTransforms"] = [
  "identity",
  "rotate-90",
  "rotate-180",
  "rotate-270",
  "reflect-horizontal",
  "reflect-vertical",
];

const CELL_KINDS = ["number", "operator", "number", "equals", "number"] as const;

function buildTemplate(spec: TemplateSpec): ClusterTemplate {
  const cellByPosition = new Map<string, ClusterCell>();
  const equations: ClusterEquationPath[] = [];
  let cellCounter = 0;

  for (const equationSpec of spec.equations) {
    const cellIds: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const row = equationSpec.row + (equationSpec.orientation === "vertical" ? index : 0);
      const col = equationSpec.col + (equationSpec.orientation === "horizontal" ? index : 0);
      const key = `${row}:${col}`;
      const existing = cellByPosition.get(key);
      const expectedKind = CELL_KINDS[index];
      if (existing && existing.kind !== expectedKind) {
        throw new Error(`Illegal overlap while building ${spec.id} at ${key}.`);
      }
      const cell = existing ?? {
        id: `${spec.id}:cell-${cellCounter++}`,
        position: { row, col },
        kind: expectedKind,
      };
      cellByPosition.set(key, cell);
      cellIds.push(cell.id);
    }
    equations.push({
      id: `${spec.id}:${equationSpec.id}`,
      cellIds: cellIds as [string, string, string, string, string],
      orientation: equationSpec.orientation,
    });
  }

  const cells = [...cellByPosition.values()];
  const minRow = Math.min(...cells.map((cell) => cell.position.row));
  const minCol = Math.min(...cells.map((cell) => cell.position.col));
  const normalizedCells = cells.map((cell) => ({
    ...cell,
    position: {
      row: cell.position.row - minRow,
      col: cell.position.col - minCol,
    },
  }));

  const maxRow = Math.max(...normalizedCells.map((cell) => cell.position.row));
  const maxCol = Math.max(...normalizedCells.map((cell) => cell.position.col));
  const ports: ClusterPort[] = [];
  for (const cell of normalizedCells) {
    if (cell.kind !== "number") continue;
    const directions: ClusterPort["direction"][] = [];
    if (cell.position.row === 0) directions.push("north");
    if (cell.position.col === maxCol) directions.push("east");
    if (cell.position.row === maxRow) directions.push("south");
    if (cell.position.col === 0) directions.push("west");
    for (const direction of directions) {
      ports.push({
        id: `${spec.id}:port-${ports.length}`,
        cellId: cell.id,
        direction,
      });
    }
  }

  const provisional: ClusterTemplate = {
    schema: GENERATION_SCHEMA_IDS.clusterTemplate,
    id: spec.id,
    canonicalId: `commercial/${spec.id}/v1`,
    cells: normalizedCells,
    equations,
    ports,
    allowedTransforms: ALL_TRANSFORMS,
    difficultyEligibility: spec.difficultyEligibility,
    metadata: {
      family: spec.family,
      symmetry: spec.symmetry,
      equationCount: spec.equations.length,
      production: true,
    },
  };

  const metrics = validateClusterTemplate(provisional).metrics;
  const footprintArea = Math.max(1, metrics.rows * metrics.columns);
  const template: ClusterTemplate = {
    ...provisional,
    metadata: {
      ...provisional.metadata,
      intersectionCount: metrics.intersectionCount,
      cycleRank: metrics.cycleRank,
      rows: metrics.rows,
      columns: metrics.columns,
      compactness: Number((provisional.cells.length / footprintArea).toFixed(4)),
    },
  };
  assertValidClusterTemplate(template);
  return template;
}

const SPECS: readonly TemplateSpec[] = [
  {
    id: "t-three",
    family: "t",
    symmetry: "bilateral",
    difficultyEligibility: ["easy", "medium"],
    equations: [
      { id: "top", row: 0, col: 2, orientation: "horizontal" },
      { id: "stem", row: 0, col: 2, orientation: "vertical" },
      { id: "base", row: 4, col: 2, orientation: "horizontal" },
    ],
  },
  {
    id: "bridge-three",
    family: "bridge",
    symmetry: "asymmetric",
    difficultyEligibility: ["easy", "medium"],
    equations: [
      { id: "upper", row: 0, col: 0, orientation: "horizontal" },
      { id: "bridge", row: 0, col: 4, orientation: "vertical" },
      { id: "lower", row: 4, col: 4, orientation: "horizontal" },
    ],
  },
  {
    id: "rectangle-four",
    family: "rectangle",
    symmetry: "rotational",
    difficultyEligibility: ["easy", "medium", "hard"],
    equations: [
      { id: "top", row: 0, col: 0, orientation: "horizontal" },
      { id: "bottom", row: 4, col: 0, orientation: "horizontal" },
      { id: "left", row: 0, col: 0, orientation: "vertical" },
      { id: "right", row: 0, col: 4, orientation: "vertical" },
    ],
  },
  {
    id: "double-cross-four",
    family: "double-cross",
    symmetry: "bilateral",
    difficultyEligibility: ["medium", "hard"],
    equations: [
      { id: "top", row: 0, col: 0, orientation: "horizontal" },
      { id: "bottom", row: 4, col: 0, orientation: "horizontal" },
      { id: "left-spine", row: 0, col: 0, orientation: "vertical" },
      { id: "middle-spine", row: 0, col: 2, orientation: "vertical" },
    ],
  },
  {
    id: "fork-five",
    family: "fork",
    symmetry: "asymmetric",
    difficultyEligibility: ["medium", "hard"],
    equations: [
      { id: "top", row: 0, col: 0, orientation: "horizontal" },
      { id: "middle", row: 2, col: 0, orientation: "horizontal" },
      { id: "bottom", row: 4, col: 0, orientation: "horizontal" },
      { id: "left", row: 0, col: 0, orientation: "vertical" },
      { id: "center", row: 0, col: 2, orientation: "vertical" },
    ],
  },
  {
    id: "wheel-five",
    family: "wheel",
    symmetry: "rotational",
    difficultyEligibility: ["medium", "hard", "expert"],
    equations: [
      { id: "top", row: 0, col: 0, orientation: "horizontal" },
      { id: "center", row: 2, col: 0, orientation: "horizontal" },
      { id: "bottom", row: 4, col: 0, orientation: "horizontal" },
      { id: "left", row: 0, col: 0, orientation: "vertical" },
      { id: "right", row: 0, col: 4, orientation: "vertical" },
    ],
  },
  {
    id: "compact-lattice-six",
    family: "lattice",
    symmetry: "rotational",
    difficultyEligibility: ["hard", "expert"],
    equations: [
      { id: "top", row: 0, col: 0, orientation: "horizontal" },
      { id: "middle", row: 2, col: 0, orientation: "horizontal" },
      { id: "bottom", row: 4, col: 0, orientation: "horizontal" },
      { id: "left", row: 0, col: 0, orientation: "vertical" },
      { id: "center", row: 0, col: 2, orientation: "vertical" },
      { id: "right", row: 0, col: 4, orientation: "vertical" },
    ],
  },
  {
    id: "asymmetric-lattice-six",
    family: "lattice",
    symmetry: "asymmetric",
    difficultyEligibility: ["hard", "expert"],
    equations: [
      { id: "upper", row: 0, col: 0, orientation: "horizontal" },
      { id: "middle", row: 2, col: 2, orientation: "horizontal" },
      { id: "lower", row: 4, col: 0, orientation: "horizontal" },
      { id: "left", row: 0, col: 0, orientation: "vertical" },
      { id: "center", row: 0, col: 4, orientation: "vertical" },
      { id: "right", row: 2, col: 6, orientation: "vertical" },
    ],
  },
];

export const PRODUCTION_CLUSTER_LIBRARY: readonly ClusterTemplate[] = SPECS.map(buildTemplate);

const TEMPLATE_BY_ID = new Map(
  PRODUCTION_CLUSTER_LIBRARY.map((template) => [template.id, template] as const),
);

export function getClusterTemplate(id: string): ClusterTemplate {
  const template = TEMPLATE_BY_ID.get(id);
  if (!template) throw new Error(`Unknown cluster template: ${id}`);
  return template;
}

export function listClusterTemplatesForDifficulty(
  difficulty: ClusterTemplate["difficultyEligibility"][number],
): readonly ClusterTemplate[] {
  return PRODUCTION_CLUSTER_LIBRARY.filter((template) =>
    template.difficultyEligibility.includes(difficulty),
  );
}
