import type { DailyChallengePolicy } from "../types/PremiumGameplay";
import type { DailyChallenge } from "../types/RuntimeContent";
import type { PuzzleLibrary } from "./PuzzleLibrary";
import { selectDailyChallenge } from "./DailyChallenge";

export function selectDailyChallengeWithPolicy(
  library: PuzzleLibrary,
  date: string,
  policy: DailyChallengePolicy,
): DailyChallenge {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return selectDailyChallenge(library, date, policy.namespace);
  const target = policy.difficultyByWeekday?.[parsed.getUTCDay()];
  if (target === undefined) return selectDailyChallenge(library, date, policy.namespace);
  const filtered = library.puzzles.filter((puzzle) => puzzle.difficulty === target);
  return selectDailyChallenge(
    filtered.length === 0 ? library : { ...library, id: `${library.id}:${target}`, puzzles: filtered },
    date,
    `${policy.namespace}:${target}`,
  );
}
