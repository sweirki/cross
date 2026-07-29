Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"
Set-Location C:\cross

$files=@{
".\docs\PRODUCTION_PIPELINE_SPECIFICATION.md"=@'
# Cross Production Pipeline

Version: 1.0
Status: Draft

## Purpose

The production pipeline builds certified puzzle libraries from deterministic generation requests.

## Stages

1. Request
2. Generator
3. Solver
4. Difficulty Certification
5. Quality Certification
6. Duplicate Detection
7. Library Assembly
8. Export
9. Regression Verification

## Rules

- Every accepted puzzle has a unique fingerprint.
- Certification is independent of generation.
- Failed candidates are logged with deterministic diagnostics.
- Library exports are reproducible from the same seeds and policies.
'@

".\src\types\ProductionPipeline.ts"=@'
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
'@

".\src\game\validation\ProductionPipelineValidation.ts"=@'
import type { ProductionResult } from "../../types/ProductionPipeline";

export interface ProductionPipelineValidationResult{
  readonly valid:boolean;
  readonly issues:readonly string[];
}

export interface ProductionPipelineValidator{
  validate(result:ProductionResult):ProductionPipelineValidationResult;
}
'@
}

foreach($p in $files.Keys){
 $d=Split-Path -Parent $p
 if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null}
 $files[$p]|Set-Content -Encoding utf8 -Path $p
}

Write-Host ""
Write-Host "Phase 2.10 files created:"
Write-Host "  docs/PRODUCTION_PIPELINE_SPECIFICATION.md"
Write-Host "  src/types/ProductionPipeline.ts"
Write-Host "  src/game/validation/ProductionPipelineValidation.ts"
Write-Host ""

npx tsc --noEmit
if($LASTEXITCODE -ne 0){throw "TypeScript validation failed."}

Write-Host ""
Write-Host "Phase 2.10 production pipeline contracts passed TypeScript validation."
