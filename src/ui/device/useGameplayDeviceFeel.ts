import { useCallback, useRef } from "react";
import type { RuntimeEvent } from "../../types/GameRuntime";
import { deviceFeelCues } from "./cues";
import type { DeviceFeelEvent } from "./types";
import { useDevice } from "./useDevice";

export function mapRuntimeEventToDeviceFeel(event: RuntimeEvent): DeviceFeelEvent | null {
  switch (event.type) {
    case "tile-selected":
      return event.tileId === null ? null : { kind: "tile-select", targetId: event.tileId };
    case "tile-placed":
      return { kind: "tile-place", targetId: event.cellId };
    case "mistake-recorded":
      return { kind: "invalid", message: "That move is not valid." };
    case "equation-completed":
      return { kind: "equation-complete", targetId: event.equationId };
    case "puzzle-completed":
      return { kind: "victory", message: "Puzzle completed." };
    case "tile-removed":
    case "hint-used":
    case "session-reset":
      return null;
  }
}

export function useGameplayDeviceFeel() {
  const { preferences, perform } = useDevice();
  const sequence = useRef(0);

  return useCallback(async (events: readonly RuntimeEvent[]) => {
    const mapped = events
      .map(mapRuntimeEventToDeviceFeel)
      .filter((event): event is DeviceFeelEvent => event !== null);
    const cues = deviceFeelCues(mapped, preferences, sequence.current);
    sequence.current += cues.length;
    for (const cue of cues) await perform(cue);
    return cues;
  }, [perform, preferences]);
}
