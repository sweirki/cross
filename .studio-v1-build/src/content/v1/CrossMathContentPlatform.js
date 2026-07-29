"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossMathContentPlatform = void 0;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
function canonical(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(",")}]`;
    const object = value;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
function hash(value) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let index = 0; index < value.length; index += 1) {
        h1 ^= value.charCodeAt(index);
        h1 = Math.imul(h1, h2) >>> 0;
    }
    return `fnv1a32:${h1.toString(16).padStart(8, "0")}`;
}
function withoutIntegrity(pack) {
    const { integrity: _ignored, ...rest } = pack;
    return rest;
}
function resourceKey(resource) {
    return `${resource.kind}:${resource.id}@${resource.version}`;
}
function compareSemver(left, right) {
    const parse = (value) => {
        const match = SEMVER.exec(value);
        if (!match)
            throw new Error(`Invalid semantic version: ${value}`);
        return [Number(match[1]), Number(match[2]), Number(match[3])];
    };
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index])
            return a[index] - b[index];
    }
    return 0;
}
function cloneResource(resource) {
    return JSON.parse(canonical(resource));
}
class CrossMathContentPlatform {
    migrations;
    constructor(migrations = []) {
        const keys = new Set();
        for (const migration of migrations) {
            if (migration.toSchemaVersion !== migration.fromSchemaVersion + 1) {
                throw new Error("Migrations must advance exactly one schema version");
            }
            const key = `${migration.kind}:${migration.fromSchemaVersion}`;
            if (keys.has(key))
                throw new Error(`Duplicate migration: ${key}`);
            keys.add(key);
        }
        this.migrations = [...migrations];
    }
    validatePack(pack) {
        const issues = [];
        const error = (code, path, message) => {
            issues.push({ code, severity: "error", path, message });
        };
        const warning = (code, path, message) => {
            issues.push({ code, severity: "warning", path, message });
        };
        if (pack.schemaVersion !== 1)
            error("pack.schema", "schemaVersion", "Pack schemaVersion must be 1");
        if (!ID.test(pack.id))
            error("pack.id", "id", "Pack id must use lowercase URL-safe characters");
        if (!SEMVER.test(pack.version))
            error("pack.version", "version", "Pack version must be semantic versioning");
        if (!pack.title.trim())
            error("pack.title", "title", "Pack title is required");
        if (!SEMVER.test(pack.minimumEngineVersion))
            error("pack.engine-version", "minimumEngineVersion", "Minimum engine version must be semantic versioning");
        if (!Number.isSafeInteger(pack.createdAt) || pack.createdAt < 0)
            error("pack.created-at", "createdAt", "createdAt must be a non-negative integer");
        if (!Array.isArray(pack.resources) || pack.resources.length === 0)
            error("pack.resources", "resources", "Pack must contain at least one resource");
        const exact = new Map();
        const byIdentity = new Map();
        pack.resources.forEach((resource, index) => {
            const path = `resources[${index}]`;
            if (!Number.isSafeInteger(resource.schemaVersion) || resource.schemaVersion < 1)
                error("resource.schema", `${path}.schemaVersion`, "Resource schemaVersion must be a positive integer");
            if (!ID.test(resource.id))
                error("resource.id", `${path}.id`, "Resource id must use lowercase URL-safe characters");
            if (!SEMVER.test(resource.version))
                error("resource.version", `${path}.version`, "Resource version must use semantic versioning");
            if (!resource.title.trim())
                error("resource.title", `${path}.title`, "Resource title is required");
            if (!Array.isArray(resource.tags))
                error("resource.tags", `${path}.tags`, "Resource tags must be an array");
            else {
                const normalized = resource.tags.map((tag) => tag.trim().toLowerCase());
                if (normalized.some((tag) => !tag))
                    error("resource.tag-empty", `${path}.tags`, "Tags cannot be empty");
                if (new Set(normalized).size !== normalized.length)
                    error("resource.tag-duplicate", `${path}.tags`, "Tags must be unique");
            }
            if (!Array.isArray(resource.dependencies))
                error("resource.dependencies", `${path}.dependencies`, "Dependencies must be an array");
            const key = resourceKey(resource);
            if (exact.has(key))
                error("resource.duplicate", path, `Duplicate resource ${key}`);
            exact.set(key, resource);
            const identity = `${resource.kind}:${resource.id}`;
            byIdentity.set(identity, [...(byIdentity.get(identity) ?? []), resource]);
        });
        pack.resources.forEach((resource, index) => {
            resource.dependencies.forEach((dependency, dependencyIndex) => {
                const path = `resources[${index}].dependencies[${dependencyIndex}]`;
                const candidates = byIdentity.get(`${dependency.kind}:${dependency.id}`) ?? [];
                const matched = dependency.version
                    ? candidates.some((candidate) => candidate.version === dependency.version)
                    : candidates.length > 0;
                if (!matched && !dependency.optional)
                    error("dependency.missing", path, `Required dependency ${dependency.kind}:${dependency.id}${dependency.version ? `@${dependency.version}` : ""} is missing`);
                if (!matched && dependency.optional)
                    warning("dependency.optional-missing", path, `Optional dependency ${dependency.kind}:${dependency.id} is missing`);
                if (dependency.kind === resource.kind && dependency.id === resource.id && (!dependency.version || dependency.version === resource.version)) {
                    error("dependency.self", path, "A resource cannot depend on itself");
                }
            });
        });
        const published = pack.resources.filter((resource) => resource.status === "published");
        for (const resource of published) {
            for (const dependency of resource.dependencies) {
                if (dependency.optional)
                    continue;
                const candidates = byIdentity.get(`${dependency.kind}:${dependency.id}`) ?? [];
                const match = candidates.find((candidate) => !dependency.version || candidate.version === dependency.version);
                if (match && match.status !== "published") {
                    error("dependency.unpublished", resourceKey(resource), `Published resource depends on non-published ${resourceKey(match)}`);
                }
            }
        }
        if (pack.integrity && !this.verifyIntegrity(pack))
            error("pack.integrity", "integrity", "Pack integrity check failed");
        return { valid: !issues.some((issue) => issue.severity === "error"), issues };
    }
    verifyIntegrity(pack) {
        return typeof pack.integrity === "string" && pack.integrity === hash(canonical(withoutIntegrity(pack)));
    }
    seal(pack) {
        const unsealed = withoutIntegrity(pack);
        return { ...unsealed, integrity: hash(canonical(unsealed)) };
    }
    changeResourceStatus(pack, kind, id, status) {
        const matches = pack.resources.filter((resource) => resource.kind === kind && resource.id === id);
        if (matches.length === 0)
            throw new Error(`Unknown resource ${kind}:${id}`);
        const events = [];
        const resources = pack.resources.map((resource) => {
            if (resource.kind !== kind || resource.id !== id || resource.status === status)
                return resource;
            const allowed = {
                draft: ["review"],
                review: ["draft", "published"],
                published: ["archived"],
                archived: [],
            };
            if (!allowed[resource.status].includes(status))
                throw new Error(`Invalid status transition ${resource.status} -> ${status}`);
            events.push({ type: "resource-status-changed", resourceKey: resourceKey(resource), from: resource.status, to: status });
            return { ...resource, status };
        });
        return { pack: this.seal({ ...withoutIntegrity(pack), resources }), events };
    }
    publish(pack) {
        const validation = this.validatePack(pack);
        const blocking = validation.issues.filter((issue) => issue.severity === "error" && issue.code !== "pack.integrity");
        if (blocking.length > 0)
            throw new Error(`Cannot publish invalid pack: ${blocking[0].message}`);
        if (pack.resources.some((resource) => resource.status !== "review" && resource.status !== "published")) {
            throw new Error("All resources must be in review or already published");
        }
        const events = [];
        const resources = pack.resources.map((resource) => {
            if (resource.status === "published")
                return resource;
            events.push({ type: "resource-status-changed", resourceKey: resourceKey(resource), from: "review", to: "published" });
            return { ...resource, status: "published" };
        });
        events.push({ type: "pack-published", packId: pack.id, version: pack.version });
        return { pack: this.seal({ ...withoutIntegrity(pack), resources }), events };
    }
    migrateResource(packId, resource, targetSchemaVersion) {
        if (!Number.isSafeInteger(targetSchemaVersion) || targetSchemaVersion < resource.schemaVersion) {
            throw new Error("Target schema version cannot be lower than the current version");
        }
        let current = cloneResource(resource);
        const events = [];
        while (current.schemaVersion < targetSchemaVersion) {
            const migration = this.migrations.find((candidate) => candidate.kind === current.kind && candidate.fromSchemaVersion === current.schemaVersion);
            if (!migration)
                throw new Error(`Missing migration for ${current.kind} schema ${current.schemaVersion}`);
            const from = current.schemaVersion;
            current = {
                ...current,
                schemaVersion: migration.toSchemaVersion,
                payload: migration.migrate(current.payload, { packId, resourceKind: current.kind, resourceId: current.id }),
            };
            events.push({ type: "resource-migrated", resourceKey: resourceKey(current), fromSchemaVersion: from, toSchemaVersion: current.schemaVersion });
        }
        return { resource: current, events };
    }
    buildCatalog(packs) {
        const entries = [];
        const keys = new Set();
        for (const pack of packs) {
            const validation = this.validatePack(pack);
            if (!validation.valid)
                throw new Error(`Cannot catalog invalid pack ${pack.id}`);
            for (const resource of pack.resources) {
                const key = `${pack.id}@${pack.version}/${resourceKey(resource)}`;
                if (keys.has(key))
                    throw new Error(`Duplicate catalog key ${key}`);
                keys.add(key);
                entries.push({
                    key,
                    packId: pack.id,
                    packVersion: pack.version,
                    kind: resource.kind,
                    id: resource.id,
                    version: resource.version,
                    status: resource.status,
                    title: resource.title,
                    tags: [...resource.tags].sort(),
                });
            }
        }
        entries.sort((a, b) => a.key.localeCompare(b.key));
        return { schemaVersion: 1, entries };
    }
    query(catalog, query) {
        const text = query.text?.trim().toLowerCase();
        return catalog.entries.filter((entry) => {
            if (query.packId && entry.packId !== query.packId)
                return false;
            if (query.kinds && !query.kinds.includes(entry.kind))
                return false;
            if (query.statuses && !query.statuses.includes(entry.status))
                return false;
            if (query.tags && !query.tags.every((tag) => entry.tags.includes(tag)))
                return false;
            if (text && !`${entry.title} ${entry.id} ${entry.tags.join(" ")}`.toLowerCase().includes(text))
                return false;
            return true;
        });
    }
    checkCompatibility(pack, engineVersion) {
        const issues = [];
        if (!SEMVER.test(engineVersion)) {
            issues.push({ code: "engine.version", severity: "error", path: "engineVersion", message: "Engine version must use semantic versioning" });
        }
        else if (SEMVER.test(pack.minimumEngineVersion) && compareSemver(engineVersion, pack.minimumEngineVersion) < 0) {
            issues.push({ code: "engine.too-old", severity: "error", path: "minimumEngineVersion", message: `Requires engine ${pack.minimumEngineVersion} or newer` });
        }
        return { compatible: issues.length === 0, issues };
    }
    serializePack(pack) {
        const validation = this.validatePack(pack);
        if (!validation.valid)
            throw new Error(`Cannot serialize invalid pack: ${validation.issues[0]?.message ?? "unknown error"}`);
        return canonical(pack);
    }
    restorePack(serialized) {
        let value;
        try {
            value = JSON.parse(serialized);
        }
        catch {
            throw new Error("Invalid content pack JSON");
        }
        if (!value || typeof value !== "object")
            throw new Error("Content pack must be an object");
        const pack = value;
        const validation = this.validatePack(pack);
        if (!validation.valid)
            throw new Error(`Invalid content pack: ${validation.issues[0]?.message ?? "unknown error"}`);
        return JSON.parse(canonical(pack));
    }
}
exports.CrossMathContentPlatform = CrossMathContentPlatform;
