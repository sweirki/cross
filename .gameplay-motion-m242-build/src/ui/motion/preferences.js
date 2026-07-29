"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MOTION_PREFERENCES = void 0;
exports.validateMotionPreferences = validateMotionPreferences;
exports.resolveMotionPreferences = resolveMotionPreferences;
exports.updateMotionPreferences = updateMotionPreferences;
exports.DEFAULT_MOTION_PREFERENCES = Object.freeze({
    schemaVersion: 1,
    motion: "system",
    speed: "standard",
    animationsEnabled: true,
});
const MOTION_VALUES = new Set(["system", "reduce", "full"]);
const SPEED_VALUES = new Set(["slow", "standard", "fast"]);
function validateMotionPreferences(value) {
    if (value.schemaVersion !== 1)
        throw new Error("Unsupported motion preferences schema.");
    if (!MOTION_VALUES.has(value.motion))
        throw new Error("Invalid motion preference.");
    if (!SPEED_VALUES.has(value.speed))
        throw new Error("Invalid motion speed.");
    if (typeof value.animationsEnabled !== "boolean")
        throw new Error("Invalid animation preference.");
    return Object.freeze({ ...value });
}
function resolveMotionPreferences(preferences, systemReduceMotion) {
    validateMotionPreferences(preferences);
    const reduced = preferences.motion === "reduce" ||
        (preferences.motion === "system" && systemReduceMotion);
    const durationScale = preferences.speed === "slow" ? 1.25 :
        preferences.speed === "fast" ? 0.75 : 1;
    return Object.freeze({
        level: !preferences.animationsEnabled ? "none" : reduced ? "reduced" : "full",
        durationScale,
        animationsEnabled: preferences.animationsEnabled,
        systemReduceMotion,
    });
}
function updateMotionPreferences(current, patch) {
    return validateMotionPreferences({ ...current, ...patch, schemaVersion: 1 });
}
