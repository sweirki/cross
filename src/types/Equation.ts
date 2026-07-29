import type { Operator } from "./Operator";
import type { EquationOrientation } from "./Topology";

export interface Equation {
  readonly id: string;
  readonly orientation: EquationOrientation;
  readonly cellIds: readonly [string, string, string, string, string];
  readonly operator: Exclude<Operator, "=">;
}
