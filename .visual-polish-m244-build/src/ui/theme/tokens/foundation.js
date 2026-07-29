"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevation = exports.opacity = exports.sizing = exports.radius = void 0;
exports.radius = Object.freeze({ none: 0, sm: 6, md: 10, lg: 16, pill: 999 });
exports.sizing = Object.freeze({ touchTarget: 44, iconSm: 16, iconMd: 24, iconLg: 32, boardCellMin: 44 });
exports.opacity = Object.freeze({ disabled: 0.45, muted: 0.68, pressed: 0.82, overlay: 0.52 });
exports.elevation = Object.freeze({
    none: Object.freeze({ elevation: 0, shadowOpacity: 0 }),
    low: Object.freeze({ elevation: 2, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: Object.freeze({ width: 0, height: 2 }) }),
    medium: Object.freeze({ elevation: 5, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: Object.freeze({ width: 0, height: 5 }) }),
    high: Object.freeze({ elevation: 10, shadowOpacity: 0.20, shadowRadius: 18, shadowOffset: Object.freeze({ width: 0, height: 9 }) }),
});
