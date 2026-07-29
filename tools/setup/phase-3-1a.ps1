Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location C:\cross

@'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "./.tmp/tests",
    "module": "commonjs",
    "moduleResolution": "node"
  },
  "include": [
    "src/**/*.ts",
    "tools/tests/**/*.ts"
  ]
}
'@ | Set-Content -Encoding UTF8 .\tsconfig.tests.json

Write-Host "Created tsconfig.tests.json"

Write-Host ""
Write-Host "Project typecheck..."
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Project typecheck failed." }

if (Test-Path .\.tmp\tests) {
    Remove-Item .\.tmp\tests -Recurse -Force
}

Write-Host ""
Write-Host "Compiling tests..."
npx tsc -p .\tsconfig.tests.json
if ($LASTEXITCODE -ne 0) { throw "Test compilation failed." }

Write-Host ""
Write-Host "Running arithmetic tests..."
node .\.tmp\tests\tools\tests\arithmetic-engine.test.js
if ($LASTEXITCODE -ne 0) { throw "Arithmetic tests failed." }

Write-Host ""
Write-Host "=================================="
Write-Host "Phase 3.1A FIX COMPLETE"
Write-Host "=================================="
