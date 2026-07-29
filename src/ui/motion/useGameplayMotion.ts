import { useCallback, useMemo, useRef, useState } from "react";
import type { RuntimeEvent } from "../../types/GameRuntime";
import {
  gameplayMotionCues,
  INITIAL_GAMEPLAY_MOTION_SNAPSHOT,
  reduceGameplayMotion,
  type GameplayMotionEvent,
  type GameplayMotionSnapshot,
} from "./gameplay";
import { useMotion } from "./useMotion";

function mapRuntimeEvent(event: RuntimeEvent): GameplayMotionEvent | null {
  switch (event.type) {
    case "tile-selected":
      return event.tileId === null ? null : { kind: "tile-select", targetId: event.tileId };
    case "tile-placed":
      return { kind: "tile-place", targetId: event.cellId };
    case "tile-removed":
      return { kind: "tile-remove", targetId: event.cellId };
    case "equation-completed":
      return { kind: "equation-complete", targetId: event.equationId };
    case "mistake-recorded":
      return { kind: "mistake", targetId: event.equationIds.join(",") };
    case "puzzle-completed":
      return { kind: "victory" };
    case "session-reset":
      return { kind: "board-reset" };
    case "hint-used":
      return null;
  }
}

export function useGameplayMotion() {
  const { resolved } = useMotion();
  const [snapshot, setSnapshot] = useState<GameplayMotionSnapshot>(INITIAL_GAMEPLAY_MOTION_SNAPSHOT);
  const sequence = useRef(0);

  const consume = useCallback((events: readonly RuntimeEvent[]) => {
    const mapped = events.map(mapRuntimeEvent).filter((event): event is GameplayMotionEvent => event != null);
    const cues = gameplayMotionCues(mapped, resolved, sequence.current);
    sequence.current += cues.length;
    if (cues.length > 0) {
      setSnapshot(current => cues.reduce(reduceGameplayMotion, current));
    }
    return cues;
  }, [resolved]);

  return useMemo(() => ({ snapshot, consume }), [consume, snapshot]);
}
