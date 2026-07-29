import { useContext } from "react";
import { DeviceContext } from "./DeviceContext";

export function useDevice() {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("useDevice must be used within DeviceProvider.");
  return value;
}
