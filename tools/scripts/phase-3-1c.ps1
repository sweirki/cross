$ErrorActionPreference="Stop"
Set-Location $PSScriptRoot\..
npm install
if($LASTEXITCODE){exit $LASTEXITCODE}
npm run engine:test