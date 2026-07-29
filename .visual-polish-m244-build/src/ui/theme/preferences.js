"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_THEME_PREFERENCES = void 0;
exports.parseThemePreferences = parseThemePreferences;
exports.updateThemePreferences = updateThemePreferences;
const types_1 = require("./types");
exports.DEFAULT_THEME_PREFERENCES = Object.freeze({
    schemaVersion: types_1.THEME_PREFERENCES_SCHEMA_VERSION, mode: "system", contrast: "standard", responsiveType: true,
});
const modes = new Set(["system", "light", "dark"]);
const contrasts = new Set(["standard", "high"]);
function parseThemePreferences(value) {
    if (!value || typeof value !== "object")
        return exports.DEFAULT_THEME_PREFERENCES;
    const candidate = value;
    return Object.freeze({
        schemaVersion: types_1.THEME_PREFERENCES_SCHEMA_VERSION,
        mode: modes.has(candidate.mode) ? candidate.mode : "system",
        contrast: contrasts.has(candidate.contrast) ? candidate.contrast : "standard",
        responsiveType: typeof candidate.responsiveType === "boolean" ? candidate.responsiveType : true,
    });
}
function updateThemePreferences(current, patch) {
    return parseThemePreferences({ ...current, ...patch });
}
