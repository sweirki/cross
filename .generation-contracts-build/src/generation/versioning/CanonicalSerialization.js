"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalSerialize = canonicalSerialize;
exports.canonicalClone = canonicalClone;
function canonicalize(value, seen) {
    if (value === null || typeof value !== "object") {
        if (typeof value === "number" && !Number.isFinite(value)) {
            throw new Error("Generation contracts cannot contain non-finite numbers.");
        }
        if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
            throw new Error(`Generation contracts cannot contain ${typeof value} values.`);
        }
        return value;
    }
    if (seen.has(value)) {
        throw new Error("Generation contracts cannot contain circular references.");
    }
    seen.add(value);
    try {
        if (Array.isArray(value)) {
            return value.map((entry) => canonicalize(entry, seen));
        }
        const record = value;
        const result = {};
        for (const key of Object.keys(record).sort()) {
            const entry = record[key];
            if (entry === undefined) {
                throw new Error(`Generation contracts cannot contain undefined at key "${key}".`);
            }
            result[key] = canonicalize(entry, seen);
        }
        return result;
    }
    finally {
        seen.delete(value);
    }
}
function canonicalSerialize(value) {
    return JSON.stringify(canonicalize(value, new Set()));
}
function canonicalClone(value) {
    return JSON.parse(canonicalSerialize(value));
}
