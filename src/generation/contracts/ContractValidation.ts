import {
  GENERATION_SCHEMA_IDS,
  assertSupportedGenerationSchema,
} from "../versioning/SchemaVersions";
import type {
  CompositionPlan,
  GenerationRequest,
  VersionedGenerationContract,
} from "./GenerationContracts";

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) throw new Error(`${name} must not be empty.`);
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

export function validateVersionedContract(contract: VersionedGenerationContract): void {
  assertSupportedGenerationSchema(contract.schema);
}

export function validateGenerationRequest(request: GenerationRequest): void {
  validateVersionedContract(request);
  if (request.schema !== GENERATION_SCHEMA_IDS.generationRequest) {
    throw new Error("GenerationRequest has the wrong schema.");
  }
  assertNonEmpty(request.requestId, "requestId");
  assertNonEmpty(request.rootSeed, "rootSeed");
  assertNonEmpty(request.generatorVersion, "generatorVersion");
  assertPositiveInteger(request.candidateCount, "candidateCount");

  const c = request.constraints;
  const pairs: readonly [number | undefined, number | undefined, string][] = [
    [c.minimumRows, c.maximumRows, "rows"],
    [c.minimumColumns, c.maximumColumns, "columns"],
  ];
  for (const [minimum, maximum, name] of pairs) {
    if (minimum !== undefined) assertPositiveInteger(minimum, `minimum ${name}`);
    if (maximum !== undefined) assertPositiveInteger(maximum, `maximum ${name}`);
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      throw new Error(`minimum ${name} must not exceed maximum ${name}.`);
    }
  }
}

export function validateCompositionPlan(plan: CompositionPlan): void {
  validateVersionedContract(plan);
  if (plan.schema !== GENERATION_SCHEMA_IDS.compositionPlan) {
    throw new Error("CompositionPlan has the wrong schema.");
  }
  assertNonEmpty(plan.id, "composition id");
  assertPositiveInteger(plan.rows, "composition rows");
  assertPositiveInteger(plan.columns, "composition columns");

  const positions = new Set<string>();
  const cellIds = new Set<string>();
  for (const cell of plan.occupiedCells) {
    if (cell.position.row < 0 || cell.position.row >= plan.rows ||
        cell.position.col < 0 || cell.position.col >= plan.columns) {
      throw new Error(`Cell ${cell.cellId} is outside composition bounds.`);
    }
    const positionKey = `${cell.position.row}:${cell.position.col}`;
    if (positions.has(positionKey)) throw new Error(`Duplicate occupied position ${positionKey}.`);
    if (cellIds.has(cell.cellId)) throw new Error(`Duplicate cell id ${cell.cellId}.`);
    positions.add(positionKey);
    cellIds.add(cell.cellId);
  }
}
