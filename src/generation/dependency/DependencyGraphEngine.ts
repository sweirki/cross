
import type {
  ClusterTemplate,
  CompositionPlan,
  DependencyGraph,
  GenerationRequest,
} from "../contracts/GenerationContracts";
import { getClusterTemplate } from "../clusters/ClusterLibrary";
import { transformClusterTemplate } from "../clusters/ClusterTransforms";
import { GENERATION_SCHEMA_IDS } from "../versioning/SchemaVersions";
import { calculateDependencyMetrics } from "./DependencyMetrics";
import { assertValidDependencyGraph } from "./DependencyValidator";

interface MutableGraph {
  nodes: DependencyGraph["nodes"][number][];
  edges: DependencyGraph["edges"][number][];
}

function addEdge(
  graph: MutableGraph,
  from: string,
  to: string,
  kind: DependencyGraph["edges"][number]["kind"],
  directed: boolean,
): void {
  graph.edges.push({
    id: `edge-${graph.edges.length}`,
    from,
    to,
    kind,
    directed,
  });
}

function transformedTemplate(templateId: string, transform: ClusterTemplate["allowedTransforms"][number]) {
  return transformClusterTemplate(getClusterTemplate(templateId), transform);
}

export function buildStructuralDependencyGraph(
  request: GenerationRequest,
  composition: CompositionPlan,
): DependencyGraph {
  const mutable: MutableGraph = { nodes: [], edges: [] };

  for (const cluster of composition.clusters) {
    const clusterNodeId = `cluster:${cluster.id}`;
    mutable.nodes.push({ id: clusterNodeId, kind: "cluster", sourceId: cluster.id });
    const template = transformedTemplate(cluster.templateId, cluster.transform);

    const numberNodeByCellId = new Map<string, string>();
    for (const cell of template.cells) {
      if (cell.kind !== "number") continue;
      const runtimeCellId = cluster.cellIdMap[cell.id];
      if (!runtimeCellId) throw new Error(`Missing runtime cell mapping for ${cell.id}.`);
      const nodeId = `number:${runtimeCellId}`;
      numberNodeByCellId.set(cell.id, nodeId);
      mutable.nodes.push({ id: nodeId, kind: "number-cell", sourceId: runtimeCellId });
    }

    for (const equation of template.equations) {
      const equationSourceId = `${cluster.id}:${equation.id.split(":").pop()!}`;
      const equationNodeId = `equation:${equationSourceId}`;
      mutable.nodes.push({ id: equationNodeId, kind: "equation", sourceId: equationSourceId });
      addEdge(mutable, clusterNodeId, equationNodeId, "bridges-cluster", true);
      for (const cellId of [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]]) {
        const numberNodeId = numberNodeByCellId.get(cellId);
        if (!numberNodeId) throw new Error(`Equation ${equation.id} references unknown number cell.`);
        addEdge(mutable, equationNodeId, numberNodeId, "shares-value", false);
      }
    }
  }

  mutable.nodes.sort((a, b) => a.id.localeCompare(b.id));
  mutable.edges.sort((a, b) =>
    a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind),
  );
  const provisional: DependencyGraph = {
    schema: GENERATION_SCHEMA_IDS.dependencyGraph,
    id: `${composition.id}:dependency`,
    nodes: Object.freeze(mutable.nodes),
    edges: Object.freeze(mutable.edges.map((edge, index) => ({ ...edge, id: `edge-${index}` }))),
    metrics: {},
  };
  const graph: DependencyGraph = Object.freeze({
    ...provisional,
    metrics: Object.freeze({ ...calculateDependencyMetrics(provisional) }),
  });
  assertValidDependencyGraph(graph);
  return graph;
}
