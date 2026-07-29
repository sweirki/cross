import { useContext } from "react";
import { MotionContext, type MotionContextValue } from "./MotionContext";

export function useMotion(): MotionContextValue {
  const value = useContext(MotionContext);
  if (value === null) throw new Error("useMotion must be used within MotionProvider.");
  return value;
}
