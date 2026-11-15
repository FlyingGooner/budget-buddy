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
# Svenska (MANUAL.md → help:start/end) och engelska (MANUAL.en.md → help-en:start/end), 2026-11-15. Blocket som inte
# hör till valt språk döljs med CSS (html[lang]); data-no-tr hindrar i18n.js från att röra texten.
$enc = { param($t) (($t -replace '\*\*', '').Trim()).Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;') }
$idxPath = Join-Path $root 'index.html'
$idx = [IO.File]::ReadAllText($idxPath, [Text.Encoding]::UTF8)
$orig = $idx
foreach ($l in @(@{ file = 'MANUAL.md'; tag = 'help'; title = 'Hjälp'; lang = 'sv' }, @{ file = 'MANUAL.en.md'; tag = 'help-en'; title = 'Help'; lang = 'en' })) {
  $md = [IO.File]::ReadAllLines((Join-Path $root ('docs\' + $l.file)), [Text.Encoding]::UTF8)
  $out = New-Object System.Collections.Generic.List[string]
  $out.Add("      <div class=`"card help`" lang=`"$($l.lang)`" data-no-tr>")
  $out.Add("        <h2>$($l.title)</h2>")
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
  $re = '(?s)(<!-- ' + $l.tag + ':start[^>]*-->\r?\n).*?(\r?\n\s*<!-- ' + $l.tag + ':end -->)'
  if ($idx -notmatch $re) {
    if ($l.tag -eq 'help') { throw 'Hittar inte <!-- help:start --> i index.html' }
    $idx = $idx.Replace('<!-- help:end -->', "<!-- help:end -->`n      <!-- help-en:start – byggs från docs/MANUAL.en.md med tools/build-help.ps1, ändra inte här -->`n`n      <!-- help-en:end -->")
  }
  $idx = [regex]::Replace($idx, $re, { param($m) $m.Groups[1].Value + ($out -join "`n") + $m.Groups[2].Value })
}
if ($idx -ne $orig) { [IO.File]::WriteAllText($idxPath, $idx, $utf8); 'Hjälp uppdaterad från docs/MANUAL.md och MANUAL.en.md' } else { 'Hjälp oförändrad' }
