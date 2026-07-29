"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = {
    equal(actual, expected) { if (actual !== expected)
        throw new Error(`Expected ${String(expected)}, received ${String(actual)}.`); },
    notEqual(actual, expected) { if (actual === expected)
        throw new Error(`Expected values to differ: ${String(actual)}.`); },
    ok(value) { if (!value)
        throw new Error("Expected truthy value."); },
    deepEqual(actual, expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
    },
    throws(run) { let threw = false; try {
        run();
    }
    catch {
        threw = true;
    } if (!threw)
        throw new Error("Expected function to throw."); },
};
const core_1 = require("../../src/ui/theme/core");
const cases = [];
const test = (name, fn) => cases.push([name, fn]);
test("defaults are stable", () => assert.deepEqual(core_1.DEFAULT_THEME_PREFERENCES, { schemaVersion: 1, mode: "system", contrast: "standard", responsiveType: true }));
test("invalid preferences fall back", () => assert.deepEqual((0, core_1.parseThemePreferences)({ mode: "blue" }), core_1.DEFAULT_THEME_PREFERENCES));
test("valid preferences parse", () => assert.equal((0, core_1.parseThemePreferences)({ mode: "dark", contrast: "high", responsiveType: false }).mode, "dark"));
test("system light resolves", () => assert.equal((0, core_1.resolveThemeMode)("system", false), "light"));
test("system dark resolves", () => assert.equal((0, core_1.resolveThemeMode)("system", true), "dark"));
test("explicit light wins", () => assert.equal((0, core_1.resolveThemeMode)("light", true), "light"));
test("explicit dark wins", () => assert.equal((0, core_1.resolveThemeMode)("dark", false), "dark"));
test("light theme resolves", () => assert.equal((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false).mode, "light"));
test("dark theme resolves", () => assert.equal((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, true).mode, "dark"));
test("high contrast light uses black text", () => assert.equal((0, core_1.resolveTheme)({ ...core_1.DEFAULT_THEME_PREFERENCES, contrast: "high" }, false).colors.text, "#000000"));
test("high contrast dark uses white border", () => assert.equal((0, core_1.resolveTheme)({ ...core_1.DEFAULT_THEME_PREFERENCES, contrast: "high" }, true).colors.border, "#FFFFFF"));
test("semantic primary differs by mode", () => assert.notEqual((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false).colors.primary, (0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, true).colors.primary));
test("compact breakpoint lower edge", () => assert.equal((0, core_1.classifyBreakpoint)(0), "compact"));
test("compact breakpoint upper edge", () => assert.equal((0, core_1.classifyBreakpoint)(599), "compact"));
test("medium breakpoint lower edge", () => assert.equal((0, core_1.classifyBreakpoint)(600), "medium"));
test("medium breakpoint upper edge", () => assert.equal((0, core_1.classifyBreakpoint)(1023), "medium"));
test("expanded breakpoint", () => assert.equal((0, core_1.classifyBreakpoint)(1024), "expanded"));
test("invalid width rejected", () => assert.throws(() => (0, core_1.classifyBreakpoint)(-1)));
test("NaN width rejected", () => assert.throws(() => (0, core_1.classifyBreakpoint)(Number.NaN)));
test("compact layout is one column", () => assert.equal((0, core_1.resolveLayoutMetrics)(390).columns, 1));
test("medium layout is two columns", () => assert.equal((0, core_1.resolveLayoutMetrics)(800).columns, 2));
test("expanded layout is three columns", () => assert.equal((0, core_1.resolveLayoutMetrics)(1200).columns, 3));
test("font scale clamps low", () => assert.equal((0, core_1.resolveLayoutMetrics)(390, .5).typeScale, 1));
test("font scale clamps high", () => assert.equal((0, core_1.resolveLayoutMetrics)(390, 2).typeScale, 1.5));
test("responsive type can be disabled", () => assert.equal((0, core_1.resolveLayoutMetrics)(390, 1.4, false).typeScale, 1));
test("invalid font scale rejected", () => assert.throws(() => (0, core_1.resolveLayoutMetrics)(390, 0)));
test("serialization is deterministic", () => {
    const value = { schemaVersion: 1, mode: "dark", contrast: "high", responsiveType: false };
    assert.equal((0, core_1.serializeThemePreferences)(value), (0, core_1.serializeThemePreferences)(value));
});
test("serialization field order is canonical", () => assert.equal((0, core_1.serializeThemePreferences)(core_1.DEFAULT_THEME_PREFERENCES), '{"schemaVersion":1,"mode":"system","contrast":"standard","responsiveType":true}'));
test("serialized preferences round trip", () => assert.deepEqual((0, core_1.parseSerializedThemePreferences)((0, core_1.serializeThemePreferences)(core_1.DEFAULT_THEME_PREFERENCES)), core_1.DEFAULT_THEME_PREFERENCES));
test("malformed serialization falls back", () => assert.deepEqual((0, core_1.parseSerializedThemePreferences)("{"), core_1.DEFAULT_THEME_PREFERENCES));
test("missing storage loads defaults", async () => {
    const storage = { getItem: async () => null, setItem: async () => { }, removeItem: async () => { } };
    assert.deepEqual(await (0, core_1.loadThemePreferences)(storage), core_1.DEFAULT_THEME_PREFERENCES);
});
test("storage failure loads defaults", async () => {
    const storage = { getItem: async () => { throw new Error("fail"); }, setItem: async () => { }, removeItem: async () => { } };
    assert.deepEqual(await (0, core_1.loadThemePreferences)(storage), core_1.DEFAULT_THEME_PREFERENCES);
});
test("preferences save deterministically", async () => {
    let key = "";
    let raw = "";
    const storage = { getItem: async () => null, setItem: async (k, v) => { key = k; raw = v; }, removeItem: async () => { } };
    await (0, core_1.saveThemePreferences)(storage, core_1.DEFAULT_THEME_PREFERENCES);
    assert.equal(key, core_1.THEME_PREFERENCES_STORAGE_KEY);
    assert.equal(raw, (0, core_1.serializeThemePreferences)(core_1.DEFAULT_THEME_PREFERENCES));
});
test("spacing scale is monotonic", () => assert.ok(core_1.spacing.xs < core_1.spacing.sm && core_1.spacing.sm < core_1.spacing.md && core_1.spacing.md < core_1.spacing.lg));
test("touch target meets minimum", () => assert.ok(core_1.sizing.touchTarget >= 44));
test("pill radius is largest", () => assert.ok(core_1.radius.pill > core_1.radius.lg));
test("body typography remains readable", () => assert.ok(core_1.typography.body.fontSize >= 16 && core_1.typography.body.lineHeight > core_1.typography.body.fontSize));
test("primary button uses semantic colors", () => {
    const theme = (0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false);
    const recipe = (0, core_1.buttonRecipe)(theme);
    assert.equal(recipe.backgroundColor, theme.colors.primary);
    assert.equal(recipe.color, theme.colors.onPrimary);
});
test("secondary button has border", () => assert.equal((0, core_1.buttonRecipe)((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false), "secondary").borderWidth, 1));
test("disabled button is visually reduced", () => assert.ok((0, core_1.buttonRecipe)((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false), "primary", true).opacity < 1));
test("card uses semantic surface", () => {
    const theme = (0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false);
    assert.equal((0, core_1.cardRecipe)(theme).backgroundColor, theme.colors.surface);
});
test("raised card includes elevation", () => assert.ok((0, core_1.cardRecipe)((0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false), true).elevation > 0));
test("focus ring uses semantic focus color", () => {
    const theme = (0, core_1.resolveTheme)(core_1.DEFAULT_THEME_PREFERENCES, false);
    assert.equal((0, core_1.focusRingRecipe)(theme).borderColor, theme.colors.focus);
});
(async () => {
    let passed = 0;
    for (const [name, fn] of cases) {
        try {
            await fn();
            passed++;
            console.log(`PASS ${name}`);
        }
        catch (error) {
            console.error(`FAIL ${name}`);
            throw error;
        }
    }
    console.log(`${passed}/${cases.length} milestone-2.4.4 visual-polish tests passed.`);
})();
