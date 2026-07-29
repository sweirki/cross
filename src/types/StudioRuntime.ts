import type {
  ContentCatalog,
  ContentIssue,
  ContentKind,
  ContentPack,
  ContentPlatformEvent,
  ContentResource,
  ContentValidationResult,
} from "./ContentPlatformRuntime";

export interface StudioSelection {
  readonly kind: ContentKind;
  readonly id: string;
  readonly version: string;
}

export interface StudioSnapshot {
  readonly pack: ContentPack;
  readonly selection?: StudioSelection;
}

export interface StudioProject {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly engineVersion: string;
  readonly revision: number;
  readonly savedRevision: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly snapshot: StudioSnapshot;
  readonly undo: readonly StudioSnapshot[];
  readonly redo: readonly StudioSnapshot[];
}

export type StudioEvent =
  | { readonly type: "project-created"; readonly projectId: string }
  | { readonly type: "resource-added"; readonly key: string }
  | { readonly type: "resource-updated"; readonly key: string }
  | { readonly type: "resource-removed"; readonly key: string }
  | { readonly type: "resource-duplicated"; readonly sourceKey: string; readonly targetKey: string }
  | { readonly type: "selection-changed"; readonly key?: string }
  | { readonly type: "project-undone"; readonly revision: number }
  | { readonly type: "project-redone"; readonly revision: number }
  | { readonly type: "project-saved"; readonly revision: number }
  | { readonly type: "project-validated"; readonly valid: boolean }
  | { readonly type: "simulation-completed"; readonly generated: number; readonly accepted: number }
  | { readonly type: "pack-prepared"; readonly packId: string }
  | ContentPlatformEvent;

export interface StudioTransition {
  readonly project: StudioProject;
  readonly events: readonly StudioEvent[];
}

export interface StudioValidationResult extends ContentValidationResult {
  readonly publishable: boolean;
  readonly dirty: boolean;
}

export interface StudioGenerationRequest {
  readonly count: number;
  readonly seed: number;
  readonly kind?: ContentKind;
  readonly tags?: readonly string[];
}

export interface StudioGeneratedResource {
  readonly resource: ContentResource;
  readonly diagnostics?: Readonly<Record<string, number | string | boolean>>;
}

export interface StudioGenerator {
  generate(seed: number, index: number): StudioGeneratedResource;
}

export interface StudioSimulationSample {
  readonly key: string;
  readonly accepted: boolean;
  readonly difficulty?: number;
  readonly solveNodes?: number;
  readonly reason?: string;
}

export interface StudioSimulationReport {
  readonly requested: number;
  readonly generated: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly acceptanceRate: number;
  readonly averageDifficulty: number;
  readonly averageSolveNodes: number;
  readonly samples: readonly StudioSimulationSample[];
}

export interface StudioImportResult {
  readonly project: StudioProject;
  readonly validation: StudioValidationResult;
}

export interface CrossMathStudioContract {
  createProject(projectId: string, pack: ContentPack, engineVersion: string, now: number): StudioTransition;
  addResource(project: StudioProject, resource: ContentResource, now: number): StudioTransition;
  updateResource(project: StudioProject, resource: ContentResource, now: number): StudioTransition;
  removeResource(project: StudioProject, kind: ContentKind, id: string, version: string, now: number): StudioTransition;
  duplicateResource(project: StudioProject, source: StudioSelection, targetId: string, targetVersion: string, now: number): StudioTransition;
  select(project: StudioProject, selection: StudioSelection | undefined): StudioTransition;
  undo(project: StudioProject, now: number): StudioTransition;
  redo(project: StudioProject, now: number): StudioTransition;
  markSaved(project: StudioProject): StudioTransition;
  validate(project: StudioProject): StudioValidationResult;
  buildCatalog(project: StudioProject): ContentCatalog;
  generate(project: StudioProject, request: StudioGenerationRequest, generator: StudioGenerator, now: number): StudioTransition;
  simulate(request: StudioGenerationRequest, generator: StudioGenerator): StudioSimulationReport;
  prepareForReview(project: StudioProject, now: number): StudioTransition;
  publish(project: StudioProject, now: number): StudioTransition;
  exportProject(project: StudioProject): string;
  importProject(serialized: string): StudioImportResult;
}
