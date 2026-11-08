# Regler för projektet "Budget buddy"

Dessa regler gäller för all utveckling i repot (för människor och AI-assistenter).

## Grundprinciper
1. **Samma struktur som övriga projekt i `../`.** Appfilerna ligger i roten (GitHub Pages publicerar därifrån): `index.html` (markup), `styles.css`, `store.js` (localStorage + validering av sparad data), `app.js` (logik och rendering), `version.js`, `sw.js`, `manifest.webmanifest`, `icons/`, `.nojekyll`. Vanliga skript (inga moduler) som laddas i den ordningen. Dokument i `docs/` (`SPEC.md`, `presentation.html`). Inga byggsteg för appen, inga ramverk, ingen `npm`.
2. **Mobil först.** Designa för smal skärm (360–430 px) och touch. Installeras som PWA via GitHub Pages. För `file://` och snabbtest finns testfilen: `powershell -ExecutionPolicy Bypass -File tools\build-single.ps1` bygger `dist/budget-buddy.html` med allt inbakat (git-ignorerad, ändra aldrig i den; kör om efter ändringar). Skriptet är identiskt i alla projekt.
3. **Inga hemligheter i koden.** API-nycklar committas aldrig. Behövs en nyckel matar användaren in den i appen och den sparas i `localStorage`.
4. **Fungera offline.** `sw.js` cachar appens egna filer (cachenamn `bb-<version>`, rör aldrig andra cacher – apparna delar origin på Pages). Data sparas i `localStorage` (nycklar `bb.*`). Ny fil som appen behöver → lägg till i `ASSETS` i `sw.js`.
5. **Specen styr.** Funktioner beskrivs i `docs/SPEC.md` innan de byggs. Ändras beteendet ska specen uppdateras i samma commit.

## Kod
- Vanilla JavaScript (ES2020+), inga externa skript.
- Konfiguration samlas i ett `CONFIG`-objekt överst i `app.js`.
- Tydlig felhantering: visa ett begripligt meddelande, aldrig en blank skärm.
- Extern data och användarinmatning renderas alltid som text (`textContent`), aldrig som HTML.

## Språk och stil
- UI-text på svenska. Kod, variabelnamn och commit-meddelanden på engelska.
- Tema: Material Design 3 enligt den gemensamma stilen i `../CLAUDE.md`, nyckelfärg `#2a6fb0`. Ljust och mörkt tema via `prefers-color-scheme`.

## Arbetsflöde
- `main` är enda grenen. Committa direkt till `main` (se `../CLAUDE.md` om push).
- Höj `self.APP_VERSION` i `version.js` vid varje release (styr även service workerns cache) (semver) och skriv versionen i commit-meddelandet, t.ex. `v0.2.0: Add ...`.
- Säkerhet: följ rutinen i `../CLAUDE.md` (avsnittet Säkerhet). `../tools/check.ps1` säger om agenten `granskning` behövs. Inga nätverksanrop; CSP:n i `index.html` hålls så snäv som möjligt.
- Testa i en mobil viewport innan push.
