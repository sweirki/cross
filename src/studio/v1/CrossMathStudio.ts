import type {
  ContentKind,
  ContentPack,
  ContentResource,
} from "../../types/ContentPlatformRuntime";
import type {
  CrossMathStudioContract,
  StudioEvent,
  StudioGeneratedResource,
  StudioGenerationRequest,
  StudioImportResult,
  StudioProject,
  StudioSelection,
  StudioSimulationReport,
  StudioSimulationSample,
  StudioSnapshot,
  StudioTransition,
  StudioValidationResult,
  StudioGenerator,
} from "../../types/StudioRuntime";
import { CrossMathContentPlatform } from "../../content/v1";

const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
const MAX_HISTORY = 100;

function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => item === undefined ? "null" : canonical(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function clone<T>(value: T): T {
  return JSON.parse(canonical(value)) as T;
}

function assertTime(now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Studio time must be a non-negative integer");
}

function key(value: StudioSelection | Pick<ContentResource, "kind" | "id" | "version">): string {
  return `${value.kind}:${value.id}@${value.version}`;
}

function find(pack: ContentPack, selection: StudioSelection): ContentResource | undefined {
  return pack.resources.find((resource) =>
    resource.kind === selection.kind &&
    resource.id === selection.id &&
    resource.version === selection.version);
}

function assertProject(project: StudioProject): void {
  if (project.schemaVersion !== 1) throw new Error("Unsupported Studio project schema");
  if (!ID.test(project.projectId)) throw new Error("Invalid Studio project ID");
  if (!SEMVER.test(project.engineVersion)) throw new Error("Invalid Studio engine version");
  if (!Number.isSafeInteger(project.revision) || project.revision < 0) throw new Error("Invalid Studio revision");
  if (!Number.isSafeInteger(project.savedRevision) || project.savedRevision < 0 || project.savedRevision > project.revision) {
    throw new Error("Invalid Studio saved revision");
  }
  assertTime(project.createdAt);
  assertTime(project.updatedAt);
  if (project.updatedAt < project.createdAt) throw new Error("Studio update time precedes creation");
  if (!Array.isArray(project.undo) || !Array.isArray(project.redo)) throw new Error("Invalid Studio history");
  if (project.snapshot.selection && !find(project.snapshot.pack, project.snapshot.selection)) {
    throw new Error("Studio selection references an unknown resource");
  }
}

function changed(project: StudioProject, snapshot: StudioSnapshot, now: number): StudioProject {
  assertTime(now);
  if (now < project.updatedAt) throw new Error("Studio time cannot move backwards");
  return {
    ...project,
    revision: project.revision + 1,
    updatedAt: now,
    snapshot: clone(snapshot),
    undo: [...project.undo, clone(project.snapshot)].slice(-MAX_HISTORY),
    redo: [],
  };
}

function resourceSort(a: ContentResource, b: ContentResource): number {
  return key(a).localeCompare(key(b));
}

export class CrossMathStudio implements CrossMathStudioContract {
  public constructor(private readonly platform = new CrossMathContentPlatform()) {}

  public createProject(projectId: string, pack: ContentPack, engineVersion: string, now: number): StudioTransition {
    assertTime(now);
    if (!ID.test(projectId)) throw new Error("Invalid Studio project ID");
    if (!SEMVER.test(engineVersion)) throw new Error("Invalid Studio engine version");
    const project: StudioProject = {
      schemaVersion: 1,
      projectId,
      engineVersion,
      revision: 0,
      savedRevision: 0,
      createdAt: now,
      updatedAt: now,
      snapshot: { pack: clone(pack) },
      undo: [],
      redo: [],
    };
    assertProject(project);
    return { project, events: [{ type: "project-created", projectId }] };
  }

  public addResource(project: StudioProject, resource: ContentResource, now: number): StudioTransition {
    assertProject(project);
    if (find(project.snapshot.pack, resource)) throw new Error(`Resource already exists: ${key(resource)}`);
    const pack = { ...project.snapshot.pack, integrity: undefined, resources: [...project.snapshot.pack.resources, clone(resource)].sort(resourceSort) };
    return {
      project: changed(project, { pack, selection: { kind: resource.kind, id: resource.id, version: resource.version } }, now),
      events: [{ type: "resource-added", key: key(resource) }],
    };
  }

  public updateResource(project: StudioProject, resource: ContentResource, now: number): StudioTransition {
    assertProject(project);
    if (!find(project.snapshot.pack, resource)) throw new Error(`Unknown resource: ${key(resource)}`);
    const resources = project.snapshot.pack.resources.map((current) => key(current) === key(resource) ? clone(resource) : current).sort(resourceSort);
    const pack = { ...project.snapshot.pack, integrity: undefined, resources };
    return {
      project: changed(project, { pack, selection: { kind: resource.kind, id: resource.id, version: resource.version } }, now),
      events: [{ type: "resource-updated", key: key(resource) }],
    };
  }

  public removeResource(project: StudioProject, kind: ContentKind, id: string, version: string, now: number): StudioTransition {
    assertProject(project);
    const selection = { kind, id, version };
    if (!find(project.snapshot.pack, selection)) throw new Error(`Unknown resource: ${key(selection)}`);
    for (const resource of project.snapshot.pack.resources) {
      const dependency = resource.dependencies.find((item) =>
        !item.optional && item.kind === kind && item.id === id && (!item.version || item.version === version));
      if (dependency) throw new Error(`Resource is required by ${key(resource)}`);
    }
    const resources = project.snapshot.pack.resources.filter((resource) => key(resource) !== key(selection));
    const pack = { ...project.snapshot.pack, integrity: undefined, resources };
    const nextSelection = project.snapshot.selection && key(project.snapshot.selection) === key(selection) ? undefined : project.snapshot.selection;
    return {
      project: changed(project, { pack, selection: nextSelection }, now),
      events: [{ type: "resource-removed", key: key(selection) }],
    };
  }

  public duplicateResource(project: StudioProject, source: StudioSelection, targetId: string, targetVersion: string, now: number): StudioTransition {
    assertProject(project);
    if (!ID.test(targetId)) throw new Error("Invalid duplicate resource ID");
    if (!SEMVER.test(targetVersion)) throw new Error("Invalid duplicate resource version");
    const original = find(project.snapshot.pack, source);
    if (!original) throw new Error(`Unknown resource: ${key(source)}`);
    const copy = { ...clone(original), id: targetId, version: targetVersion, status: "draft" as const };
    if (find(project.snapshot.pack, copy)) throw new Error(`Resource already exists: ${key(copy)}`);
    const result = this.addResource(project, copy, now);
    return {
      project: result.project,
      events: [{ type: "resource-duplicated", sourceKey: key(source), targetKey: key(copy) }],
    };
  }

  public select(project: StudioProject, selection: StudioSelection | undefined): StudioTransition {
    assertProject(project);
    if (selection && !find(project.snapshot.pack, selection)) throw new Error(`Unknown resource: ${key(selection)}`);
    const next = { ...project, snapshot: { ...project.snapshot, selection: selection ? clone(selection) : undefined } };
    return { project: next, events: [{ type: "selection-changed", key: selection ? key(selection) : undefined }] };
  }

  public undo(project: StudioProject, now: number): StudioTransition {
    assertProject(project);
    assertTime(now);
    const snapshot = project.undo.at(-1);
    if (!snapshot) throw new Error("Nothing to undo");
    const next: StudioProject = {
      ...project,
      revision: project.revision + 1,
      updatedAt: now,
      snapshot: clone(snapshot),
      undo: project.undo.slice(0, -1),
      redo: [clone(project.snapshot), ...project.redo].slice(0, MAX_HISTORY),
    };
    return { project: next, events: [{ type: "project-undone", revision: next.revision }] };
  }

  public redo(project: StudioProject, now: number): StudioTransition {
    assertProject(project);
    assertTime(now);
    const snapshot = project.redo[0];
    if (!snapshot) throw new Error("Nothing to redo");
    const next: StudioProject = {
      ...project,
      revision: project.revision + 1,
      updatedAt: now,
      snapshot: clone(snapshot),
      undo: [...project.undo, clone(project.snapshot)].slice(-MAX_HISTORY),
      redo: project.redo.slice(1),
    };
    return { project: next, events: [{ type: "project-redone", revision: next.revision }] };
  }

  public markSaved(project: StudioProject): StudioTransition {
    assertProject(project);
    const next = { ...project, savedRevision: project.revision };
    return { project: next, events: [{ type: "project-saved", revision: next.revision }] };
  }

  public validate(project: StudioProject): StudioValidationResult {
    assertProject(project);
    const content = this.platform.validatePack(project.snapshot.pack);
    const compatibility = this.platform.checkCompatibility(project.snapshot.pack, project.engineVersion);
    const issues = [...content.issues, ...compatibility.issues];
    const valid = !issues.some((issue) => issue.severity === "error");
    const allReviewed = project.snapshot.pack.resources.length > 0 &&
      project.snapshot.pack.resources.every((resource) => resource.status === "review" || resource.status === "published");
    return {
      valid,
      publishable: valid && allReviewed,
      dirty: project.revision !== project.savedRevision,
      issues,
    };
  }

  public buildCatalog(project: StudioProject) {
    assertProject(project);
    return this.platform.buildCatalog([project.snapshot.pack]);
  }

  public generate(project: StudioProject, request: StudioGenerationRequest, generator: StudioGenerator, now: number): StudioTransition {
    assertProject(project);
    this.assertGenerationRequest(request);
    const generated: ContentResource[] = [];
    const keys = new Set(project.snapshot.pack.resources.map(key));
    for (let index = 0; index < request.count; index += 1) {
      const item = generator.generate(request.seed, index);
      if (request.kind && item.resource.kind !== request.kind) throw new Error("Generator returned an unexpected content kind");
      if (keys.has(key(item.resource))) throw new Error(`Generated duplicate resource: ${key(item.resource)}`);
      keys.add(key(item.resource));
      generated.push(clone(item.resource));
    }
    const pack = {
      ...project.snapshot.pack,
      integrity: undefined,
      resources: [...project.snapshot.pack.resources, ...generated].sort(resourceSort),
    };
    const next = changed(project, { pack, selection: project.snapshot.selection }, now);
    return {
      project: next,
      events: generated.map((resource): StudioEvent => ({ type: "resource-added", key: key(resource) })),
    };
  }

  public simulate(request: StudioGenerationRequest, generator: StudioGenerator): StudioSimulationReport {
    this.assertGenerationRequest(request);
    const samples: StudioSimulationSample[] = [];
    for (let index = 0; index < request.count; index += 1) {
      try {
        const generated: StudioGeneratedResource = generator.generate(request.seed, index);
        const diagnostics = generated.diagnostics ?? {};
        const accepted = diagnostics.accepted !== false;
        samples.push({
          key: key(generated.resource),
          accepted,
          difficulty: typeof diagnostics.difficulty === "number" ? diagnostics.difficulty : undefined,
          solveNodes: typeof diagnostics.solveNodes === "number" ? diagnostics.solveNodes : undefined,
          reason: typeof diagnostics.reason === "string" ? diagnostics.reason : undefined,
        });
      } catch (error) {
        samples.push({
          key: `generation:${index}`,
          accepted: false,
          reason: error instanceof Error ? error.message : "Generation failed",
        });
      }
    }
    const accepted = samples.filter((sample) => sample.accepted).length;
    const difficulty = samples.flatMap((sample) => sample.difficulty === undefined ? [] : [sample.difficulty]);
    const nodes = samples.flatMap((sample) => sample.solveNodes === undefined ? [] : [sample.solveNodes]);
    return {
      requested: request.count,
      generated: samples.length,
      accepted,
      rejected: samples.length - accepted,
      acceptanceRate: samples.length === 0 ? 0 : accepted / samples.length,
      averageDifficulty: difficulty.length === 0 ? 0 : difficulty.reduce((sum, value) => sum + value, 0) / difficulty.length,
      averageSolveNodes: nodes.length === 0 ? 0 : nodes.reduce((sum, value) => sum + value, 0) / nodes.length,
      samples,
    };
  }

  public prepareForReview(project: StudioProject, now: number): StudioTransition {
    assertProject(project);
    let pack = project.snapshot.pack;
    const events: StudioEvent[] = [];
    for (const resource of pack.resources) {
      if (resource.status === "draft") {
        const result = this.platform.changeResourceStatus(pack, resource.kind, resource.id, "review");
        pack = result.pack;
        events.push(...result.events);
      }
    }
    const next = changed(project, { pack, selection: project.snapshot.selection }, now);
    return { project: next, events: [...events, { type: "pack-prepared", packId: pack.id }] };
  }

  public publish(project: StudioProject, now: number): StudioTransition {
    assertProject(project);
    const validation = this.validate(project);
    if (!validation.publishable) throw new Error("Studio project is not publishable");
    const result = this.platform.publish(project.snapshot.pack);
    const next = changed(project, { pack: result.pack, selection: project.snapshot.selection }, now);
    return { project: { ...next, savedRevision: next.revision }, events: result.events };
  }

  public exportProject(project: StudioProject): string {
    assertProject(project);
    return canonical(project);
  }

  public importProject(serialized: string): StudioImportResult {
    let project: StudioProject;
    try {
      project = JSON.parse(serialized) as StudioProject;
    } catch {
      throw new Error("Invalid Studio project JSON");
    }
    assertProject(project);
    const normalized = JSON.parse(canonical(project)) as StudioProject;
    return { project: normalized, validation: this.validate(normalized) };
  }

  private assertGenerationRequest(request: StudioGenerationRequest): void {
    if (!Number.isSafeInteger(request.count) || request.count < 1 || request.count > 1000) {
      throw new Error("Generation count must be between 1 and 1000");
    }
    if (!Number.isSafeInteger(request.seed)) throw new Error("Generation seed must be an integer");
  }
}
