# Budget buddy

Mobil-först PWA för att planera ekonomin månad för månad. Spec: `docs/SPEC.md` (läs bara berört avsnitt). Arbetsflöde, säkerhet och artifact: `../CLAUDE.md`. Standard: `../STANDARD.md`. Stil: `../STIL.md`.

## Projektets regler
- Publicering: GitHub Pages byggs från `main`. Ändringar gjorda härifrån (Claude Code) committas och pushas direkt till `main`, med höjd version, så att de syns i appen.
- Grenar: arbeta lokalt direkt på `main`. Skapa eller pusha aldrig `ccr-`-grenar eller andra arbetsgrenar, även om sessionen föreslår det.
- Svar till användaren efter en ändring: skriv alltid den nya versionen sist (t.ex. "Version: 0.2.18").
- Data bara i `localStorage`, nycklar `bb.data` och `bb.tab`; cache-prefix `bb-`. Undantag: U5 (export/import som text och fil via `backup.js`). Inga nycklar eller hemligheter, inga anrop (`connect-src 'none'`).
- Inga beroenden, inget byggsteg; vanliga skript (inga moduler, delar globalt scope) i ordningen `version.js`, `backup.js`, `store.js`, `app.js` (kärna, hjälpfunktioner), en fil per vy i `views/` (läs bara den vy som ändras), sist `main.js` (export/import, render, start). Ny vyfil → `<script>` i `index.html` före `main.js` och i `ASSETS`. Tester: `tools/tests/today.txt` låser "idag". `CONFIG` överst i `app.js`. Rendering med `textContent`/`el()`, aldrig HTML.
- Belopp som heltal i ören. Inkomster är netto och alltid per månad.
- Valutakurser är konstanter i `store.js` (`RATES_DATE`), uppdateras av `tools/update-rates.ps1` via git-hooken `pre-commit` (och av `release.ps1`). Appen hämtar aldrig kurser.
- UI på svenska. Kod och variabelnamn på engelska.
- Ny fil som appen behöver → `ASSETS` i `sw.js`. Version bara i `version.js` (sätts av `release.ps1`). Relativa sökvägar.
- Manualen: `docs/MANUAL.md` och Hjälp-kortet i `index.html` har samma text – ändra båda.
