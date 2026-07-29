"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOTION_PREFERENCES_STORAGE_KEY = void 0;
exports.serializeMotionPreferences = serializeMotionPreferences;
exports.parseMotionPreferences = parseMotionPreferences;
exports.loadMotionPreferences = loadMotionPreferences;
exports.saveMotionPreferences = saveMotionPreferences;
exports.clearMotionPreferences = clearMotionPreferences;
const preferences_1 = require("./preferences");
exports.MOTION_PREFERENCES_STORAGE_KEY = "crossmath:motion-preferences:v1";
function serializeMotionPreferences(preferences) {
    const valid = (0, preferences_1.validateMotionPreferences)(preferences);
    return JSON.stringify({
        schemaVersion: valid.schemaVersion,
        motion: valid.motion,
        speed: valid.speed,
        animationsEnabled: valid.animationsEnabled,
    });
}
function parseMotionPreferences(serialized) {
    let value;
    try {
        value = JSON.parse(serialized);
    }
    catch {
        throw new Error("Motion preferences are not valid JSON.");
    }
    if (typeof value !== "object" || value === null)
        throw new Error("Motion preferences must be an object.");
    return (0, preferences_1.validateMotionPreferences)(value);
}
async function loadMotionPreferences(storage) {
    const value = await storage.getItem(exports.MOTION_PREFERENCES_STORAGE_KEY);
    return value === null ? preferences_1.DEFAULT_MOTION_PREFERENCES : parseMotionPreferences(value);
}
async function saveMotionPreferences(storage, preferences) {
    await storage.setItem(exports.MOTION_PREFERENCES_STORAGE_KEY, serializeMotionPreferences(preferences));
}
async function clearMotionPreferences(storage) {
    await storage.removeItem(exports.MOTION_PREFERENCES_STORAGE_KEY);
}
