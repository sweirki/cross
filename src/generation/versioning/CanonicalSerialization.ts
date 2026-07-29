function canonicalize(value: unknown, seen: Set<object>): unknown {
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

    const record = value as Readonly<Record<string, unknown>>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry === undefined) {
        throw new Error(`Generation contracts cannot contain undefined at key "${key}".`);
      }
      result[key] = canonicalize(entry, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value, new Set<object>()));
}

export function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalSerialize(value)) as T;
}
