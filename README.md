<div align="center">

<img src="icons/icon-192.png" width="88" alt="Budget buddy-ikon">

# Budget buddy

**Planera ekonomin månad för månad – inkomster, räkningar och det oväntade.**

### [▶ Öppna appen](https://flyinggooner.github.io/Budget-buddy/)

[📱 Presentation av appen](https://flyinggooner.github.io/Budget-buddy/docs/presentation.html)

</div>

<p align="center">
  <img src="docs/screenshots/month.png" width="200" alt="Månad-vyn">
  <img src="docs/screenshots/overview.png" width="200" alt="Översikt-vyn">
<img src="docs/screenshots/stats.png" width="200" alt="Statistik-vyn">
  <img src="docs/screenshots/items.png" width="200" alt="Poster-vyn">
  <img src="docs/screenshots/month-dark.png" width="200" alt="Månad-vyn i mörkt tema">
</p>

<p align="center"><img src="docs/screenshots/desktop.png" width="820" alt="Månad på dator: månaden och kommande 12 månader sida vid sida"></p>

<p align="center"><sub>Skärmbilderna visar påhittad exempeldata.</sub></p>

## Varför?

De flesta budgetappar vill att du loggar varje köp. Budget buddy gör tvärtom: du lägger in inkomster och fasta räkningar en gång, och fyller bara i avvikelserna – nya däck, en tandläkarräkning – på den månad de hör till. Då ser du direkt hur varje månad går ihop, även månader framåt.

## Funktioner

| | |
|---|---|
| 📅 **Månad** | Vad som är kvar efter månadens kostnader – och hur mycket du sparar. |
| 🔁 **Fasta poster** | Lön och räkningar läggs in en gång – varje månad, varannan, kvartal eller år. |
| ✏️ **Avvikelser** | Nya däck eller en tandläkarräkning läggs på den månad den hör till. Ett belopp kan ändras för bara en månad. |
| 📈 **Översikt** | Kommande 12 månader och saldot efter varje månad. |
| 📊 **Statistik** | Nyckeltal, sparkvot, kostnader per kategori och in/ut de senaste 12 månaderna. |
| 🐷 **Sparande** | Kategorin Sparande visas separat: "varav sparande" och hur mycket du sparat. |
| 👥 **Personer** | Valfritt: vem en post hör till, eller Gemensamt, med en tabell per person. |
| ↩️ **Ångra** | Borttagna poster kan ångras i några sekunder. |
| 📴 **Offline** | Fungerar utan nät efter första besöket. |
| 🌗 **Tema** | Ljust och mörkt, följer telefonens inställning. |

## Integritet 🔒

- **Inget konto, inga cookies.** Allt sparas bara i din webbläsare (`localStorage`).
- **Inget utifrån.** Ingen analys, inga annonser, inga typsnitt eller skript utifrån – spärras även tekniskt med en Content Security Policy.

## Installera på mobilen

**Android (Chrome)**
1. Öppna [appen](https://flyinggooner.github.io/Budget-buddy/) i Chrome.
2. Tryck på menyn **⋮** → **Installera app** (eller *Lägg till på startskärmen*).

**iPhone (Safari)**
1. Öppna [appen](https://flyinggooner.github.io/Budget-buddy/) i Safari.
2. Tryck på **Dela** → **Lägg till på hemskärmen**.

Versionsnumret syns uppe till höger i appen. Nya versioner hämtas automatiskt.

## För utvecklare

Ren HTML, CSS och JavaScript – inga ramverk, inga beroenden, inget byggsteg för appen.

**Köra lokalt:** servera mappen statiskt, t.ex. `python3 -m http.server 8080`, och öppna http://localhost:8080 (service workern kräver `localhost` eller HTTPS).

**Testfil:** `tools\build-single.ps1` bakar ihop appen till en enda fil, `dist/budget-buddy.html`, som går att öppna direkt i webbläsaren eller skicka till någon.

| Fil | Innehåll |
|---|---|
| `index.html` | Appens markup |
| `styles.css`, `app.js` | Stil och logik |
| `store.js` | Lagring i `localStorage` och validering av sparad data |
| `version.js` | Versionsnummer (enda källan) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation som app (PWA) och offline |
| `docs/SPEC.md` | Specifikation av funktioner och beteende |
| `docs/presentation.html` | Fristående mobilpresentation av appen |
| `tools/build-single.ps1` | Bygger testfilen |
| `CLAUDE.md` | Regler för utveckling |

Publiceras till GitHub Pages från `main`.
