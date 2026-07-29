"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualHighContrastPalette = exports.visualDarkPalette = exports.visualLightPalette = void 0;
exports.resolveVisualPalette = resolveVisualPalette;
exports.visualLightPalette = Object.freeze({
    canvas: "#F5F7F6",
    board: "#FFFFFF",
    boardBorder: "#E3E9E6",
    tileNumber: "#DDF3EA",
    tileOperator: "#FBF4D9",
    tileResult: "#D7EFE8",
    tileEmpty: "#FFF9E8",
    tileGiven: "#CBEBDD",
    tileSelected: "#D8ECFA",
    tileCorrect: "#D7F0E2",
    tileIncorrect: "#FBE1DF",
    textStrong: "#17372F",
    textMuted: "#687A74",
    accent: "#2B7E83",
    accentSoft: "#DDEEEF",
    tray: "#FFFFFF",
    hud: "#FFFFFF",
    shadow: "rgba(20, 52, 44, 0.14)",
});
exports.visualDarkPalette = Object.freeze({
    canvas: "#111714",
    board: "#18211D",
    boardBorder: "#314039",
    tileNumber: "#24483D",
    tileOperator: "#4B432A",
    tileResult: "#285044",
    tileEmpty: "#3E3927",
    tileGiven: "#2D5B4D",
    tileSelected: "#264C63",
    tileCorrect: "#285B45",
    tileIncorrect: "#643D3B",
    textStrong: "#F3FAF7",
    textMuted: "#A9BAB3",
    accent: "#78CDD0",
    accentSoft: "#213C3D",
    tray: "#18211D",
    hud: "#18211D",
    shadow: "rgba(0, 0, 0, 0.45)",
});
exports.visualHighContrastPalette = Object.freeze({
    canvas: "#FFFFFF",
    board: "#FFFFFF",
    boardBorder: "#000000",
    tileNumber: "#FFFFFF",
    tileOperator: "#FFF2A8",
    tileResult: "#C7F5DF",
    tileEmpty: "#FFFFFF",
    tileGiven: "#B7F0D4",
    tileSelected: "#B7DEFF",
    tileCorrect: "#C7F5DF",
    tileIncorrect: "#FFD0CC",
    textStrong: "#000000",
    textMuted: "#222222",
    accent: "#005B66",
    accentSoft: "#D7F4F7",
    tray: "#FFFFFF",
    hud: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.28)",
});
function resolveVisualPalette(mode, highContrast) {
    if (highContrast)
        return exports.visualHighContrastPalette;
    return mode === "dark" ? exports.visualDarkPalette : exports.visualLightPalette;
}
