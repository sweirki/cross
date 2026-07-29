import { elevation, opacity, radius, sizing } from "../tokens/foundation";
import { spacing } from "../tokens/spacing";
import type { CrossMathTheme } from "../types";

export function buttonRecipe(theme: CrossMathTheme, variant: "primary" | "secondary" | "danger" = "primary", disabled = false) {
  const backgroundColor = variant === "primary" ? theme.colors.primary : variant === "danger" ? theme.colors.danger : theme.colors.surface;
  const color = variant === "secondary" ? theme.colors.text : theme.colors.onPrimary;
  return Object.freeze({ minHeight: sizing.touchTarget, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor, color,
    borderWidth: variant === "secondary" ? 1 : 0, borderColor: theme.colors.border, opacity: disabled ? opacity.disabled : 1 });
}
export function cardRecipe(theme: CrossMathTheme, raised = false) {
  return Object.freeze({ backgroundColor: raised ? theme.colors.surfaceRaised : theme.colors.surface, borderColor: theme.colors.border,
    borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...(raised ? elevation.medium : elevation.none) });
}
export function focusRingRecipe(theme: CrossMathTheme) {
  return Object.freeze({ borderColor: theme.colors.focus, borderWidth: 3 });
}
