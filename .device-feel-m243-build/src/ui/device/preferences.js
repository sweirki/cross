"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DEVICE_PREFERENCES = void 0;
exports.parseDevicePreferences = parseDevicePreferences;
exports.updateDevicePreferences = updateDevicePreferences;
const types_1 = require("./types");
exports.DEFAULT_DEVICE_PREFERENCES = Object.freeze({
    schemaVersion: types_1.DEVICE_PREFERENCES_SCHEMA_VERSION,
    hapticsEnabled: true,
    soundEnabled: true,
    screenReaderOptimizations: true,
    announcementVerbosity: "standard",
});
const verbosities = new Set(["minimal", "standard", "detailed"]);
function parseDevicePreferences(value) {
    if (!value || typeof value !== "object")
        return exports.DEFAULT_DEVICE_PREFERENCES;
    const candidate = value;
    return Object.freeze({
        schemaVersion: types_1.DEVICE_PREFERENCES_SCHEMA_VERSION,
        hapticsEnabled: typeof candidate.hapticsEnabled === "boolean" ? candidate.hapticsEnabled : true,
        soundEnabled: typeof candidate.soundEnabled === "boolean" ? candidate.soundEnabled : true,
        screenReaderOptimizations: typeof candidate.screenReaderOptimizations === "boolean"
            ? candidate.screenReaderOptimizations : true,
        announcementVerbosity: verbosities.has(candidate.announcementVerbosity)
            ? candidate.announcementVerbosity : "standard",
    });
}
function updateDevicePreferences(current, patch) {
    return parseDevicePreferences({ ...current, ...patch });
}
