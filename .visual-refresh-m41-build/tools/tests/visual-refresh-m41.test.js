"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const visual_refresh_1 = require("../../src/ui/visual-refresh");
let passed = 0;
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
    passed += 1;
}
function equal(actual, expected, message) {
    assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, received ${String(actual)}`);
}
function throws(fn, message) {
    let didThrow = false;
    try {
        fn();
    }
    catch {
        didThrow = true;
    }
    assert(didThrow, message);
}
equal((0, visual_refresh_1.resolveVisualBreakpoint)(320), "phone", "small phone breakpoint");
equal((0, visual_refresh_1.resolveVisualBreakpoint)(599), "phone", "phone upper boundary");
equal((0, visual_refresh_1.resolveVisualBreakpoint)(600), "tablet", "tablet lower boundary");
equal((0, visual_refresh_1.resolveVisualBreakpoint)(999), "tablet", "tablet upper boundary");
equal((0, visual_refresh_1.resolveVisualBreakpoint)(1000), "wide", "wide lower boundary");
throws(() => (0, visual_refresh_1.resolveVisualBreakpoint)(0), "zero width rejected");
throws(() => (0, visual_refresh_1.resolveVisualBreakpoint)(Number.NaN), "NaN width rejected");
const phone = (0, visual_refresh_1.resolveBoardLayout)(390);
const tablet = (0, visual_refresh_1.resolveBoardLayout)(768);
const wide = (0, visual_refresh_1.resolveBoardLayout)(1200);
equal(phone.breakpoint, "phone", "phone layout");
equal(tablet.breakpoint, "tablet", "tablet layout");
equal(wide.breakpoint, "wide", "wide layout");
assert(phone.pagePadding < tablet.pagePadding, "tablet page padding increases");
assert(tablet.pagePadding < wide.pagePadding, "wide page padding increases");
assert(phone.maxCellSize < tablet.maxCellSize, "tablet cells can grow");
assert(tablet.maxCellSize < wide.maxCellSize, "wide cells can grow");
equal(phone.hudCompact, true, "phone HUD compact");
equal(tablet.hudCompact, false, "tablet HUD expanded");
assert(phone.boardRadius >= 16, "board radius is soft");
assert(phone.trayTileHeight >= 42, "tray touch target is large");
const fittedPhone = (0, visual_refresh_1.fitBoardCellSize)(390, 844, 9, 9);
const fittedTablet = (0, visual_refresh_1.fitBoardCellSize)(768, 1024, 9, 9);
assert(fittedPhone >= phone.minCellSize, "phone fit respects minimum");
assert(fittedPhone <= phone.maxCellSize, "phone fit respects maximum");
assert(fittedTablet >= tablet.minCellSize, "tablet fit respects minimum");
assert(fittedTablet <= tablet.maxCellSize, "tablet fit respects maximum");
throws(() => (0, visual_refresh_1.fitBoardCellSize)(390, 844, 0, 9), "zero columns rejected");
throws(() => (0, visual_refresh_1.fitBoardCellSize)(390, 844, 9, -1), "negative rows rejected");
throws(() => (0, visual_refresh_1.fitBoardCellSize)(390, 0, 9, 9), "zero height rejected");
equal((0, visual_refresh_1.resolveVisualPalette)("light", false), visual_refresh_1.visualLightPalette, "light palette");
equal((0, visual_refresh_1.resolveVisualPalette)("dark", false), visual_refresh_1.visualDarkPalette, "dark palette");
equal((0, visual_refresh_1.resolveVisualPalette)("light", true), visual_refresh_1.visualHighContrastPalette, "high contrast light");
equal((0, visual_refresh_1.resolveVisualPalette)("dark", true), visual_refresh_1.visualHighContrastPalette, "high contrast dark");
assert(visual_refresh_1.visualLightPalette.tileNumber !== visual_refresh_1.visualLightPalette.tileOperator, "number and operator differentiated");
assert(visual_refresh_1.visualLightPalette.tileResult !== visual_refresh_1.visualLightPalette.tileOperator, "result and operator differentiated");
assert(visual_refresh_1.visualDarkPalette.canvas !== visual_refresh_1.visualLightPalette.canvas, "dark canvas differs");
equal(visual_refresh_1.visualHighContrastPalette.textStrong, "#000000", "high contrast text black");
equal(visual_refresh_1.visualHighContrastPalette.boardBorder, "#000000", "high contrast border black");
const idle = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "idle");
const operator = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "operator", "idle");
const result = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "result", "idle");
const selected = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "selected");
const given = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "given");
const empty = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "empty");
const correct = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "correct");
const incorrect = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "incorrect");
const used = (0, visual_refresh_1.resolveTileVisual)(visual_refresh_1.visualLightPalette, "number", "used");
equal(idle.backgroundColor, visual_refresh_1.visualLightPalette.tileNumber, "idle number color");
equal(operator.backgroundColor, visual_refresh_1.visualLightPalette.tileOperator, "operator color");
equal(result.backgroundColor, visual_refresh_1.visualLightPalette.tileResult, "result color");
equal(selected.backgroundColor, visual_refresh_1.visualLightPalette.tileSelected, "selected color");
equal(selected.borderColor, visual_refresh_1.visualLightPalette.accent, "selected accent border");
equal(selected.borderWidth, 2, "selected border width");
assert(selected.scale > 1, "selected tile lifts");
assert(selected.elevation > idle.elevation, "selected tile elevation increases");
equal(given.backgroundColor, visual_refresh_1.visualLightPalette.tileGiven, "given color");
equal(empty.backgroundColor, visual_refresh_1.visualLightPalette.tileEmpty, "empty color");
equal(correct.backgroundColor, visual_refresh_1.visualLightPalette.tileCorrect, "correct color");
equal(incorrect.backgroundColor, visual_refresh_1.visualLightPalette.tileIncorrect, "incorrect color");
equal(incorrect.borderWidth, 2, "incorrect state emphasized");
equal(used.opacity, 0.18, "used tile fades");
equal(used.elevation, 0, "used tile loses elevation");
assert(visual_refresh_1.visualMotion.pressScale < 1, "press motion compresses");
assert(visual_refresh_1.visualMotion.selectionScale > 1, "selection motion lifts");
assert(visual_refresh_1.visualMotion.snapDurationMs > 0, "snap duration positive");
assert(visual_refresh_1.visualMotion.solvedPulseDurationMs > visual_refresh_1.visualMotion.snapDurationMs, "solved pulse is deliberate");
assert(visual_refresh_1.visualMotion.scoreDurationMs > 0, "score motion duration positive");
assert(Object.isFrozen(visual_refresh_1.visualLightPalette), "light palette immutable");
assert(Object.isFrozen(visual_refresh_1.visualDarkPalette), "dark palette immutable");
assert(Object.isFrozen(phone), "layout immutable");
assert(Object.isFrozen(selected), "tile recipe immutable");
assert(Object.isFrozen(visual_refresh_1.visualMotion), "motion tokens immutable");
console.log(`${passed}/${passed} visual-refresh assertions passed.`);
