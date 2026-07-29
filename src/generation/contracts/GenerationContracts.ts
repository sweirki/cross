import type { DifficultyTier } from "../../types/Difficulty";
import type { Operator } from "../../types/Operator";
import type { Position } from "../../types/Position";
import type { GenerationSchemaId } from "../versioning/SchemaVersions";

export interface VersionedGenerationContract {
  readonly schema: GenerationSchemaId;
}

export type GenerationStage =
  | "composition"
  | "cluster-selection"
  | "placement"
  | "dependency"
  | "operator"
  | "numeric"
  | "clue"
  | "candidate"
  | "certification";

export interface GenerationSeed extends VersionedGenerationContract {
  readonly rootSeed: string;
  readonly namespace: string;
  readonly value: number;
  readonly path: readonly string[];
}

export interface GenerationRequest extends VersionedGenerationContract {
  readonly requestId: string;
  readonly rootSeed: string;
  readonly difficulty: DifficultyTier;
  readonly generatorVersion: string;
  readonly candidateCount: number;
  readonly constraints: {
    readonly minimumRows?: number;
    readonly maximumRows?: number;
    readonly minimumColumns?: number;
    readonly maximumColumns?: number;
    readonly allowedOperators?: readonly Exclude<Operator, "=">[];
  };
}

export type ClusterCellKind = "number" | "operator" | "equals";

export interface ClusterCell {
  readonly id: string;
  readonly position: Position;
  readonly kind: ClusterCellKind;
}

export interface ClusterEquationPath {
  readonly id: string;
  readonly cellIds: readonly [string, string, string, string, string];
  readonly orientation: "horizontal" | "vertical";
}

export interface ClusterPort {
  readonly id: string;
  readonly cellId: string;
  readonly direction: "north" | "east" | "south" | "west";
}

export interface ClusterTemplate extends VersionedGenerationContract {
  readonly id: string;
  readonly canonicalId: string;
  readonly cells: readonly ClusterCell[];
  readonly equations: readonly ClusterEquationPath[];
  readonly ports: readonly ClusterPort[];
  readonly allowedTransforms: readonly (
    | "identity"
    | "rotate-90"
    | "rotate-180"
    | "rotate-270"
    | "reflect-horizontal"
    | "reflect-vertical"
  )[];
  readonly difficultyEligibility: readonly DifficultyTier[];
  readonly metadata: Readonly<Record<string, number | string | boolean>>;
}

export interface ClusterInstance extends VersionedGenerationContract {
  readonly id: string;
  readonly templateId: string;
  readonly transform: ClusterTemplate["allowedTransforms"][number];
  readonly origin: Position;
  readonly cellIdMap: Readonly<Record<string, string>>;
}

export interface CompositionPlan extends VersionedGenerationContract {
  readonly id: string;
  readonly family: string;
  readonly rows: number;
  readonly columns: number;
  readonly clusters: readonly ClusterInstance[];
  readonly occupiedCells: readonly {
    readonly cellId: string;
    readonly position: Position;
    readonly kind: ClusterCellKind;
    readonly clusterIds: readonly string[];
  }[];
  readonly metrics: Readonly<Record<string, number>>;
}

export type DependencyNodeKind = "equation" | "number-cell" | "cluster";
export type DependencyEdgeKind = "shares-value" | "unlocks" | "bridges-cluster";

export interface DependencyGraph extends VersionedGenerationContract {
  readonly id: string;
  readonly nodes: readonly {
    readonly id: string;
    readonly kind: DependencyNodeKind;
    readonly sourceId: string;
  }[];
  readonly edges: readonly {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly kind: DependencyEdgeKind;
    readonly directed: boolean;
  }[];
  readonly metrics: Readonly<Record<string, number>>;
}

export interface EquationFillPlan extends VersionedGenerationContract {
  readonly id: string;
  readonly operators: Readonly<Record<string, Exclude<Operator, "=">>>;
  readonly values: Readonly<Record<string, number>>;
  readonly profileId: string;
  readonly synthesisSeed: GenerationSeed;
}

export interface CluePlan extends VersionedGenerationContract {
  readonly id: string;
  readonly givenCellIds: readonly string[];
  readonly hiddenCellIds: readonly string[];
  readonly numberBank: readonly number[];
  readonly profileId: string;
  readonly clueSeed: GenerationSeed;
}


export type DeductionRule =
  | "equation-two-known"
  | "number-bank-last-value";

export interface DeductionStep {
  readonly index: number;
  readonly rule: DeductionRule;
  readonly cellId: string;
  readonly value: number;
  readonly equationId?: string;
  readonly prerequisiteCellIds: readonly string[];
}

export interface DeductionTrace {
  readonly solved: boolean;
  readonly steps: readonly DeductionStep[];
  readonly unresolvedCellIds: readonly string[];
  readonly metrics: Readonly<Record<string, number>>;
}

export interface CandidateCertificate extends VersionedGenerationContract {
  readonly valid: boolean;
  readonly certifiedDifficulty: DifficultyTier;
  readonly hardGateFailures: readonly string[];
  readonly scores: Readonly<Record<string, number>>;
  readonly fingerprints: Readonly<Record<string, string>>;
}

export interface PuzzleDNA extends VersionedGenerationContract {
  readonly generatorVersion: string;
  readonly rootSeed: string;
  readonly stageSeeds: Readonly<Record<GenerationStage, GenerationSeed>>;
  readonly compositionFamily: string;
  readonly clusterTemplateIds: readonly string[];
  readonly dependencyProfile: string;
  readonly operatorProfile: string;
  readonly clueProfile: string;
  readonly fingerprints: Readonly<Record<string, string>>;
}

export interface PuzzleCandidate extends VersionedGenerationContract {
  readonly id: string;
  readonly request: GenerationRequest;
  readonly composition: CompositionPlan;
  readonly dependency: DependencyGraph;
  readonly fill: EquationFillPlan;
  readonly clues: CluePlan;
  readonly certificate?: CandidateCertificate;
  readonly dna?: PuzzleDNA;
}
