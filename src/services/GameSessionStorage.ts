import {
  restoreGameSession,
  serializeGameSession,
} from "../game/engine";
import type { GameSession, PersistedGameSession } from "../types/Game";
import type { Puzzle } from "../types/Puzzle";

export interface StringStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

function key(puzzleId: string): string {
  return `cross:game-session:${puzzleId}`;
}

export async function saveGameSession(
  storage: StringStorage,
  session: GameSession,
): Promise<void> {
  await storage.setItem(key(session.puzzleId), serializeGameSession(session));
}

export async function loadGameSession(
  storage: StringStorage,
  puzzle: Puzzle,
): Promise<GameSession | null> {
  const value = await storage.getItem(key(puzzle.id));
  if (value === null) return null;
  return restoreGameSession(puzzle, JSON.parse(value) as PersistedGameSession);
}

export async function clearGameSession(
  storage: StringStorage,
  puzzleId: string,
): Promise<void> {
  await storage.removeItem(key(puzzleId));
}
