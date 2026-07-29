const assert = {
  equal(actual: unknown, expected: unknown): void { if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`); },
  notEqual(actual: unknown, expected: unknown): void { if (actual === expected) throw new Error(`Expected values to differ: ${String(actual)}.`); },
  ok(value: unknown): void { if (!value) throw new Error("Expected truthy value."); },
  deepEqual(actual: unknown, expected: unknown): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
  },
  throws(run: () => unknown): void { let threw = false; try { run(); } catch { threw = true; } if (!threw) throw new Error("Expected function to throw."); },
};
import {
  DEFAULT_THEME_PREFERENCES, THEME_PREFERENCES_STORAGE_KEY, buttonRecipe, cardRecipe,
  classifyBreakpoint, focusRingRecipe, loadThemePreferences, parseSerializedThemePreferences,
  parseThemePreferences, resolveLayoutMetrics, resolveTheme, resolveThemeMode,
  saveThemePreferences, serializeThemePreferences, spacing, typography, radius, sizing,
} from "../../src/ui/theme/core";

const cases: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, fn: () => void | Promise<void>) => cases.push([name, fn]);

test("defaults are stable", () => assert.deepEqual(DEFAULT_THEME_PREFERENCES, { schemaVersion: 1, mode: "system", contrast: "standard", responsiveType: true }));
test("invalid preferences fall back", () => assert.deepEqual(parseThemePreferences({ mode: "blue" }), DEFAULT_THEME_PREFERENCES));
test("valid preferences parse", () => assert.equal(parseThemePreferences({ mode: "dark", contrast: "high", responsiveType: false }).mode, "dark"));
test("system light resolves", () => assert.equal(resolveThemeMode("system", false), "light"));
test("system dark resolves", () => assert.equal(resolveThemeMode("system", true), "dark"));
test("explicit light wins", () => assert.equal(resolveThemeMode("light", true), "light"));
test("explicit dark wins", () => assert.equal(resolveThemeMode("dark", false), "dark"));
test("light theme resolves", () => assert.equal(resolveTheme(DEFAULT_THEME_PREFERENCES, false).mode, "light"));
test("dark theme resolves", () => assert.equal(resolveTheme(DEFAULT_THEME_PREFERENCES, true).mode, "dark"));
test("high contrast light uses black text", () => assert.equal(resolveTheme({ ...DEFAULT_THEME_PREFERENCES, contrast: "high" }, false).colors.text, "#000000"));
test("high contrast dark uses white border", () => assert.equal(resolveTheme({ ...DEFAULT_THEME_PREFERENCES, contrast: "high" }, true).colors.border, "#FFFFFF"));
test("semantic primary differs by mode", () => assert.notEqual(resolveTheme(DEFAULT_THEME_PREFERENCES,false).colors.primary, resolveTheme(DEFAULT_THEME_PREFERENCES,true).colors.primary));
test("compact breakpoint lower edge", () => assert.equal(classifyBreakpoint(0), "compact"));
test("compact breakpoint upper edge", () => assert.equal(classifyBreakpoint(599), "compact"));
test("medium breakpoint lower edge", () => assert.equal(classifyBreakpoint(600), "medium"));
test("medium breakpoint upper edge", () => assert.equal(classifyBreakpoint(1023), "medium"));
test("expanded breakpoint", () => assert.equal(classifyBreakpoint(1024), "expanded"));
test("invalid width rejected", () => assert.throws(() => classifyBreakpoint(-1)));
test("NaN width rejected", () => assert.throws(() => classifyBreakpoint(Number.NaN)));
test("compact layout is one column", () => assert.equal(resolveLayoutMetrics(390).columns, 1));
test("medium layout is two columns", () => assert.equal(resolveLayoutMetrics(800).columns, 2));
test("expanded layout is three columns", () => assert.equal(resolveLayoutMetrics(1200).columns, 3));
test("font scale clamps low", () => assert.equal(resolveLayoutMetrics(390, .5).typeScale, 1));
test("font scale clamps high", () => assert.equal(resolveLayoutMetrics(390, 2).typeScale, 1.5));
test("responsive type can be disabled", () => assert.equal(resolveLayoutMetrics(390, 1.4, false).typeScale, 1));
test("invalid font scale rejected", () => assert.throws(() => resolveLayoutMetrics(390, 0)));
test("serialization is deterministic", () => {
  const value = { schemaVersion: 1 as const, mode: "dark" as const, contrast: "high" as const, responsiveType: false };
  assert.equal(serializeThemePreferences(value), serializeThemePreferences(value));
});
test("serialization field order is canonical", () => assert.equal(serializeThemePreferences(DEFAULT_THEME_PREFERENCES), '{"schemaVersion":1,"mode":"system","contrast":"standard","responsiveType":true}'));
test("serialized preferences round trip", () => assert.deepEqual(parseSerializedThemePreferences(serializeThemePreferences(DEFAULT_THEME_PREFERENCES)), DEFAULT_THEME_PREFERENCES));
test("malformed serialization falls back", () => assert.deepEqual(parseSerializedThemePreferences("{"), DEFAULT_THEME_PREFERENCES));
test("missing storage loads defaults", async () => {
  const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };
  assert.deepEqual(await loadThemePreferences(storage), DEFAULT_THEME_PREFERENCES);
});
test("storage failure loads defaults", async () => {
  const storage = { getItem: async () => { throw new Error("fail"); }, setItem: async () => {}, removeItem: async () => {} };
  assert.deepEqual(await loadThemePreferences(storage), DEFAULT_THEME_PREFERENCES);
});
test("preferences save deterministically", async () => {
  let key = ""; let raw = "";
  const storage = { getItem: async () => null, setItem: async (k: string,v: string) => { key=k; raw=v; }, removeItem: async () => {} };
  await saveThemePreferences(storage, DEFAULT_THEME_PREFERENCES);
  assert.equal(key, THEME_PREFERENCES_STORAGE_KEY); assert.equal(raw, serializeThemePreferences(DEFAULT_THEME_PREFERENCES));
});
test("spacing scale is monotonic", () => assert.ok(spacing.xs < spacing.sm && spacing.sm < spacing.md && spacing.md < spacing.lg));
test("touch target meets minimum", () => assert.ok(sizing.touchTarget >= 44));
test("pill radius is largest", () => assert.ok(radius.pill > radius.lg));
test("body typography remains readable", () => assert.ok(typography.body.fontSize >= 16 && typography.body.lineHeight > typography.body.fontSize));
test("primary button uses semantic colors", () => {
  const theme = resolveTheme(DEFAULT_THEME_PREFERENCES,false); const recipe=buttonRecipe(theme);
  assert.equal(recipe.backgroundColor, theme.colors.primary); assert.equal(recipe.color, theme.colors.onPrimary);
});
test("secondary button has border", () => assert.equal(buttonRecipe(resolveTheme(DEFAULT_THEME_PREFERENCES,false),"secondary").borderWidth, 1));
test("disabled button is visually reduced", () => assert.ok(buttonRecipe(resolveTheme(DEFAULT_THEME_PREFERENCES,false),"primary",true).opacity < 1));
test("card uses semantic surface", () => {
  const theme=resolveTheme(DEFAULT_THEME_PREFERENCES,false); assert.equal(cardRecipe(theme).backgroundColor, theme.colors.surface);
});
test("raised card includes elevation", () => assert.ok((cardRecipe(resolveTheme(DEFAULT_THEME_PREFERENCES,false),true) as any).elevation > 0));
test("focus ring uses semantic focus color", () => {
  const theme=resolveTheme(DEFAULT_THEME_PREFERENCES,false); assert.equal(focusRingRecipe(theme).borderColor, theme.colors.focus);
});

(async () => {
  let passed=0;
  for (const [name,fn] of cases) {
    try { await fn(); passed++; console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}`); throw error; }
  }
  console.log(`${passed}/${cases.length} milestone-2.4.4 visual-polish tests passed.`);
})();
