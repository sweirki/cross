import type { ColorTokens } from "../types";

export const lightColors: ColorTokens = Object.freeze({
  background: "#F6F7FB", surface: "#FFFFFF", surfaceRaised: "#FFFFFF",
  text: "#171A21", textMuted: "#5F6673", primary: "#3157D5", onPrimary: "#FFFFFF",
  success: "#18794E", warning: "#9A6700", danger: "#C9372C", border: "#D8DCE5",
  focus: "#174EA6", overlay: "rgba(15, 18, 24, 0.52)",
});
export const darkColors: ColorTokens = Object.freeze({
  background: "#101217", surface: "#191C23", surfaceRaised: "#222630",
  text: "#F5F7FA", textMuted: "#B5BBC7", primary: "#8FA8FF", onPrimary: "#101A3D",
  success: "#62D6A5", warning: "#F2C14E", danger: "#FF8B83", border: "#3A404C",
  focus: "#B7C6FF", overlay: "rgba(0, 0, 0, 0.68)",
});
export const highContrastLightColors: ColorTokens = Object.freeze({
  ...lightColors, background: "#FFFFFF", surface: "#FFFFFF", text: "#000000",
  textMuted: "#303030", primary: "#0037B3", border: "#000000", focus: "#000000",
});
export const highContrastDarkColors: ColorTokens = Object.freeze({
  ...darkColors, background: "#000000", surface: "#000000", surfaceRaised: "#111111",
  text: "#FFFFFF", textMuted: "#E6E6E6", primary: "#B8C8FF", border: "#FFFFFF", focus: "#FFFFFF",
});
