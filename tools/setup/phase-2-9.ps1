Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
Set-Location C:\cross

$files=@{
".\docs\PERSISTENCE_SPECIFICATION.md"=@'
# Cross Persistence & Save Format

Version: 1.0
Status: Draft

## Goals

Persistence must be deterministic, forward-compatible, and independent of UI.

## Persisted Data

- campaign progress
- completed puzzles
- active puzzle state
- undo/redo history
- hint usage
- settings
- statistics
- save schema version

## Rules

- Every save includes a schema version.
- Puzzle identity uses stable fingerprints.
- Replay history is append-only.
- Future migrations must preserve prior saves when possible.
'@

".\src\types\Persistence.ts"=@'
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
'@

".\src\game\validation\PersistenceValidation.ts"=@'
import type { SaveFile } from "../../types/Persistence";

export interface PersistenceValidationResult{
  readonly valid:boolean;
  readonly issues:readonly string[];
}

export interface PersistenceValidator{
  validate(save:SaveFile):PersistenceValidationResult;
}
'@
}

foreach($p in $files.Keys){
 $d=Split-Path -Parent $p
 if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null}
 $files[$p] | Set-Content -Encoding utf8 -Path $p
}

Write-Host ""
Write-Host "Phase 2.9 files created:"
Write-Host "  docs/PERSISTENCE_SPECIFICATION.md"
Write-Host "  src/types/Persistence.ts"
Write-Host "  src/game/validation/PersistenceValidation.ts"
Write-Host ""

npx tsc --noEmit
if($LASTEXITCODE -ne 0){throw "TypeScript validation failed."}

Write-Host ""
Write-Host "Phase 2.9 persistence contracts passed TypeScript validation."
