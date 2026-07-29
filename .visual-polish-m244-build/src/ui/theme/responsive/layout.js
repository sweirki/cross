"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyBreakpoint = classifyBreakpoint;
exports.resolveLayoutMetrics = resolveLayoutMetrics;
function classifyBreakpoint(width) {
    if (!Number.isFinite(width) || width < 0)
        throw new Error("Viewport width must be a non-negative finite number.");
    return width < 600 ? "compact" : width < 1024 ? "medium" : "expanded";
}
function resolveLayoutMetrics(width, fontScale = 1, responsiveType = true) {
    if (!Number.isFinite(fontScale) || fontScale <= 0)
        throw new Error("Font scale must be positive.");
    const breakpoint = classifyBreakpoint(width);
    const typeScale = responsiveType ? Math.min(Math.max(fontScale, 1), 1.5) : 1;
    return Object.freeze({
        breakpoint,
        columns: breakpoint === "compact" ? 1 : breakpoint === "medium" ? 2 : 3,
        gutter: breakpoint === "compact" ? 16 : breakpoint === "medium" ? 24 : 32,
        contentMaxWidth: breakpoint === "compact" ? 560 : breakpoint === "medium" ? 920 : 1200,
        typeScale,
    });
}
