import type { ProductionResult } from "../../types/ProductionPipeline";

export interface ProductionPipelineValidationResult{
  readonly valid:boolean;
  readonly issues:readonly string[];
}

export interface ProductionPipelineValidator{
  validate(result:ProductionResult):ProductionPipelineValidationResult;
}
