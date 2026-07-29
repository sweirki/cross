
import type { DependencyGraph } from "../contracts/GenerationContracts";

export function renderDependencyGraphAsText(graph: DependencyGraph): string {
  const lines = [`DependencyGraph ${graph.id}`];
  const edgesByNode = new Map<string, string[]>();
  for (const node of graph.nodes) edgesByNode.set(node.id, []);
  for (const edge of graph.edges) {
    edgesByNode.get(edge.from)?.push(`${edge.directed ? "->" : "--"} ${edge.to} [${edge.kind}]`);
    if (!edge.directed) edgesByNode.get(edge.to)?.push(`-- ${edge.from} [${edge.kind}]`);
  }
  for (const node of graph.nodes) {
    lines.push(`${node.kind} ${node.id}`);
    for (const edge of (edgesByNode.get(node.id) ?? []).sort()) lines.push(`  ${edge}`);
  }
  return lines.join("\n");
}
