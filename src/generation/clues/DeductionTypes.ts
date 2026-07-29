
import type { DeductionTrace } from "../contracts/GenerationContracts";

export type DeductionFailureCode =
  | "INVALID_CLUE_COVERAGE"
  | "UNSOLVABLE_BY_SUPPORTED_RULES"
  | "DIFFICULTY_PROFILE_MISMATCH";

export type CluePlanningResult =
  | { readonly ok: true; readonly plan: import("../contracts/GenerationContracts").CluePlan; readonly trace: DeductionTrace }
  | { readonly ok: false; readonly code: DeductionFailureCode; readonly message: string; readonly trace?: DeductionTrace };
