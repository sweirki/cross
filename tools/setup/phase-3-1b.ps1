Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location C:\cross

$base = Get-Content .\tsconfig.json -Raw | ConvertFrom-Json

$cfg = @{
  extends = "./tsconfig.json"
  compilerOptions = @{
    noEmit = $false
    outDir = "./.tmp/tests"
  }
  include = @(
    "src/**/*.ts",
    "tools/tests/**/*.ts"
  )
}

if ($base.compilerOptions.moduleResolution) {
  $cfg.compilerOptions.moduleResolution = $base.compilerOptions.moduleResolution
}
if ($base.compilerOptions.module) {
  $cfg.compilerOptions.module = $base.compilerOptions.module
}
if ($base.compilerOptions.customConditions) {
  $cfg.compilerOptions.customConditions = $base.compilerOptions.customConditions
}

$cfg | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 .\tsconfig.tests.json

Write-Host "Project typecheck..."
npx tsc --noEmit
if($LASTEXITCODE -ne 0){ throw "Project typecheck failed." }

if(Test-Path .\.tmp\tests){ Remove-Item .\.tmp\tests -Recurse -Force }

Write-Host "Compiling tests..."
npx tsc -p .\tsconfig.tests.json
if($LASTEXITCODE -ne 0){ throw "Test compilation failed." }

Write-Host "Running tests..."
node .\.tmp\tests\tools\tests\arithmetic-engine.test.js
if($LASTEXITCODE -ne 0){ throw "Arithmetic tests failed." }

Write-Host "Phase 3.1B COMPLETE"
