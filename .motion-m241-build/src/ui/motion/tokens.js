"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOTION_TOKENS = void 0;
exports.MOTION_TOKENS = Object.freeze({
    duration: Object.freeze({
        instant: 0,
        fast: 120,
        standard: 220,
        slow: 360,
        celebration: 700,
    }),
    easing: Object.freeze({
        standard: Object.freeze([0.2, 0, 0, 1]),
        emphasized: Object.freeze([0.2, 0, 0, 1.2]),
        exit: Object.freeze([0.4, 0, 1, 1]),
    }),
    distance: Object.freeze({
        subtle: 4,
        standard: 12,
        pronounced: 24,
    }),
    scale: Object.freeze({
        press: 0.97,
        pop: 1.08,
    }),
});
