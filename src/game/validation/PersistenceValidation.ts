import type { SaveFile } from "../../types/Persistence";

export interface PersistenceValidationResult{
  readonly valid:boolean;
  readonly issues:readonly string[];
}

export interface PersistenceValidator{
  validate(save:SaveFile):PersistenceValidationResult;
}
