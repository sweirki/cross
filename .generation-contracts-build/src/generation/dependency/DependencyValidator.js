"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDependencyGraph = validateDependencyGraph;
exports.assertValidDependencyGraph = assertValidDependencyGraph;
const SchemaVersions_1 = require("../versioning/SchemaVersions");
function validateDependencyGraph(graph) {
    const errors = [];
    if (graph.schema !== SchemaVersions_1.GENERATION_SCHEMA_IDS.dependencyGraph) {
        errors.push(`Unsupported dependency graph schema: ${graph.schema}`);
    }
    if (!graph.id.trim())
        errors.push("Dependency graph id is required.");
    const nodeIds = new Set();
    for (const node of graph.nodes) {
        if (!node.id.trim())
            errors.push("Dependency node id is required.");
        if (nodeIds.has(node.id))
            errors.push(`Duplicate dependency node: ${node.id}`);
        nodeIds.add(node.id);
        if (!node.sourceId.trim())
            errors.push(`Node ${node.id} has no source id.`);
    }
    const edgeIds = new Set();
    const edgeKeys = new Set();
    for (const edge of graph.edges) {
        if (edgeIds.has(edge.id))
            errors.push(`Duplicate dependency edge: ${edge.id}`);
        edgeIds.add(edge.id);
        if (!nodeIds.has(edge.from))
            errors.push(`Edge ${edge.id} references missing node ${edge.from}.`);
        if (!nodeIds.has(edge.to))
            errors.push(`Edge ${edge.id} references missing node ${edge.to}.`);
        if (edge.from === edge.to)
            errors.push(`Edge ${edge.id} is a self-loop.`);
        const key = edge.directed
            ? `${edge.from}>${edge.to}:${edge.kind}`
            : [edge.from, edge.to].sort().join("~") + `:${edge.kind}`;
        if (edgeKeys.has(key))
            errors.push(`Duplicate dependency relationship: ${key}`);
        edgeKeys.add(key);
    }
    const numericMetrics = Object.entries(graph.metrics);
    for (const [name, value] of numericMetrics) {
        if (!Number.isFinite(value))
            errors.push(`Metric ${name} must be finite.`);
    }
    return { valid: errors.length === 0, errors };
}
function assertValidDependencyGraph(graph) {
    const result = validateDependencyGraph(graph);
    if (!result.valid)
        throw new Error(result.errors.join("\n"));
}
