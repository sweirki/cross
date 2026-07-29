export const typography = Object.freeze({
  display: Object.freeze({ fontSize: 40, lineHeight: 48, fontWeight: "700" as const }),
  title: Object.freeze({ fontSize: 28, lineHeight: 34, fontWeight: "700" as const }),
  heading: Object.freeze({ fontSize: 22, lineHeight: 28, fontWeight: "600" as const }),
  body: Object.freeze({ fontSize: 16, lineHeight: 24, fontWeight: "400" as const }),
  label: Object.freeze({ fontSize: 14, lineHeight: 20, fontWeight: "600" as const }),
  caption: Object.freeze({ fontSize: 12, lineHeight: 16, fontWeight: "400" as const }),
  tabular: Object.freeze({ fontSize: 18, lineHeight: 24, fontWeight: "600" as const, fontVariant: ["tabular-nums"] as const }),
});
