"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME_PREFERENCES_STORAGE_KEY = void 0;
exports.serializeThemePreferences = serializeThemePreferences;
exports.parseSerializedThemePreferences = parseSerializedThemePreferences;
exports.loadThemePreferences = loadThemePreferences;
exports.saveThemePreferences = saveThemePreferences;
const preferences_1 = require("./preferences");
exports.THEME_PREFERENCES_STORAGE_KEY = "crossmath.theme-preferences.v1";
function serializeThemePreferences(value) {
    const valid = (0, preferences_1.parseThemePreferences)(value);
    return JSON.stringify({ schemaVersion: valid.schemaVersion, mode: valid.mode, contrast: valid.contrast, responsiveType: valid.responsiveType });
}
function parseSerializedThemePreferences(raw) {
    try {
        return (0, preferences_1.parseThemePreferences)(JSON.parse(raw));
    }
    catch {
        return preferences_1.DEFAULT_THEME_PREFERENCES;
    }
}
async function loadThemePreferences(storage) {
    try {
        const raw = await storage.getItem(exports.THEME_PREFERENCES_STORAGE_KEY);
        return raw === null ? preferences_1.DEFAULT_THEME_PREFERENCES : parseSerializedThemePreferences(raw);
    }
    catch {
        return preferences_1.DEFAULT_THEME_PREFERENCES;
    }
}
async function saveThemePreferences(storage, value) {
    await storage.setItem(exports.THEME_PREFERENCES_STORAGE_KEY, serializeThemePreferences(value));
}
