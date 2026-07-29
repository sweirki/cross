export interface SaveMetadata{
  readonly schemaVersion:number;
  readonly appVersion:string;
  readonly createdAt:string;
}

export interface PuzzleProgress{
  readonly puzzleId:string;
  readonly completed:boolean;
  readonly moves:number;
  readonly hintsUsed:number;
}

export interface CampaignProgress{
  readonly completedPuzzleIds:readonly string[];
  readonly currentPuzzleId?:string;
}

export interface SaveFile{
  readonly metadata:SaveMetadata;
  readonly campaign:CampaignProgress;
  readonly puzzles:readonly PuzzleProgress[];
}
