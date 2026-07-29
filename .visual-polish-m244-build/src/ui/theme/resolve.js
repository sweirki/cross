"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveThemeMode = resolveThemeMode;
exports.resolveTheme = resolveTheme;
const palettes_1 = require("./themes/palettes");
function resolveThemeMode(preference, systemDark) {
    return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
function resolveTheme(preferences, systemDark) {
    const mode = resolveThemeMode(preferences.mode, systemDark);
    const colors = preferences.contrast === "high"
        ? (mode === "dark" ? palettes_1.highContrastDarkColors : palettes_1.highContrastLightColors)
        : (mode === "dark" ? palettes_1.darkColors : palettes_1.lightColors);
    return Object.freeze({ mode, contrast: preferences.contrast, colors });
}
