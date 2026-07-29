$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $projectRoot

Write-Host ""
Write-Host "Cross Phase 3.2 - Expression Generator Verification"
Write-Host "Project: $projectRoot"
Write-Host ""

Write-Host "[1/3] Installing dependencies..."
npm install

if ($LASTEXITCODE -ne 0) {
    throw "npm install failed with exit code $LASTEXITCODE."
}

Write-Host ""
Write-Host "[2/3] Building engine..."
npm run engine:build

if ($LASTEXITCODE -ne 0) {
    throw "Engine build failed with exit code $LASTEXITCODE."
}

$testFile = Join-Path `
    $projectRoot `
    ".engine-build\tools\tests\expression-generator.test.js"

if (-not (Test-Path -LiteralPath $testFile)) {
    throw "Compiled expression-generator test was not found: $testFile"
}

Write-Host ""
Write-Host "[3/3] Running expression generator tests..."
node $testFile

if ($LASTEXITCODE -ne 0) {
    throw "Expression generator tests failed with exit code $LASTEXITCODE."
}

Write-Host ""
Write-Host "PASS Phase 3.2 expression generator verification completed."