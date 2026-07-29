import { strict as assert } from "node:assert";
import { DEMO_PUZZLE } from "../../src/data/demoPuzzle";
import { createGameSession, getLogicalHint, placeTile } from "../../src/game/engine";
import { buildCampaignState } from "../../src/services/CampaignRuntime";
import { selectDailyChallenge } from "../../src/services/DailyChallenge";
import { createPlayStatistics, mergePuzzleProgress, updatePlayStatistics } from "../../src/services/PlayerStatistics";
import { buildPuzzleCatalog } from "../../src/services/PuzzleCatalog";
import { inMemoryPuzzleSource, loadPuzzle } from "../../src/services/PuzzleRuntime";
import { createRuntimePuzzleIndex } from "../../src/services/RuntimeIndex";
import type { PuzzleLibrary } from "../../src/services/PuzzleLibrary";
import type { Campaign } from "../../src/types/RuntimeContent";

const library: PuzzleLibrary = { schemaVersion: 1, id: "test", puzzles: [DEMO_PUZZLE] };

async function main(): Promise<void> {
  assert.equal((await loadPuzzle(inMemoryPuzzleSource(library), { id: DEMO_PUZZLE.id })).id, DEMO_PUZZLE.id);

  const dailyA = selectDailyChallenge(library, "2026-07-28");
  const dailyB = selectDailyChallenge(library, "2026-07-28");
  assert.equal(dailyA.puzzleId, dailyB.puzzleId);
  assert.throws(() => selectDailyChallenge(library, "bad-date"));

  const index = createRuntimePuzzleIndex(library);
  assert.equal(index.byId.get(DEMO_PUZZLE.id)?.id, DEMO_PUZZLE.id);
  assert.equal(index.byDifficulty.get("easy")?.length, 1);

  const session = createGameSession(DEMO_PUZZLE);
  const hint = getLogicalHint(DEMO_PUZZLE, session);
  assert.ok(hint);
  assert.equal(hint?.value, 8);
  assert.deepEqual(hint?.equationIds, ["horizontal-top", "vertical-left-top"]);

  let stats = createPlayStatistics(DEMO_PUZZLE.id, "2026-07-28T00:00:00.000Z");
  stats = updatePlayStatistics(stats, { type: "tick", elapsedMs: 5000 });
  stats = updatePlayStatistics(stats, { type: "mistake" });
  stats = updatePlayStatistics(stats, { type: "undo" });
  assert.equal(stats.elapsedMs, 5000);
  assert.equal(stats.mistakes, 1);
  assert.equal(stats.undoCount, 1);

  let completed = session;
  const unusedTiles = [...DEMO_PUZZLE.numberBank];
  for (const cell of DEMO_PUZZLE.cells) {
    if (cell.kind !== "number" || cell.given) continue;
    const tileIndex = unusedTiles.findIndex((tile) => tile.value === cell.solution);
    assert.notEqual(tileIndex, -1);
    const [tile] = unusedTiles.splice(tileIndex, 1);
    completed = placeTile(DEMO_PUZZLE, completed, cell.id, tile!.id);
  }
  stats = updatePlayStatistics(stats, { type: "session", session: completed });
  const progress = mergePuzzleProgress(undefined, stats, "2026-07-28T00:01:00.000Z");
  assert.equal(progress.completed, true);
  assert.equal(progress.stars, 2);

  const catalog = buildPuzzleCatalog(library, { [DEMO_PUZZLE.id]: progress });
  assert.equal(catalog[0]?.completed, true);
  assert.equal(catalog[0]?.locked, false);

  const campaign: Campaign = {
    schemaVersion: 1,
    id: "main",
    chapters: [{ id: "c1", title: "Start", levels: [{ id: "l1", puzzleId: DEMO_PUZZLE.id }] }],
  };
  const campaignState = buildCampaignState(campaign, library, { [DEMO_PUZZLE.id]: progress });
  assert.equal(campaignState[0]?.completed, true);
  assert.equal(campaignState[0]?.locked, false);

  console.log("Phase 8 runtime: 16/16 PASS");
}
void main();
