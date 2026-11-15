# Budget buddy

Mobil-först PWA för att planera ekonomin månad för månad. Spec: `docs/SPEC.md` (läs bara berört avsnitt). Arbetsflöde, säkerhet och artifact: `../CLAUDE.md`. Standard: `../STANDARD.md`. Stil: `../STIL.md`.

## Projektets regler
- Publicering: GitHub Pages byggs från `main`. Ändringar gjorda härifrån (Claude Code) committas och pushas direkt till `main`, med höjd version, så att de syns i appen.
- Grenar: arbeta lokalt direkt på `main`. Skapa eller pusha aldrig `ccr-`-grenar eller andra arbetsgrenar, även om sessionen föreslår det.
- Svar till användaren efter en ändring: skriv alltid den nya versionen sist (t.ex. "Version: 0.2.18").
- Data bara i `localStorage`, nycklar `bb.data` och `bb.tab`; cache-prefix `bb-`. Undantag: U5 (export/import som text och fil via `backup.js`). Inga nycklar eller hemligheter, inga anrop (`connect-src 'none'`).
- Inga beroenden, inget byggsteg; vanliga skript (inga moduler, delar globalt scope) i ordningen `version.js`, `backup.js`, `nav.js`, `store.js`, `app.js` (kärna, hjälpfunktioner), en fil per vy i `views/` (läs bara den vy som ändras), sist `main.js` (export/import, render, start). Ny vyfil → `<script>` i `index.html` före `main.js` och i `ASSETS`. Tester: `tools/tests/today.txt` låser "idag". `CONFIG` överst i `app.js`. Rendering med `textContent`/`el()`, aldrig HTML.
- Belopp som heltal i ören. Inkomster är netto och alltid per månad.
- Valutakurser är konstanter i `store.js` (`RATES_DATE`), uppdateras av `tools/update-rates.ps1` via git-hooken `pre-commit` (och av `release.ps1`). Appen hämtar aldrig kurser.
- Språk (2026-11-15): källtexten i koden är svenska; `i18n.js` (samma fil i alla appar, vanligt skript, laddas först) översätter allt som ritas med ordlistan i `i18n-en.js` (nyckel = svensk text, mönster för texter med tal). Ny text i UI → lägg till den i `i18n-en.js`. Valt språk i `bb.lang`, väljs i välkomstrutan och under Inställningar → Språk och valuta. Manualen finns också på engelska (`docs/MANUAL.en.md` → `help-en:start/end`).
- Hemvaluta (2026-11-15): `data.settings.home` (SEK, EUR, USD, GBP, NOK, DKK). Alla belopp utom sparkonton är i hemvalutan; byte räknar om med `changeHome()` i `store.js` (Ångra). Tal skrivs alltid på svenskt sätt, bara enheten (`unit()` i `app.js`) byts.
- UI på svenska (källa) och engelska. Kod och variabelnamn på engelska.
- Ny fil som appen behöver → `ASSETS` i `sw.js`. Version bara i `version.js` (sätts av `release.ps1`). Relativa sökvägar.
- Manualen: skriv bara i `docs/MANUAL.md`; Hjälp i `index.html` (mellan `help:start`/`help:end`) byggs från den med `tools/build-help.ps1`.
- Bakåt: flikbyte = `pushState`; varje lager (öppen `<dialog>` med id, markeringsläget) är ett steg via `nav.js` (`layerOpened`/`layerClosed` i `app.js`; dialoger fångas automatiskt). Test i `tools/tests/nav.node.mjs`.
- Papperskorg: borttagna poster, avvikelser och sparkonton → `data.trash` (`trashItems`/`restoreItem`/`purgeTrash` i `store.js`), 30 dagar, inte i exporten.
- Tester: `tools\test.ps1` (Node: `unit.test.js` via `tools/node-unit.mjs`, och `*.node.mjs`); `ui.test.js` i Edge.
