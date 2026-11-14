<#
  Runs the tests. Node is needed (node in PATH).
    tools\test.ps1          Node tests: unit.test.js (store.js) and every *.node.mjs (node:test)
    tools\test.ps1 ui       also builds the test build (build-single.ps1) for ui.test.js in Edge
#>
param([string]$Mode = '')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $failed = $false
  node tools/node-unit.mjs tools/tests/unit.test.js
  if ($LASTEXITCODE -ne 0) { $failed = $true }
  $nodeTests = Get-ChildItem tools/tests -Filter *.node.mjs | ForEach-Object { $_.FullName }
  if ($nodeTests) { node --test @nodeTests; if ($LASTEXITCODE -ne 0) { $failed = $true } }
  if ($Mode -eq 'ui') {
    & (Join-Path $PSScriptRoot 'build-single.ps1') -Root $root
    Write-Host 'Testbygget finns i dist\. Öppna det i Edge med ui.test.js (today.txt låser idag, ui-seed.json är testdata).'
  }
  if ($failed) { Write-Host 'Tester misslyckades.' -ForegroundColor Red; exit 1 }
  Write-Host 'Alla Node-tester gick igenom.' -ForegroundColor Green
} finally { Pop-Location }
