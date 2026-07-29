Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = 'C:\cross'

if (-not (Test-Path -LiteralPath $ProjectRoot)) {
    throw "Project folder not found: $ProjectRoot"
}

Set-Location -LiteralPath $ProjectRoot

$files = @{
    '.\docs\TOPOLOGY_SPECIFICATION.md' = @'
# Cross Board Topology Specification

Version: 1.0  
Status: Draft

## 1. Core Rule

A Cross puzzle is one connected constraint network.

It must never be generated as a collection of independent equations placed near one another.

Number positions form the shared variables of the network. Horizontal and vertical equation paths intersect only through shared number positions.

## 2. Grid Coordinate System

The board uses zero-based coordinates:

- `row`: vertical position
- `column`: horizontal position

The top-left coordinate is:

```text
row 0, column 0
```

Every occupied coordinate must be unique.

## 3. Topology Node Kinds

A board coordinate may contain exactly one of these node kinds:

### Number

A numeric operand or result.

A number node may be:

- visible as a starting clue,
- hidden and filled by the player,
- shared by one horizontal and one vertical equation.

Only number nodes may be shared between equations.

### Operator

One arithmetic operator:

- addition
- subtraction
- multiplication
- division

An operator belongs to exactly one equation path.

### Equals

The equality symbol separating the expression from its result.

An equals node belongs to exactly one equation path.

### Blocked

A coordinate that contains no playable content.

Blocked coordinates do not need to be serialized unless a renderer requires a complete rectangular matrix.

## 4. Equation Path

The initial canonical equation shape is:

```text
number operator number equals number
```

Each equation therefore contains exactly five ordered nodes.

Valid horizontal coordinate progression:

```text
(row, column)
(row, column + 1)
(row, column + 2)
(row, column + 3)
(row, column + 4)
```

Valid vertical coordinate progression:

```text
(row, column)
(row + 1, column)
(row + 2, column)
(row + 3, column)
(row + 4, column)
```

Longer expressions are intentionally excluded from the first engine version.

## 5. Legal Intersections

Two equations may intersect only when:

1. both reference the same coordinate;
2. both use that coordinate as a number node;
3. one equation is horizontal and the other is vertical;
4. both equations reference the same numeric value at that coordinate.

The following intersections are illegal:

- operator with operator,
- operator with number,
- equals with number,
- equals with equals,
- two horizontal equations sharing a node,
- two vertical equations sharing a node.

## 6. Connectivity

Every equation must belong to one connected component.

A board containing two disconnected groups of equations is invalid even if every equation is mathematically correct.

Connectivity is measured through shared number nodes.

## 7. Participation Rules

A number node may participate in:

- one horizontal equation,
- one vertical equation,
- or both.

A number node may not participate in more than two equations.

An operator or equals node must participate in exactly one equation.

Every hidden number node must participate in at least one equation.

## 8. Number Bank Relationship

Every hidden number node corresponds to exactly one tile occurrence in the number bank.

Duplicate values are allowed only when represented as distinct tile identities.

Example:

```text
value 8, tile A
value 8, tile B
```

The game must track tile identity, not only tile value.

## 9. Topology Validation

A topology is valid only when all of the following pass:

1. all node IDs are unique;
2. all occupied coordinates are unique;
3. every equation references existing nodes;
4. every equation follows a straight horizontal or vertical path;
5. every equation follows the canonical five-node pattern;
6. intersections occur only at number nodes;
7. all equations form one connected component;
8. node participation limits are respected;
9. no equation is duplicated;
10. at least one genuine horizontal/vertical intersection exists.

## 10. Generation Order

The generator must follow this order:

```text
topology skeleton
    -> equation paths
    -> intersection graph
    -> operator assignment
    -> number synthesis
    -> clue removal
    -> number bank creation
    -> uniqueness verification
    -> difficulty certification
```

Numbers must not be generated before the topology and intersection graph exist.

## 11. Locked Product Rule

A visually crossed set of independent equations is not a valid Cross puzzle.

The shared coordinate must represent the same logical number variable in every equation that uses it.
'@

    '.\src\types\Topology.ts' = @'
export type NodeId = string;
export type EquationId = string;

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export type ArithmeticOperator =
  | "add"
  | "subtract"
  | "multiply"
  | "divide";

export type TopologyNodeKind =
  | "number"
  | "operator"
  | "equals";

export type EquationOrientation =
  | "horizontal"
  | "vertical";

export interface NumberTopologyNode {
  readonly id: NodeId;
  readonly kind: "number";
  readonly position: GridPosition;
}

export interface OperatorTopologyNode {
  readonly id: NodeId;
  readonly kind: "operator";
  readonly position: GridPosition;
  readonly operator: ArithmeticOperator;
}

export interface EqualsTopologyNode {
  readonly id: NodeId;
  readonly kind: "equals";
  readonly position: GridPosition;
}

export type TopologyNode =
  | NumberTopologyNode
  | OperatorTopologyNode
  | EqualsTopologyNode;

export interface EquationPath {
  readonly id: EquationId;
  readonly orientation: EquationOrientation;

  /**
   * Ordered canonical path:
   * number, operator, number, equals, number
   */
  readonly nodeIds: readonly [
    NodeId,
    NodeId,
    NodeId,
    NodeId,
    NodeId,
  ];
}

export interface BoardTopology {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly TopologyNode[];
  readonly equations: readonly EquationPath[];
}
'@

    '.\src\game\validation\TopologyValidation.ts' = @'
import type {
  BoardTopology,
  EquationId,
  NodeId,
} from "../../types/Topology";

export type TopologyValidationCode =
  | "INVALID_DIMENSIONS"
  | "DUPLICATE_NODE_ID"
  | "DUPLICATE_EQUATION_ID"
  | "POSITION_OUT_OF_BOUNDS"
  | "DUPLICATE_POSITION"
  | "MISSING_NODE_REFERENCE"
  | "INVALID_EQUATION_PATTERN"
  | "INVALID_EQUATION_PATH"
  | "ILLEGAL_INTERSECTION"
  | "NODE_PARTICIPATION_EXCEEDED"
  | "DISCONNECTED_EQUATION_GRAPH"
  | "NO_GENUINE_INTERSECTION";

export interface TopologyValidationIssue {
  readonly code: TopologyValidationCode;
  readonly message: string;
  readonly nodeId?: NodeId;
  readonly equationId?: EquationId;
}

export interface TopologyValidationResult {
  readonly valid: boolean;
  readonly issues: readonly TopologyValidationIssue[];
}

export interface TopologyValidator {
  validate(topology: BoardTopology): TopologyValidationResult;
}
'@
}

foreach ($path in $files.Keys) {
    $parent = Split-Path -Parent $path

    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $files[$path] | Set-Content -Encoding utf8 -Path $path
}

Write-Host ''
Write-Host 'Phase 2.3 files created:'
Write-Host '  docs/TOPOLOGY_SPECIFICATION.md'
Write-Host '  src/types/Topology.ts'
Write-Host '  src/game/validation/TopologyValidation.ts'
Write-Host ''

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw 'TypeScript validation failed.'
}

Write-Host ''
Write-Host 'Phase 2.3 topology contracts passed TypeScript validation.'
