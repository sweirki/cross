"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionAnimation = motionAnimation;
const tokens_1 = require("./tokens");
const durations = {
    fade: tokens_1.MOTION_TOKENS.duration.standard,
    slide: tokens_1.MOTION_TOKENS.duration.standard,
    pop: tokens_1.MOTION_TOKENS.duration.fast,
    shake: tokens_1.MOTION_TOKENS.duration.fast,
    glow: tokens_1.MOTION_TOKENS.duration.slow,
    confetti: tokens_1.MOTION_TOKENS.duration.celebration,
};
function allowed(name, level) {
    if (level === "none")
        return false;
    if (level === "full")
        return true;
    return name === "fade" || name === "glow";
}
function motionAnimation(name, preferences) {
    const enabled = allowed(name, preferences.level);
    return Object.freeze({
        name,
        durationMs: enabled ? Math.round(durations[name] * preferences.durationScale) : 0,
        distance: enabled && preferences.level === "full" ? tokens_1.MOTION_TOKENS.distance.standard : 0,
        scale: enabled && preferences.level === "full" ? tokens_1.MOTION_TOKENS.scale.pop : 1,
        enabled,
    });
}
