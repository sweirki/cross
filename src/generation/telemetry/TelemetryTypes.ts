import type { DifficultyTier } from "../../types/Difficulty";
import type { HintEscalationLevel } from "../hints/HintTypes";

export type DifficultyTelemetryEvent =
  | { readonly type: "session-started"; readonly atMs: number }
  | { readonly type: "cell-placed"; readonly atMs: number; readonly correct: boolean; readonly deductionStepIndex?: number }
  | { readonly type: "hint-requested"; readonly atMs: number; readonly level: HintEscalationLevel; readonly deductionStepIndex?: number }
  | { readonly type: "undo"; readonly atMs: number }
  | { readonly type: "stall"; readonly atMs: number; readonly durationMs: number; readonly deductionStepIndex?: number }
  | { readonly type: "session-completed"; readonly atMs: number }
  | { readonly type: "session-abandoned"; readonly atMs: number };

export interface DifficultyTelemetrySession {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly puzzleId: string;
  readonly difficulty: DifficultyTier;
  readonly contentFingerprint: string;
  readonly events: readonly DifficultyTelemetryEvent[];
}

export interface DifficultyTelemetrySummary {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly puzzleId: string;
  readonly difficulty: DifficultyTier;
  readonly contentFingerprint: string;
  readonly startedAtMs?: number;
  readonly endedAtMs?: number;
  readonly activeDurationMs: number;
  readonly completed: boolean;
  readonly abandoned: boolean;
  readonly placements: number;
  readonly mistakes: number;
  readonly hints: number;
  readonly maximumHintLevel: number;
  readonly undos: number;
  readonly stallCount: number;
  readonly stalledDurationMs: number;
  readonly frictionByDeductionStep: Readonly<Record<string, number>>;
}

export interface TelemetryPrivacyValidation {
  readonly valid: boolean;
  readonly forbiddenPaths: readonly string[];
}
