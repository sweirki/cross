import {
  fitBoardCellSize,
  resolveBoardLayout,
  resolveTileVisual,
  resolveVisualBreakpoint,
  resolveVisualPalette,
  visualDarkPalette,
  visualHighContrastPalette,
  visualLightPalette,
  visualMotion,
} from "../../src/ui/visual-refresh";

let passed = 0;
function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
  passed += 1;
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, received ${String(actual)}`);
}
function throws(fn: () => unknown, message: string): void {
  let didThrow = false;
  try { fn(); } catch { didThrow = true; }
  assert(didThrow, message);
}

equal(resolveVisualBreakpoint(320), "phone", "small phone breakpoint");
equal(resolveVisualBreakpoint(599), "phone", "phone upper boundary");
equal(resolveVisualBreakpoint(600), "tablet", "tablet lower boundary");
equal(resolveVisualBreakpoint(999), "tablet", "tablet upper boundary");
equal(resolveVisualBreakpoint(1000), "wide", "wide lower boundary");
throws(() => resolveVisualBreakpoint(0), "zero width rejected");
throws(() => resolveVisualBreakpoint(Number.NaN), "NaN width rejected");

const phone = resolveBoardLayout(390);
const tablet = resolveBoardLayout(768);
const wide = resolveBoardLayout(1200);
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

const fittedPhone = fitBoardCellSize(390, 844, 9, 9);
const fittedTablet = fitBoardCellSize(768, 1024, 9, 9);
assert(fittedPhone >= phone.minCellSize, "phone fit respects minimum");
assert(fittedPhone <= phone.maxCellSize, "phone fit respects maximum");
assert(fittedTablet >= tablet.minCellSize, "tablet fit respects minimum");
assert(fittedTablet <= tablet.maxCellSize, "tablet fit respects maximum");
throws(() => fitBoardCellSize(390, 844, 0, 9), "zero columns rejected");
throws(() => fitBoardCellSize(390, 844, 9, -1), "negative rows rejected");
throws(() => fitBoardCellSize(390, 0, 9, 9), "zero height rejected");

equal(resolveVisualPalette("light", false), visualLightPalette, "light palette");
equal(resolveVisualPalette("dark", false), visualDarkPalette, "dark palette");
equal(resolveVisualPalette("light", true), visualHighContrastPalette, "high contrast light");
equal(resolveVisualPalette("dark", true), visualHighContrastPalette, "high contrast dark");
assert(visualLightPalette.tileNumber !== visualLightPalette.tileOperator, "number and operator differentiated");
assert(visualLightPalette.tileResult !== visualLightPalette.tileOperator, "result and operator differentiated");
assert(visualDarkPalette.canvas !== visualLightPalette.canvas, "dark canvas differs");
equal(visualHighContrastPalette.textStrong, "#000000", "high contrast text black");
equal(visualHighContrastPalette.boardBorder, "#000000", "high contrast border black");

const idle = resolveTileVisual(visualLightPalette, "number", "idle");
const operator = resolveTileVisual(visualLightPalette, "operator", "idle");
const result = resolveTileVisual(visualLightPalette, "result", "idle");
const selected = resolveTileVisual(visualLightPalette, "number", "selected");
const given = resolveTileVisual(visualLightPalette, "number", "given");
const empty = resolveTileVisual(visualLightPalette, "number", "empty");
const correct = resolveTileVisual(visualLightPalette, "number", "correct");
const incorrect = resolveTileVisual(visualLightPalette, "number", "incorrect");
const used = resolveTileVisual(visualLightPalette, "number", "used");

equal(idle.backgroundColor, visualLightPalette.tileNumber, "idle number color");
equal(operator.backgroundColor, visualLightPalette.tileOperator, "operator color");
equal(result.backgroundColor, visualLightPalette.tileResult, "result color");
equal(selected.backgroundColor, visualLightPalette.tileSelected, "selected color");
equal(selected.borderColor, visualLightPalette.accent, "selected accent border");
equal(selected.borderWidth, 2, "selected border width");
assert(selected.scale > 1, "selected tile lifts");
assert(selected.elevation > idle.elevation, "selected tile elevation increases");
equal(given.backgroundColor, visualLightPalette.tileGiven, "given color");
equal(empty.backgroundColor, visualLightPalette.tileEmpty, "empty color");
equal(correct.backgroundColor, visualLightPalette.tileCorrect, "correct color");
equal(incorrect.backgroundColor, visualLightPalette.tileIncorrect, "incorrect color");
equal(incorrect.borderWidth, 2, "incorrect state emphasized");
equal(used.opacity, 0.18, "used tile fades");
equal(used.elevation, 0, "used tile loses elevation");

assert(visualMotion.pressScale < 1, "press motion compresses");
assert(visualMotion.selectionScale > 1, "selection motion lifts");
assert(visualMotion.snapDurationMs > 0, "snap duration positive");
assert(visualMotion.solvedPulseDurationMs > visualMotion.snapDurationMs, "solved pulse is deliberate");
assert(visualMotion.scoreDurationMs > 0, "score motion duration positive");

assert(Object.isFrozen(visualLightPalette), "light palette immutable");
assert(Object.isFrozen(visualDarkPalette), "dark palette immutable");
assert(Object.isFrozen(phone), "layout immutable");
assert(Object.isFrozen(selected), "tile recipe immutable");
assert(Object.isFrozen(visualMotion), "motion tokens immutable");

console.log(`${passed}/${passed} visual-refresh assertions passed.`);
