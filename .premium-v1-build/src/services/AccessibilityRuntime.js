"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ACCESSIBILITY_PREFERENCES = void 0;
exports.normalizeAccessibilityPreferences = normalizeAccessibilityPreferences;
exports.motionLevel = motionLevel;
exports.numberCellAccessibilityLabel = numberCellAccessibilityLabel;
exports.DEFAULT_ACCESSIBILITY_PREFERENCES = {
    textScale: 1,
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
};
function normalizeAccessibilityPreferences(value) {
    const textScale = value.textScale ?? 1;
    if (!Number.isFinite(textScale) || textScale < 0.8 || textScale > 2) {
        throw new Error("Text scale must be between 0.8 and 2.");
    }
    return {
        textScale,
        highContrast: value.highContrast ?? false,
        reducedMotion: value.reducedMotion ?? false,
        screenReaderOptimized: value.screenReaderOptimized ?? false,
    };
}
function motionLevel(preferences) {
    if (preferences.screenReaderOptimized)
        return "none";
    return preferences.reducedMotion ? "subtle" : "full";
}
function numberCellAccessibilityLabel(value, row, column, shared) {
    const state = value === null ? "empty" : `value ${value}`;
    return `Number cell, row ${row + 1}, column ${column + 1}, ${state}${shared ? ", shared by multiple equations" : ""}.`;
}
