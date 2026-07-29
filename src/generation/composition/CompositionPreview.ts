import type { CompositionPlan } from "../contracts/GenerationContracts";

export function renderCompositionAscii(plan: CompositionPlan): string {
  const grid = Array.from({ length: plan.rows }, () => Array(plan.columns).fill(" "));
  for (const cell of plan.occupiedCells) {
    grid[cell.position.row]![cell.position.col] =
      cell.kind === "number" ? "□" : cell.kind === "operator" ? "·" : "=";
  }
  return grid.map((row) => row.join("").replace(/\s+$/u, "")).join("\n");
}
