"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossMathStudio = void 0;
const v1_1 = require("../../content/v1");
const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
const MAX_HISTORY = 100;
function canonical(value) {
    if (value === undefined)
        return "null";
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map((item) => item === undefined ? "null" : canonical(item)).join(",")}]`;
    const object = value;
    return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
function clone(value) {
    return JSON.parse(canonical(value));
}
function assertTime(now) {
    if (!Number.isSafeInteger(now) || now < 0)
        throw new Error("Studio time must be a non-negative integer");
}
function key(value) {
    return `${value.kind}:${value.id}@${value.version}`;
}
function find(pack, selection) {
    return pack.resources.find((resource) => resource.kind === selection.kind &&
        resource.id === selection.id &&
        resource.version === selection.version);
}
function assertProject(project) {
    if (project.schemaVersion !== 1)
        throw new Error("Unsupported Studio project schema");
    if (!ID.test(project.projectId))
        throw new Error("Invalid Studio project ID");
    if (!SEMVER.test(project.engineVersion))
        throw new Error("Invalid Studio engine version");
    if (!Number.isSafeInteger(project.revision) || project.revision < 0)
        throw new Error("Invalid Studio revision");
    if (!Number.isSafeInteger(project.savedRevision) || project.savedRevision < 0 || project.savedRevision > project.revision) {
        throw new Error("Invalid Studio saved revision");
    }
    assertTime(project.createdAt);
    assertTime(project.updatedAt);
    if (project.updatedAt < project.createdAt)
        throw new Error("Studio update time precedes creation");
    if (!Array.isArray(project.undo) || !Array.isArray(project.redo))
        throw new Error("Invalid Studio history");
    if (project.snapshot.selection && !find(project.snapshot.pack, project.snapshot.selection)) {
        throw new Error("Studio selection references an unknown resource");
    }
}
function changed(project, snapshot, now) {
    assertTime(now);
    if (now < project.updatedAt)
        throw new Error("Studio time cannot move backwards");
    return {
        ...project,
        revision: project.revision + 1,
        updatedAt: now,
        snapshot: clone(snapshot),
        undo: [...project.undo, clone(project.snapshot)].slice(-MAX_HISTORY),
        redo: [],
    };
}
function resourceSort(a, b) {
    return key(a).localeCompare(key(b));
}
class CrossMathStudio {
    platform;
    constructor(platform = new v1_1.CrossMathContentPlatform()) {
        this.platform = platform;
    }
    createProject(projectId, pack, engineVersion, now) {
        assertTime(now);
        if (!ID.test(projectId))
            throw new Error("Invalid Studio project ID");
        if (!SEMVER.test(engineVersion))
            throw new Error("Invalid Studio engine version");
        const project = {
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
    addResource(project, resource, now) {
        assertProject(project);
        if (find(project.snapshot.pack, resource))
            throw new Error(`Resource already exists: ${key(resource)}`);
        const pack = { ...project.snapshot.pack, integrity: undefined, resources: [...project.snapshot.pack.resources, clone(resource)].sort(resourceSort) };
        return {
            project: changed(project, { pack, selection: { kind: resource.kind, id: resource.id, version: resource.version } }, now),
            events: [{ type: "resource-added", key: key(resource) }],
        };
    }
    updateResource(project, resource, now) {
        assertProject(project);
        if (!find(project.snapshot.pack, resource))
            throw new Error(`Unknown resource: ${key(resource)}`);
        const resources = project.snapshot.pack.resources.map((current) => key(current) === key(resource) ? clone(resource) : current).sort(resourceSort);
        const pack = { ...project.snapshot.pack, integrity: undefined, resources };
        return {
            project: changed(project, { pack, selection: { kind: resource.kind, id: resource.id, version: resource.version } }, now),
            events: [{ type: "resource-updated", key: key(resource) }],
        };
    }
    removeResource(project, kind, id, version, now) {
        assertProject(project);
        const selection = { kind, id, version };
        if (!find(project.snapshot.pack, selection))
            throw new Error(`Unknown resource: ${key(selection)}`);
        for (const resource of project.snapshot.pack.resources) {
            const dependency = resource.dependencies.find((item) => !item.optional && item.kind === kind && item.id === id && (!item.version || item.version === version));
            if (dependency)
                throw new Error(`Resource is required by ${key(resource)}`);
        }
        const resources = project.snapshot.pack.resources.filter((resource) => key(resource) !== key(selection));
        const pack = { ...project.snapshot.pack, integrity: undefined, resources };
        const nextSelection = project.snapshot.selection && key(project.snapshot.selection) === key(selection) ? undefined : project.snapshot.selection;
        return {
            project: changed(project, { pack, selection: nextSelection }, now),
            events: [{ type: "resource-removed", key: key(selection) }],
        };
    }
    duplicateResource(project, source, targetId, targetVersion, now) {
        assertProject(project);
        if (!ID.test(targetId))
            throw new Error("Invalid duplicate resource ID");
        if (!SEMVER.test(targetVersion))
            throw new Error("Invalid duplicate resource version");
        const original = find(project.snapshot.pack, source);
        if (!original)
            throw new Error(`Unknown resource: ${key(source)}`);
        const copy = { ...clone(original), id: targetId, version: targetVersion, status: "draft" };
        if (find(project.snapshot.pack, copy))
            throw new Error(`Resource already exists: ${key(copy)}`);
        const result = this.addResource(project, copy, now);
        return {
            project: result.project,
            events: [{ type: "resource-duplicated", sourceKey: key(source), targetKey: key(copy) }],
        };
    }
    select(project, selection) {
        assertProject(project);
        if (selection && !find(project.snapshot.pack, selection))
            throw new Error(`Unknown resource: ${key(selection)}`);
        const next = { ...project, snapshot: { ...project.snapshot, selection: selection ? clone(selection) : undefined } };
        return { project: next, events: [{ type: "selection-changed", key: selection ? key(selection) : undefined }] };
    }
    undo(project, now) {
        assertProject(project);
        assertTime(now);
        const snapshot = project.undo.at(-1);
        if (!snapshot)
            throw new Error("Nothing to undo");
        const next = {
            ...project,
            revision: project.revision + 1,
            updatedAt: now,
            snapshot: clone(snapshot),
            undo: project.undo.slice(0, -1),
            redo: [clone(project.snapshot), ...project.redo].slice(0, MAX_HISTORY),
        };
        return { project: next, events: [{ type: "project-undone", revision: next.revision }] };
    }
    redo(project, now) {
        assertProject(project);
        assertTime(now);
        const snapshot = project.redo[0];
        if (!snapshot)
            throw new Error("Nothing to redo");
        const next = {
            ...project,
            revision: project.revision + 1,
            updatedAt: now,
            snapshot: clone(snapshot),
            undo: [...project.undo, clone(project.snapshot)].slice(-MAX_HISTORY),
            redo: project.redo.slice(1),
        };
        return { project: next, events: [{ type: "project-redone", revision: next.revision }] };
    }
    markSaved(project) {
        assertProject(project);
        const next = { ...project, savedRevision: project.revision };
        return { project: next, events: [{ type: "project-saved", revision: next.revision }] };
    }
    validate(project) {
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
    buildCatalog(project) {
        assertProject(project);
        return this.platform.buildCatalog([project.snapshot.pack]);
    }
    generate(project, request, generator, now) {
        assertProject(project);
        this.assertGenerationRequest(request);
        const generated = [];
        const keys = new Set(project.snapshot.pack.resources.map(key));
        for (let index = 0; index < request.count; index += 1) {
            const item = generator.generate(request.seed, index);
            if (request.kind && item.resource.kind !== request.kind)
                throw new Error("Generator returned an unexpected content kind");
            if (keys.has(key(item.resource)))
                throw new Error(`Generated duplicate resource: ${key(item.resource)}`);
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
            events: generated.map((resource) => ({ type: "resource-added", key: key(resource) })),
        };
    }
    simulate(request, generator) {
        this.assertGenerationRequest(request);
        const samples = [];
        for (let index = 0; index < request.count; index += 1) {
            try {
                const generated = generator.generate(request.seed, index);
                const diagnostics = generated.diagnostics ?? {};
                const accepted = diagnostics.accepted !== false;
                samples.push({
                    key: key(generated.resource),
                    accepted,
                    difficulty: typeof diagnostics.difficulty === "number" ? diagnostics.difficulty : undefined,
                    solveNodes: typeof diagnostics.solveNodes === "number" ? diagnostics.solveNodes : undefined,
                    reason: typeof diagnostics.reason === "string" ? diagnostics.reason : undefined,
                });
            }
            catch (error) {
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
    prepareForReview(project, now) {
        assertProject(project);
        let pack = project.snapshot.pack;
        const events = [];
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
    publish(project, now) {
        assertProject(project);
        const validation = this.validate(project);
        if (!validation.publishable)
            throw new Error("Studio project is not publishable");
        const result = this.platform.publish(project.snapshot.pack);
        const next = changed(project, { pack: result.pack, selection: project.snapshot.selection }, now);
        return { project: { ...next, savedRevision: next.revision }, events: result.events };
    }
    exportProject(project) {
        assertProject(project);
        return canonical(project);
    }
    importProject(serialized) {
        let project;
        try {
            project = JSON.parse(serialized);
        }
        catch {
            throw new Error("Invalid Studio project JSON");
        }
        assertProject(project);
        const normalized = JSON.parse(canonical(project));
        return { project: normalized, validation: this.validate(normalized) };
    }
    assertGenerationRequest(request) {
        if (!Number.isSafeInteger(request.count) || request.count < 1 || request.count > 1000) {
            throw new Error("Generation count must be between 1 and 1000");
        }
        if (!Number.isSafeInteger(request.seed))
            throw new Error("Generation seed must be an integer");
    }
}
exports.CrossMathStudio = CrossMathStudio;
