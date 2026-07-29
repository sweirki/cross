import type { DeductionTrace } from "../contracts/GenerationContracts";
import { createHint } from "./HintEngine";
import type { HintEscalationLevel, HintResult } from "./HintTypes";

export class HintSession {
  private readonly levels = new Map<number, HintEscalationLevel>();

  public constructor(
    private readonly puzzleId: string,
    private readonly trace: DeductionTrace,
  ) {}

  public next(solvedCellIds: readonly string[]): HintResult {
    const solved = new Set(solvedCellIds);
    const step = this.trace.steps.find((candidate) =>
      !solved.has(candidate.cellId) &&
      candidate.prerequisiteCellIds.every((cellId) => solved.has(cellId)),
    );
    const key = step?.index ?? -1;
    const prior = this.levels.get(key) ?? 0;
    const level = Math.min(4, prior + 1) as HintEscalationLevel;
    this.levels.set(key, level);
    return createHint({ puzzleId: this.puzzleId, trace: this.trace, solvedCellIds, requestedLevel: level });
  }

  public resetStep(stepIndex: number): void {
    this.levels.delete(stepIndex);
  }
}
