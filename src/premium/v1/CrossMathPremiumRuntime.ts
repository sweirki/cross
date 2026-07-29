
import { CrossMathGameRuntime } from "../../game/runtime";
import { buildAdaptiveHint } from "../../services/AdaptiveHintRuntime";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  normalizeAccessibilityPreferences,
} from "../../services/AccessibilityRuntime";
import { deriveGameplayFeedback } from "../../services/GameplayFeedbackRuntime";
import { buildPracticeSet } from "../../services/PracticeGenerator";
import { selectDailyChallengeWithPolicy } from "../../services/PremiumDailyChallenge";
import { summarizePlayerAttempts } from "../../services/PlayerProfileStatistics";
import type { PuzzleLibrary } from "../../services/PuzzleLibrary";
import type { LearningContent, ConceptId } from "../../types/LearningContent";
import type { AccessibilityPreferences, DailyChallengePolicy, HintLevel, PlayerAttemptSummary } from "../../types/PremiumGameplay";
import type {
  CompleteAttemptInput,
  CrossMathPremiumRuntimeContract,
  DailyChallengeSelection,
  HintTransition,
  PracticeSessionPlan,
  PremiumEvent,
  PremiumPlayerProfile,
  PremiumProfileTransition,
  PremiumSession,
  PremiumTransition,
} from "../../types/PremiumGameplayRuntime";
import type { RuntimeAction } from "../../types/GameRuntime";
import type { Puzzle } from "../../types/Puzzle";

function requireString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string.`);
}
function requireInteger(value: unknown, label: string, minimum = 0): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < minimum) throw new Error(`${label} must be an integer >= ${minimum}.`);
}
function canonical<T>(value: T): T {
  if (Array.isArray(value)) return value.map(canonical) as T;
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      output[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return output as T;
  }
  return value;
}
function validateDate(value: string): void {
  requireString(value, "Date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("Date must use YYYY-MM-DD.");
  }
}
function validateProfile(profile: PremiumPlayerProfile): void {
  if (profile.schemaVersion !== 1) throw new Error("Unsupported premium profile schema.");
  requireString(profile.playerId, "Player id");
  requireInteger(profile.revision, "Profile revision");
  normalizeAccessibilityPreferences(profile.accessibility);
  const dates = new Set<string>();
  for (const date of profile.completedDailyDates) {
    validateDate(date);
    if (dates.has(date)) throw new Error(`Duplicate daily completion: ${date}.`);
    dates.add(date);
  }
  const attempts = new Set<string>();
  for (const attempt of profile.attempts) {
    requireString(attempt.puzzleId, "Attempt puzzle id");
    requireInteger(attempt.elapsedMs, "Attempt elapsed milliseconds");
    requireInteger(attempt.hintsUsed, "Attempt hints");
    requireInteger(attempt.mistakes, "Attempt mistakes");
    requireInteger(attempt.stars, "Attempt stars");
    if (attempt.stars > 3 || Number.isNaN(Date.parse(attempt.completedAt))) throw new Error("Invalid attempt.");
    const key = `${attempt.puzzleId}|${attempt.completedAt}`;
    if (attempts.has(key)) throw new Error("Duplicate attempt.");
    attempts.add(key);
  }
}
function validateSession(puzzle: Puzzle, session: PremiumSession): void {
  if (session.schemaVersion !== 1 || session.puzzleId !== puzzle.id) throw new Error("Premium session is incompatible with this puzzle.");
  requireString(session.playerId, "Player id");
  requireInteger(session.startedAt, "Session start timestamp");
  requireInteger(session.revision, "Session revision");
  requireInteger(session.hintLevel, "Hint level");
  if (session.hintLevel > 5) throw new Error("Hint level must be <= 5.");
}
function starsFor(session: PremiumSession): 0 | 1 | 2 | 3 {
  if (!session.runtime.history.present.completed) return 0;
  if (session.runtime.mistakes === 0 && session.runtime.history.present.hintsUsed === 0) return 3;
  if (session.runtime.mistakes <= 1 && session.runtime.history.present.hintsUsed <= 1) return 2;
  return 1;
}

export class CrossMathPremiumRuntime implements CrossMathPremiumRuntimeContract {
  private readonly game = new CrossMathGameRuntime();

  createProfile(playerId: string, accessibility: Partial<AccessibilityPreferences> = {}): PremiumPlayerProfile {
    requireString(playerId, "Player id");
    return {
      schemaVersion: 1,
      playerId,
      attempts: [],
      accessibility: normalizeAccessibilityPreferences(accessibility),
      completedDailyDates: [],
      revision: 0,
    };
  }

  startSession(profile: PremiumPlayerProfile, puzzle: Puzzle, startedAt: number): PremiumTransition {
    validateProfile(profile); requireInteger(startedAt, "Session start timestamp");
    const runtime = this.game.create(puzzle);
    const session: PremiumSession = {
      schemaVersion: 1, playerId: profile.playerId, puzzleId: puzzle.id,
      runtime: runtime.state, hintLevel: 0, startedAt, revision: 0,
    };
    return { session, runtime, events: [{ type: "session-started", puzzleId: puzzle.id }] };
  }

  dispatch(puzzle: Puzzle, session: PremiumSession, action: RuntimeAction): PremiumTransition {
    validateSession(puzzle, session);
    const previous = { state: session.runtime, view: this.game.dispatch(puzzle, session.runtime, { type: "advance-time", milliseconds: 0 }).view, events: [] };
    const runtime = this.game.dispatch(puzzle, session.runtime, action);
    const preferences = DEFAULT_ACCESSIBILITY_PREFERENCES;
    const feedback = deriveGameplayFeedback(previous.view, runtime.view, preferences);
    const events: PremiumEvent[] = feedback.map((item) => ({ type: "feedback", feedback: item }));
    return {
      session: { ...session, runtime: runtime.state, revision: session.revision + (runtime.state === session.runtime ? 0 : 1) },
      runtime,
      events,
    };
  }

  requestHint(puzzle: Puzzle, session: PremiumSession, level?: HintLevel): HintTransition {
    validateSession(puzzle, session);
    const selected = level ?? (Math.min(5, session.hintLevel + 1) as HintLevel);
    if (!Number.isInteger(selected) || selected < 1 || selected > 5) throw new Error("Hint level must be between 1 and 5.");
    const hint = buildAdaptiveHint(puzzle, session.runtime.history.present, selected);
    if (hint === null) return { session, hint: null, runtimeEvents: [], events: [] };
    const runtime = this.game.dispatch(puzzle, session.runtime, { type: "hint" });
    const next: PremiumSession = {
      ...session, runtime: runtime.state, hintLevel: Math.max(session.hintLevel, selected) as PremiumSession["hintLevel"],
      revision: session.revision + 1,
    };
    return {
      session: next, hint, runtimeEvents: runtime.events,
      events: [{ type: "hint-presented", level: selected, kind: hint.kind }],
    };
  }

  completeAttempt(profile: PremiumPlayerProfile, session: PremiumSession, input: CompleteAttemptInput): PremiumProfileTransition {
    validateProfile(profile);
    if (profile.playerId !== session.playerId) throw new Error("Session belongs to another player.");
    if (!session.runtime.history.present.completed) throw new Error("Cannot record an incomplete puzzle.");
    if (Number.isNaN(Date.parse(input.completedAt))) throw new Error("Invalid completion timestamp.");
    const attempt: PlayerAttemptSummary = {
      puzzleId: session.puzzleId, concept: input.concept, completedAt: input.completedAt,
      elapsedMs: session.runtime.clock.elapsedMs, hintsUsed: session.runtime.history.present.hintsUsed,
      mistakes: session.runtime.mistakes, stars: starsFor(session),
    };
    if (profile.attempts.some((item) => item.puzzleId === attempt.puzzleId && item.completedAt === attempt.completedAt)) {
      throw new Error("Duplicate attempt.");
    }
    const next = { ...profile, attempts: [...profile.attempts, attempt], revision: profile.revision + 1 };
    return { profile: next, events: [{ type: "attempt-recorded", puzzleId: attempt.puzzleId, stars: attempt.stars }] };
  }

  buildPractice(content: LearningContent, library: PuzzleLibrary, concept: ConceptId, count: number, seed: string, excludePuzzleIds?: readonly string[]): PracticeSessionPlan {
    requireString(seed, "Practice seed");
    return buildPracticeSet(content, library, { concept, count, seed, excludePuzzleIds });
  }

  selectDaily(library: PuzzleLibrary, date: string, policy: DailyChallengePolicy): DailyChallengeSelection {
    validateDate(date); requireString(policy.namespace, "Daily namespace");
    const result = selectDailyChallengeWithPolicy(library, date, policy);
    return { date, puzzle: result.puzzle };
  }

  markDailyComplete(profile: PremiumPlayerProfile, date: string): PremiumProfileTransition {
    validateProfile(profile); validateDate(date);
    if (profile.completedDailyDates.includes(date)) return { profile, events: [] };
    const dates = [...profile.completedDailyDates, date].sort();
    return {
      profile: { ...profile, completedDailyDates: dates, revision: profile.revision + 1 },
      events: [{ type: "daily-completed", date }],
    };
  }

  statistics(profile: PremiumPlayerProfile, masteryThreshold = 3) {
    validateProfile(profile);
    return summarizePlayerAttempts(profile.attempts, masteryThreshold);
  }

  updateAccessibility(profile: PremiumPlayerProfile, value: Partial<AccessibilityPreferences>): PremiumProfileTransition {
    validateProfile(profile);
    const accessibility = normalizeAccessibilityPreferences({ ...profile.accessibility, ...value });
    if (JSON.stringify(accessibility) === JSON.stringify(profile.accessibility)) return { profile, events: [] };
    return {
      profile: { ...profile, accessibility, revision: profile.revision + 1 },
      events: [{ type: "accessibility-updated" }],
    };
  }

  serializeProfile(profile: PremiumPlayerProfile): string { validateProfile(profile); return JSON.stringify(canonical(profile)); }
  restoreProfile(serialized: string): PremiumPlayerProfile {
    let parsed: unknown; try { parsed = JSON.parse(serialized); } catch { throw new Error("Premium profile save is not valid JSON."); }
    validateProfile(parsed as PremiumPlayerProfile); return canonical(parsed as PremiumPlayerProfile);
  }
  serializeSession(session: PremiumSession): string { return JSON.stringify(canonical(session)); }
  restoreSession(puzzle: Puzzle, serialized: string): PremiumSession {
    let parsed: unknown; try { parsed = JSON.parse(serialized); } catch { throw new Error("Premium session save is not valid JSON."); }
    const session = parsed as PremiumSession; validateSession(puzzle, session);
    this.game.restore(puzzle, this.game.serialize(session.runtime));
    return canonical(session);
  }

  replay(puzzle: Puzzle, profile: PremiumPlayerProfile, actions: readonly RuntimeAction[], startedAt: number): PremiumTransition {
    let current = this.startSession(profile, puzzle, startedAt);
    for (const action of actions) current = this.dispatch(puzzle, current.session, action);
    return current;
  }
}
