
import type { DependencyGraph } from "../contracts/GenerationContracts";

export interface DependencyMetrics {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly equationCount: number;
  readonly numberCellCount: number;
  readonly clusterCount: number;
  readonly componentCount: number;
  readonly cycleRank: number;
  readonly averageDegree: number;
  readonly maximumDegree: number;
  readonly branchingFactor: number;
  readonly startingNodeCount: number;
  readonly longestPath: number;
  readonly articulationPointCount: number;
  readonly bridgeEdgeCount: number;
}

function adjacency(graph: DependencyGraph): Map<string, Set<string>> {
  const result = new Map(graph.nodes.map((node) => [node.id, new Set<string>()] as const));
  for (const edge of graph.edges) {
    result.get(edge.from)?.add(edge.to);
    result.get(edge.to)?.add(edge.from);
  }
  return result;
}

function componentCount(adj: Map<string, Set<string>>): number {
  const visited = new Set<string>();
  let count = 0;
  for (const start of adj.keys()) {
    if (visited.has(start)) continue;
    count += 1;
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const current = stack.pop()!;
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

function longestShortestPath(adj: Map<string, Set<string>>): number {
  let longest = 0;
  for (const start of adj.keys()) {
    const distances = new Map<string, number>([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]!;
      const distance = distances.get(current)!;
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

function articulationPoints(adj: Map<string, Set<string>>): number {
  let time = 0;
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | undefined>();
  const points = new Set<string>();

  const visit = (node: string): void => {
    discovery.set(node, ++time);
    low.set(node, discovery.get(node)!);
    let children = 0;
    for (const next of adj.get(node) ?? []) {
      if (!discovery.has(next)) {
        children += 1;
        parent.set(next, node);
        visit(next);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
        if (parent.get(node) === undefined && children > 1) points.add(node);
        if (parent.get(node) !== undefined && low.get(next)! >= discovery.get(node)!) {
          points.add(node);
        }
      } else if (next !== parent.get(node)) {
        low.set(node, Math.min(low.get(node)!, discovery.get(next)!));
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

export function calculateDependencyMetrics(graph: DependencyGraph): DependencyMetrics {
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
