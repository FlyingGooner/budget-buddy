<#
.SYNOPSIS
  Bygger Hjälp-kortet i index.html (mellan <!-- help:start --> och <!-- help:end -->) från docs/MANUAL.md, så att texten
  bara skrivs en gång (som i Stress kontroll och simple-nutrition).
.DESCRIPTION
  "## Rubrik" -> <details><summary>, "- text" och vanliga rader -> <p>, "![alt](manual/x.png)" -> <img class="shot">.
  **fetstil** tas bort. All text HTML-kodas. Ändrar bara kortet i index.html. Inga nätverksanrop.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\build-help.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
$md = [IO.File]::ReadAllLines((Join-Path $root 'docs\MANUAL.md'), [Text.Encoding]::UTF8)
$enc = { param($t) (($t -replace '\*\*', '').Trim()).Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;') }

$out = New-Object System.Collections.Generic.List[string]
$out.Add('      <div class="card help">')
$out.Add('        <h2>Hjälp</h2>')
$open = $false
foreach ($line in $md) {
  if ($line -match '^## (.+)$') {
    if ($open) { $out.Add('        </details>') }
    $out.Add("        <details><summary>$(& $enc $Matches[1])</summary>")
    $open = $true; continue
  }
  if (-not $open -or -not $line.Trim()) { continue }
  if ($line -match '^\s*!\[([^\]]*)\]\((manual/[a-z0-9-]+\.png)\)\s*$') {
    $out.Add("          <img class=`"shot`" src=`"docs/$($Matches[2])`" alt=`"$(& $enc $Matches[1])`" width=`"390`" loading=`"lazy`">"); continue
  }
  $out.Add("          <p>$(& $enc ($line -replace '^\s*-\s+', ''))</p>")
}
if ($open) { $out.Add('        </details>') }
$out.Add('      </div>')

$idxPath = Join-Path $root 'index.html'
$idx = [IO.File]::ReadAllText($idxPath, [Text.Encoding]::UTF8)
$re = '(?s)(<!-- help:start[^>]*-->\r?\n).*?(\r?\n\s*<!-- help:end -->)'
if ($idx -notmatch $re) { throw 'Hittar inte <!-- help:start --> i index.html' }
$new = [regex]::Replace($idx, $re, { param($m) $m.Groups[1].Value + ($out -join "`n") + $m.Groups[2].Value })
if ($new -ne $idx) { [IO.File]::WriteAllText($idxPath, $new, $utf8); 'Hjälp uppdaterad från docs/MANUAL.md' } else { 'Hjälp oförändrad' }
