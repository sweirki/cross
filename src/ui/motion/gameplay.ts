import { motionAnimation, type MotionAnimation, type MotionAnimationName } from "./animations";
import { motionTransition, type MotionTransition } from "./transitions";
import type { ResolvedMotionPreferences } from "./types";

export type GameplayMotionKind =
  | "tile-select"
  | "tile-place"
  | "tile-remove"
  | "equation-complete"
  | "mistake"
  | "victory"
  | "board-reset";

export interface GameplayMotionEvent {
  readonly kind: GameplayMotionKind;
  readonly targetId?: string;
}

export interface GameplayMotionCue {
  readonly kind: GameplayMotionKind;
  readonly targetId: string | null;
  readonly animation: MotionAnimation;
  readonly transition: MotionTransition | null;
  readonly emphasis: "none" | "subtle" | "strong";
  readonly sequence: number;
}

const animationForKind: Readonly<Record<GameplayMotionKind, MotionAnimationName>> =
  Object.freeze({
    "tile-select": "pop",
    "tile-place": "pop",
    "tile-remove": "fade",
    "equation-complete": "glow",
    mistake: "shake",
    victory: "confetti",
    "board-reset": "fade",
  });

function emphasisForKind(
  kind: GameplayMotionKind,
): GameplayMotionCue["emphasis"] {
  switch (kind) {
    case "victory":
    case "mistake":
      return "strong";

    case "tile-select":
    case "tile-place":
    case "equation-complete":
      return "subtle";

    default:
      return "none";
  }
}

function isGameplayMotionKind(
  value: unknown,
): value is GameplayMotionKind {
  return (
    value === "tile-select" ||
    value === "tile-place" ||
    value === "tile-remove" ||
    value === "equation-complete" ||
    value === "mistake" ||
    value === "victory" ||
    value === "board-reset"
  );
}

export function gameplayMotionCue(
  event: GameplayMotionEvent | null | undefined,
  preferences: ResolvedMotionPreferences,
  sequence: number,
): GameplayMotionCue | null {
  if (!event) {
    return null;
  }

  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error(
      "Gameplay motion sequence must be a non-negative safe integer.",
    );
  }

  if (!isGameplayMotionKind(event.kind)) {
    return null;
  }

  const targetId =
    typeof event.targetId === "string"
      ? event.targetId.trim() || null
      : null;

  const transition =
    event.kind === "board-reset"
      ? motionTransition("board-change", preferences)
      : null;

  return Object.freeze({
    kind: event.kind,
    targetId,
    animation: motionAnimation(
      animationForKind[event.kind],
      preferences,
    ),
    transition,
    emphasis: emphasisForKind(event.kind),
    sequence,
  });
}

export function gameplayMotionCues(
  events: readonly (GameplayMotionEvent | null | undefined)[],
  preferences: ResolvedMotionPreferences,
  startSequence = 0,
): readonly GameplayMotionCue[] {
  if (!Number.isSafeInteger(startSequence) || startSequence < 0) {
    throw new Error(
      "Gameplay motion start sequence must be a non-negative safe integer.",
    );
  }

  const cues: GameplayMotionCue[] = [];

  let sequence = startSequence;

  for (const event of events) {
    const cue = gameplayMotionCue(event, preferences, sequence);

    if (cue) {
      cues.push(cue);
      sequence++;
    }
  }

  return Object.freeze(cues);
}

export interface GameplayMotionSnapshot {
  readonly sequence: number;
  readonly tileId: string | null;
  readonly cellId: string | null;
  readonly equationId: string | null;
  readonly mistakeId: string | null;
  readonly boardRevision: number;
  readonly victoryRevision: number;
  readonly cue: GameplayMotionCue | null;
}

export const INITIAL_GAMEPLAY_MOTION_SNAPSHOT: GameplayMotionSnapshot =
  Object.freeze({
    sequence: 0,
    tileId: null,
    cellId: null,
    equationId: null,
    mistakeId: null,
    boardRevision: 0,
    victoryRevision: 0,
    cue: null,
  });

export function reduceGameplayMotion(
  snapshot: GameplayMotionSnapshot,
  cue: GameplayMotionCue | null,
): GameplayMotionSnapshot {
  if (!cue) {
    return snapshot;
  }

  if (cue.sequence < snapshot.sequence) {
    return snapshot;
  }

  return Object.freeze({
    sequence: cue.sequence + 1,
    tileId:
      cue.kind === "tile-select"
        ? cue.targetId
        : snapshot.tileId,
    cellId:
      cue.kind === "tile-place" || cue.kind === "tile-remove"
        ? cue.targetId
        : snapshot.cellId,
    equationId:
      cue.kind === "equation-complete"
        ? cue.targetId
        : snapshot.equationId,
    mistakeId:
      cue.kind === "mistake"
        ? cue.targetId
        : snapshot.mistakeId,
    boardRevision:
      snapshot.boardRevision +
      (cue.kind === "board-reset" ? 1 : 0),
    victoryRevision:
      snapshot.victoryRevision +
      (cue.kind === "victory" ? 1 : 0),
    cue,
  });
}