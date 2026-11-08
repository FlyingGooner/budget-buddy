# update-rates.ps1 – uppdaterar appens inbyggda valutakurser (DEFAULT_RATES och RATES_DATE i store.js).
# Hämtar ECB:s referenskurser från Frankfurter (api.frankfurter.dev, gratis, ingen nyckel).
# Körs manuellt på datorn – APPEN gör aldrig några anrop; kurserna blir konstanter i koden.
#
#   powershell -ExecutionPolicy Bypass -File tools\update-rates.ps1
#
# Ändrar store.js, höjer patchversionen i version.js och bygger dist/. Committar inte.
# Därefter: ..\tools\check.ps1 budget-buddy, commit, publicera artifacten (se ../CLAUDE.md).

#   -Hook: körs av .git/hooks/pre-commit vid varje commit. Stoppar aldrig committen (fel = bara en rad),
#          höjer bara versionen om den inte redan är höjd i committen, och lägger ändrade filer i committen.

param([switch]$Hook)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
$currencies = 'USD', 'EUR', 'GBP', 'NOK', 'DKK'
$git = 'C:\Program Files\Git\cmd\git.exe'

try { $r = Invoke-RestMethod "https://api.frankfurter.dev/v1/latest?base=SEK&symbols=$($currencies -join ',')" -TimeoutSec 10 }
catch { if ($Hook) { Write-Output "valutakurser: kunde inte hämtas ($($_.Exception.Message)) – committen fortsätter med gamla kurser."; exit 0 } else { throw } }
$date = [string]$r.date
if ($date -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "Oväntat datum i svaret: $date" }
$ore = [ordered]@{}
foreach ($c in $currencies) {
  $v = [double]$r.rates.$c
  if ($v -le 0) { throw "Kurs saknas för $c" }
  $o = [int][Math]::Round(100 / $v)          # öre per 1 enhet
  if ($o -lt 1 -or $o -gt 100000) { throw "Orimlig kurs för ${c}: $o öre" }
  $ore[$c] = $o
}

$storePath = Join-Path $dir 'store.js'
$store = [IO.File]::ReadAllText($storePath, [Text.Encoding]::UTF8)
$ratesLine = 'const DEFAULT_RATES = { ' + (($ore.Keys | ForEach-Object { "${_}: $($ore[$_])" }) -join ', ') + ' };'
$new = [regex]::Replace($store, 'const DEFAULT_RATES = \{[^}]*\};', $ratesLine)
$new = [regex]::Replace($new, "const RATES_DATE = '[^']*';", "const RATES_DATE = '$date';")
if ($new -eq $store) { Write-Output "valutakurser: redan aktuella ($date)."; exit 0 }
[IO.File]::WriteAllText($storePath, $new, $utf8)

$verPath = Join-Path $dir 'version.js'
if ($Hook) {
  $staged = @(& $git -C $dir diff --cached --name-only)
  if ($staged -notcontains 'version.js') {
    $ver = [IO.File]::ReadAllText($verPath, [Text.Encoding]::UTF8)
    $m = [regex]::Match($ver, "APP_VERSION = '(\d+)\.(\d+)\.(\d+)'")
    $next = "$($m.Groups[1].Value).$($m.Groups[2].Value).$([int]$m.Groups[3].Value + 1)"
    [IO.File]::WriteAllText($verPath, $ver.Replace($m.Value, "APP_VERSION = '$next'"), (New-Object Text.UTF8Encoding $true))
  }
  & $git -C $dir add store.js version.js
  Write-Output "valutakurser: uppdaterade till $date och tillagda i committen."
  exit 0
}
$ver = [IO.File]::ReadAllText($verPath, [Text.Encoding]::UTF8)
$m = [regex]::Match($ver, "APP_VERSION = '(\d+)\.(\d+)\.(\d+)'")
$next = "$($m.Groups[1].Value).$($m.Groups[2].Value).$([int]$m.Groups[3].Value + 1)"
[IO.File]::WriteAllText($verPath, $ver.Replace($m.Value, "APP_VERSION = '$next'"), (New-Object Text.UTF8Encoding $true))

Write-Output "Kurser från $date (ECB via Frankfurter), kr per enhet:"
foreach ($c in $ore.Keys) { Write-Output ("  {0}  {1:N2}" -f $c, ($ore[$c] / 100)) }
Write-Output "Version höjd till $next."
& (Join-Path $dir 'tools\build-single.ps1')
Write-Output 'Nästa steg: ..\tools\check.ps1 budget-buddy, commit, publicera artifacten.'
