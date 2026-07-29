"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDependencyMetrics = calculateDependencyMetrics;
function adjacency(graph) {
    const result = new Map(graph.nodes.map((node) => [node.id, new Set()]));
    for (const edge of graph.edges) {
        result.get(edge.from)?.add(edge.to);
        result.get(edge.to)?.add(edge.from);
    }
    return result;
}
function componentCount(adj) {
    const visited = new Set();
    let count = 0;
    for (const start of adj.keys()) {
        if (visited.has(start))
            continue;
        count += 1;
        const stack = [start];
        visited.add(start);
        while (stack.length > 0) {
            const current = stack.pop();
            for (const next of adj.get(current) ?? []) {
                if (!visited.has(next)) {
                    visited.add(next);
                    stack.push(next);
                }
            }
        }
    }
    return count;
}
function longestShortestPath(adj) {
    let longest = 0;
    for (const start of adj.keys()) {
        const distances = new Map([[start, 0]]);
        const queue = [start];
        for (let index = 0; index < queue.length; index += 1) {
            const current = queue[index];
            const distance = distances.get(current);
            longest = Math.max(longest, distance);
            for (const next of adj.get(current) ?? []) {
                if (!distances.has(next)) {
                    distances.set(next, distance + 1);
                    queue.push(next);
                }
            }
        }
    }
    return longest;
}
function articulationPoints(adj) {
    let time = 0;
    const discovery = new Map();
    const low = new Map();
    const parent = new Map();
    const points = new Set();
    const visit = (node) => {
        discovery.set(node, ++time);
        low.set(node, discovery.get(node));
        let children = 0;
        for (const next of adj.get(node) ?? []) {
            if (!discovery.has(next)) {
                children += 1;
                parent.set(next, node);
                visit(next);
                low.set(node, Math.min(low.get(node), low.get(next)));
                if (parent.get(node) === undefined && children > 1)
                    points.add(node);
                if (parent.get(node) !== undefined && low.get(next) >= discovery.get(node)) {
                    points.add(node);
                }
            }
            else if (next !== parent.get(node)) {
                low.set(node, Math.min(low.get(node), discovery.get(next)));
            }
        }
    };
    for (const node of adj.keys()) {
        if (!discovery.has(node)) {
            parent.set(node, undefined);
            visit(node);
        }
    }
    return points.size;
}
function calculateDependencyMetrics(graph) {
    const adj = adjacency(graph);
    const degrees = [...adj.values()].map((neighbors) => neighbors.size);
    const components = componentCount(adj);
    const edgeCount = graph.edges.length;
    const nodeCount = graph.nodes.length;
    const equationNodes = graph.nodes.filter((node) => node.kind === "equation");
    const startingNodeCount = equationNodes.filter((node) => (adj.get(node.id)?.size ?? 0) <= 2).length;
    const branchingNodes = equationNodes.filter((node) => (adj.get(node.id)?.size ?? 0) > 2);
    const branchingFactor = branchingNodes.length === 0
        ? 0
        : branchingNodes.reduce((sum, node) => sum + (adj.get(node.id)?.size ?? 0) - 2, 0) /
            branchingNodes.length;
    return {
        nodeCount,
        edgeCount,
        equationCount: equationNodes.length,
        numberCellCount: graph.nodes.filter((node) => node.kind === "number-cell").length,
        clusterCount: graph.nodes.filter((node) => node.kind === "cluster").length,
        componentCount: components,
        cycleRank: Math.max(0, edgeCount - nodeCount + components),
        averageDegree: nodeCount === 0 ? 0 : (edgeCount * 2) / nodeCount,
        maximumDegree: degrees.length === 0 ? 0 : Math.max(...degrees),
        branchingFactor,
        startingNodeCount,
        longestPath: longestShortestPath(adj),
        articulationPointCount: articulationPoints(adj),
        bridgeEdgeCount: graph.edges.filter((edge) => edge.kind === "bridges-cluster").length,
    };
}
