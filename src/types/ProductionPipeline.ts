export interface ProductionRequest{
  readonly libraryId:string;
  readonly targetPuzzleCount:number;
  readonly rootSeed:string;
}

export interface ProductionStatistics{
  readonly generated:number;
  readonly accepted:number;
  readonly rejected:number;
}

export interface ProductionResult{
  readonly request:ProductionRequest;
  readonly statistics:ProductionStatistics;
  readonly libraryFingerprint:string;
}
