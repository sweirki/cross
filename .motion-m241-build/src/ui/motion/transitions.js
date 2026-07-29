"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionTransition = motionTransition;
const animations_1 = require("./animations");
function motionTransition(name, preferences) {
    const animationName = name === "overlay" ? "fade" :
        name === "board-change" ? "fade" : "slide";
    return Object.freeze({ name, animation: (0, animations_1.motionAnimation)(animationName, preferences) });
}
