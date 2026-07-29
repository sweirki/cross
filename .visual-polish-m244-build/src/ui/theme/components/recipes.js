"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buttonRecipe = buttonRecipe;
exports.cardRecipe = cardRecipe;
exports.focusRingRecipe = focusRingRecipe;
const foundation_1 = require("../tokens/foundation");
const spacing_1 = require("../tokens/spacing");
function buttonRecipe(theme, variant = "primary", disabled = false) {
    const backgroundColor = variant === "primary" ? theme.colors.primary : variant === "danger" ? theme.colors.danger : theme.colors.surface;
    const color = variant === "secondary" ? theme.colors.text : theme.colors.onPrimary;
    return Object.freeze({ minHeight: foundation_1.sizing.touchTarget, paddingHorizontal: spacing_1.spacing.lg, borderRadius: foundation_1.radius.md, backgroundColor, color,
        borderWidth: variant === "secondary" ? 1 : 0, borderColor: theme.colors.border, opacity: disabled ? foundation_1.opacity.disabled : 1 });
}
function cardRecipe(theme, raised = false) {
    return Object.freeze({ backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.surface, borderColor: theme.colors.border,
        borderWidth: 1, borderRadius: foundation_1.radius.lg, padding: spacing_1.spacing.lg, ...(raised ? foundation_1.elevation.medium : foundation_1.elevation.none) });
}
function focusRingRecipe(theme) {
    return Object.freeze({ borderColor: theme.colors.focus, borderWidth: 3 });
}
