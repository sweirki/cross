"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStructuralDependencyGraph = buildStructuralDependencyGraph;
const ClusterLibrary_1 = require("../clusters/ClusterLibrary");
const ClusterTransforms_1 = require("../clusters/ClusterTransforms");
const SchemaVersions_1 = require("../versioning/SchemaVersions");
const DependencyMetrics_1 = require("./DependencyMetrics");
const DependencyValidator_1 = require("./DependencyValidator");
function addEdge(graph, from, to, kind, directed) {
    graph.edges.push({
        id: `edge-${graph.edges.length}`,
        from,
        to,
        kind,
        directed,
    });
}
function transformedTemplate(templateId, transform) {
    return (0, ClusterTransforms_1.transformClusterTemplate)((0, ClusterLibrary_1.getClusterTemplate)(templateId), transform);
}
function buildStructuralDependencyGraph(request, composition) {
    const mutable = { nodes: [], edges: [] };
    for (const cluster of composition.clusters) {
        const clusterNodeId = `cluster:${cluster.id}`;
        mutable.nodes.push({ id: clusterNodeId, kind: "cluster", sourceId: cluster.id });
        const template = transformedTemplate(cluster.templateId, cluster.transform);
        const numberNodeByCellId = new Map();
        for (const cell of template.cells) {
            if (cell.kind !== "number")
                continue;
            const runtimeCellId = cluster.cellIdMap[cell.id];
            if (!runtimeCellId)
                throw new Error(`Missing runtime cell mapping for ${cell.id}.`);
            const nodeId = `number:${runtimeCellId}`;
            numberNodeByCellId.set(cell.id, nodeId);
            mutable.nodes.push({ id: nodeId, kind: "number-cell", sourceId: runtimeCellId });
        }
        for (const equation of template.equations) {
            const equationSourceId = `${cluster.id}:${equation.id.split(":").pop()}`;
            const equationNodeId = `equation:${equationSourceId}`;
            mutable.nodes.push({ id: equationNodeId, kind: "equation", sourceId: equationSourceId });
            addEdge(mutable, clusterNodeId, equationNodeId, "bridges-cluster", true);
            for (const cellId of [equation.cellIds[0], equation.cellIds[2], equation.cellIds[4]]) {
                const numberNodeId = numberNodeByCellId.get(cellId);
                if (!numberNodeId)
                    throw new Error(`Equation ${equation.id} references unknown number cell.`);
                addEdge(mutable, equationNodeId, numberNodeId, "shares-value", false);
            }
        }
    }
    mutable.nodes.sort((a, b) => a.id.localeCompare(b.id));
    mutable.edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind));
    const provisional = {
        schema: SchemaVersions_1.GENERATION_SCHEMA_IDS.dependencyGraph,
        id: `${composition.id}:dependency`,
        nodes: Object.freeze(mutable.nodes),
        edges: Object.freeze(mutable.edges.map((edge, index) => ({ ...edge, id: `edge-${index}` }))),
        metrics: {},
    };
    const graph = Object.freeze({
        ...provisional,
        metrics: Object.freeze({ ...(0, DependencyMetrics_1.calculateDependencyMetrics)(provisional) }),
    });
    (0, DependencyValidator_1.assertValidDependencyGraph)(graph);
    return graph;
}
