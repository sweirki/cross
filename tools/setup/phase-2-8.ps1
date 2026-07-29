Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location C:\cross

$files = @{
".\docs\DIFFICULTY_SPECIFICATION.md"=@'
# Cross Difficulty Certification Specification

Version: 1.0
Status: Draft

## Purpose

Difficulty is derived from logical proof complexity rather than board size,
operator count, or numeric magnitude.

## Certification Inputs

- Solver proof
- Proof dependency graph
- Search trace
- Topology metrics
- Equation metrics
- Clue metrics

## Core Metrics

- Proof depth
- Proof width
- Deduction count
- Technique diversity
- Branching factor
- Information gain
- Constraint density
- Search requirement

## Output

The certification engine produces:

- certified difficulty tier
- metric vector
- deterministic fingerprint
- certification diagnostics

Generator requests are advisory.
Certification is authoritative.
'@

".\src\types\DifficultyCertification.ts"=@'
import type { DifficultyTier } from "./Difficulty";

export interface DifficultyMetricVector {
  readonly proofDepth:number;
  readonly proofWidth:number;
  readonly deductionCount:number;
  readonly techniqueDiversity:number;
  readonly branchingFactor:number;
  readonly informationGain:number;
  readonly constraintDensity:number;
}

export interface DifficultyCertification {
  readonly requestedTier:DifficultyTier;
  readonly certifiedTier:DifficultyTier;
  readonly metrics:DifficultyMetricVector;
  readonly fingerprint:string;
}
'@

".\src\game\validation\DifficultyValidation.ts"=@'
import type { DifficultyCertification } from "../../types/DifficultyCertification";

export interface DifficultyValidationResult{
  readonly valid:boolean;
  readonly issues:readonly string[];
}

export interface DifficultyValidator{
  validate(certification:DifficultyCertification):DifficultyValidationResult;
}
'@
}

foreach($p in $files.Keys){
 $d=Split-Path -Parent $p
 if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null}
 $files[$p] | Set-Content -Encoding utf8 -Path $p
}

Write-Host ""
Write-Host "Phase 2.8 files created:"
Write-Host "  docs/DIFFICULTY_SPECIFICATION.md"
Write-Host "  src/types/DifficultyCertification.ts"
Write-Host "  src/game/validation/DifficultyValidation.ts"
Write-Host ""

npx tsc --noEmit
if($LASTEXITCODE -ne 0){ throw "TypeScript validation failed."}

Write-Host ""
Write-Host "Phase 2.8 difficulty contracts passed TypeScript validation."
