# Budget buddy – specifikation

## Idé
En app för att planera sin ekonomi månad för månad. Man lägger in inkomster och återkommande kostnader (räkningar, abonnemang, lån) en gång, och lägger till engångsavvikelser på den månad de inträffar (t.ex. nya däck). Appen visar vad som blir kvar varje månad – bakåt och framåt. Ingen spårning av vardagsköp som mat.

## Mål
- Se direkt om en månad går ihop: inkomster − kostnader = **kvar**.
- Lägga in återkommande poster en gång och låta dem fylla månaderna själva – även de som inte kommer varje månad (bilförsäkring en gång om året, kvartalsräkningar).
- Lägga till en avvikelse på en viss månad med några tryck (nya däck, tandläkare, bonus, skatteåterbäring).
- Kunna ändra beloppet för en återkommande post en enskild månad (högre elräkning i januari) utan att ändra posten för alla månader.
- Planera framåt: se kommande månader och var det blir tight.
- Fungera lika bra på mobilen som på datorn.

## Icke-mål
- Inget konto, ingen server, ingen spårning.
- Ingen bankkoppling och ingen import från bank (v1).
- Ingen loggning av vardagsköp (mat, kaffe, småköp) – vill man kan "Hushåll/mat" läggas in som en fast månadssumma.
- Ingen skatteberäkning: appen räknar inte om bruttolön till netto. Inkomster fylls i efter skatt.
- Inga flera valutor – bara kronor.
- Ingen delning mellan personer/enheter (v1).

## Begrepp
| Begrepp | Betydelse |
|---|---|
| **Månad** | En kalendermånad, `YYYY-MM`. Appen visar alltid en månad i taget. |
| **Återkommande post** | Inkomst eller kostnad som upprepas. **Inkomster är alltid per månad.** Kostnader kan komma varje månad, varannan månad, varje kvartal eller en gång om året. Har startmånad och valfri slutmånad. T.ex. lön, hyra, el, bilförsäkring (årlig i mars). |
| **Avvikelse** | Engångspost som bara gäller en månad – kostnad eller inkomst. T.ex. nya däck, bonus. |
| **Justering** | Ändrat belopp för en återkommande post en enskild månad. Posten själv ändras inte. |
| **Kategori** | Typad grupp. **Inkomstkategorier:** Lön, Försäkringskassan, Barnbidrag, Pension, Övrig inkomst. **Kostnadskategorier:** Boende, Transport, Försäkring, Abonnemang, Lån, Hushåll, Övrigt. Båda listorna är redigerbara i Inställningar; "Övrig inkomst" och "Övrigt" finns alltid. |
| **Person** | Valfritt. Personer i hushållet (max 10). Varje inkomst/kostnad kan kopplas till en person eller vara **Gemensamt**. Personvalet finns alltid i formulären (valfritt); **standard är Gemensamt**. |
| **Nettoinkomst** | Det som faktiskt kommer in på kontot – lön **efter skatt** (nettolön enligt lönebeskedet), bidrag, ersättningar. Alla inkomster i appen är netto. |
| **Kvar** | Inkomster − kostnader för en månad. Positivt = över, negativt = underskott. |

## Skärmar

### Månad (start)
Visar aktuell månad. Runda ◀ ▶-knappar och svep var som helst på skärmen (inte i menyn, fält eller dialoger) byter månad; tryck på månadsnamnet för att gå till innevarande månad. Samma stil som dag-bläddringen i follow-diet-tracker.
```
┌──────────────────────────────┐
│ Budget buddy          v0.1.0 │
│  ◀   November 2026   ▶       │
│ ┌──────────────────────────┐ │
│ │ KVAR                     │ │
│ │ +3 450 kr                │ │
│ │ In 32 000 · Ut 28 550    │ │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░      │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ INKOMSTER       32 000   │ │
│ │ Lön             32 000 ↻ │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ KOSTNADER                │ │
│ │ ☑ Hyra           9 800 ↻ │ │
│ │ ☐ El             1 200 ↻✎│ │
│ │ ☐ Bilförsäkring  4 300 ↻ │ │
│ │ ☐ Nya däck       6 500 ★ │ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│         ( + Avvikelse )      │
├──────────────────────────────┤
│ ▣ Månad ▤ Översikt ↻ Poster ⚙│
└──────────────────────────────┘
↻ återkommande  ✎ justerad denna månad  ★ avvikelse
```
- När personer finns visar Kvar-kortet en tabell per person (In / Ut / Kvar) och Gemensamt.
- Tryck på en rad: ändra belopp för just den här månaden (justering), eller – för avvikelser – redigera/ta bort.
- "+ Avvikelse": namn, belopp, kostnad/inkomst, kategori (månad = den som visas).

### Översikt
12 månader framåt från vald startmånad (standard: innevarande).
```
┌──────────────────────────────┐
│ ÖVERSIKT 2026–2027           │
│ Nov  ▓▓▓▓▓▓▓▓░░   +3 450     │
│ Dec  ▓▓▓▓▓▓▓▓▓▓   +1 200     │
│ Jan  ▓▓▓▓▓▓▓▓▓▓▓! −2 100     │
│ Feb  ▓▓▓▓▓▓▓░░░   +4 800     │
│ …                            │
│ Summa 12 mån      +18 300    │
└──────────────────────────────┘
```
- Underskott markeras med `--error`. Tryck på en månad → öppnar den i Månad.
- Valfritt startsaldo i Inställningar → visar även löpande saldo per månad.

### Sparande
Kostnadskategorin **Sparande** (id `savings`, standard sedan v0.5.0) är pengar som flyttas till sparande. Den räknas som kostnad (lämnar kontot, minskar Kvar) men visas separat: "Varav sparande" i Kvar-kortet och sparkvot/sparat i Statistik. Äldre sparade kategorilistor får den en gång (`settings.catsV` = 2); tas den bort kommer den inte tillbaka.

### Statistik
Följer månaden som är vald i Månad (samma ◀ ▶ och svep).
- **Sparkonton** (v0.7.0): kort där man fyller i vad som står på sina sparkonton (t.ex. Buffert, ISK). Varje konto visar saldot för vald månad (senast ifyllda saldo till och med den månaden) och förändringen mot närmast föregående ifyllda saldo. Överst summan för alla konton. Tryck på ett konto → dialog "Saldo i <månad>" med belopp, Spara och Ta bort konto (ångra-snackbar). "+ Nytt konto" (namn) längst ner. Ett saldo per konto och månad; fyller man i igen samma månad ersätts det. Under listan staplar med totalt sparsaldo de 12 månaderna fram till vald månad (samma SVG-teknik som In och ut). Tomt läge: "Inga sparkonton än – lägg till det första". Saldona påverkar inte Kvar eller kontosaldot – de är en egen uppföljning.
- **Valuta på sparkonton** (v0.8.0): varje konto har en valuta (SEK, USD, EUR, GBP, NOK, DKK) som väljs i saldodialogen. Saldot visas i kontots valuta med "≈ X kr" under; summan och staplarna räknas om till kronor ("≈" när något konto är i utländsk valuta). Under listan: "Omräknat till kronor: Riksbankens mittkurser 6 nov 2026" (eller "Egna kurser från <datum>"). Inställningar → kortet **Valutakurser**: kr per 1 enhet för varje valuta, förifyllt med Riksbankens mittkurser från `RATES_DATE` (inskrivna för hand vid bygget), Spara gör dem till egna kurser med dagens datum, "Använd appens kurser" återställer.
- **Nyckeltal** (rutor som Vecka i follow-diet-tracker): kvar av inkomst, sparkvot (sparande av inkomst), snitt kvar per månad (de 12 senaste månaderna med poster, hela kronor), största kostnaden, sparat 12 mån och sparat den här månaden.
- **Kostnader per kategori:** staplar, störst först.
- **In och ut, 12 månader:** inline-SVG med staplar för inkomster och kostnader fram till vald månad (vald månad markerad). Ritas med DOM (createElementNS), ingen markup-sträng, inget bibliotek.

### Poster
Två separata kort: **Inkomster** och **Kostnader**, var och en med sin lista och ett eget kort formulär.
```
┌──────────────────────────────┐
│ INKOMSTER        32 000/mån  │
│ Lön              32 000 kr   │
│ ──────────────────────────── │
│ Kategori [Lön ▾] Efter skatt │
│          [ 32 000 ]          │
│        ( Lägg till )         │
└──────────────────────────────┘
┌──────────────────────────────┐
│ KOSTNADER        18 400/mån  │
│ Hyra · Boende     9 800 kr   │
│ Bilförsäkring · år 4 300 kr  │
│ ──────────────────────────── │
│ Ny kostnad [t.ex. Hyra     ] │
│ Belopp [   ] Kategori [▾]    │
│ Hur ofta [▾]  ( Lägg till )  │
└──────────────────────────────┘
```
- **Inkomster fylls i som netto** (efter skatt, det som kommer in på kontot). Formuläret säger det tydligt: etiketten "Belopp efter skatt (kr)" och en hjälprad under.
- **Lägg till inkomst:** två kolumner – kategori (Lön, Barnbidrag …) och belopp efter skatt, plus person om personer finns. Kategorin blir postens namn (kan ändras i Ändra-dialogen) – **alltid per månad**, inget val för hur ofta. Engångsinkomster (bonus, skatteåterbäring) läggs som avvikelse i Månad. **Lägg till kostnad:** namn, belopp, kategori, hur ofta (och person). Posten gäller från den månad som visas i Månad.
- Tryck på en post → dialog **Ändra**: namn, belopp, hur ofta och kategori (bara kostnad), från-/till-månad, Ta bort (med ångra).
- Avsluta en post (sätt till-månad) i stället för att radera, så att historiken finns kvar.
- Kortrubriken visar summan per månad för poster som kommer varje månad.

### Inställningar
- Personer (lägg till, byt namn, ta bort – med ångra).
- Inkomstkategorier och kostnadskategorier, var för sig (lägg till, byt namn, ta bort).
- Startsaldo och från vilken månad.
- Rensa all data (med bekräftelse).
- Om appen + versionsnummer. Text om att data bara finns på enheten och att det inte finns backup (än).
- Egen "Installera"-knapp när `beforeinstallprompt` finns.

### Layout: mobil, surfplatta, dator
- **Mobil (< 600 px):** en kolumn, bottenmeny som i follow-diet-tracker (emoji-ikoner, fylld markering, fet etikett): Månad, Översikt, Statistik, Poster, Inst. Svep byter månad (Översikt: år).
- **Surfplatta (600–839 px, iPad stående):** sidomeny (navigation rail), en kolumn max 640 px centrerad. Pilar och svep byter månad.
- **Dator (≥ 840 px, även iPad liggande):** Månad och Översikt sida vid sida (månaden till vänster, 12-månadersöversikten till höger; klick i översikten byter månad). Poster: Inkomster till vänster, Kostnader till höger, formuläret kompakt i botten av varje kort. Långa listor skrollar inne i sitt kort. Inmatning kompakt (namn, belopp och knapp på samma rad).

## Datamodell

Att bocka av räkningar som betalda (`paid`) togs bort i v0.6.0 – appen visar bara att kostnaderna finns. Gammal `paid`-data ignoreras vid inläsning och försvinner vid nästa sparning.
Allt i `localStorage` under nyckeln `bb.data`. Belopp lagras som **heltal i ören** (inga flyttal). Månader som `"YYYY-MM"`.

```json
{
  "version": 1,
  "settings": {
    "categories": [{ "id": "salary", "name": "Lön", "type": "income" }, { "id": "home", "name": "Boende", "type": "expense" }],
    "people": [{ "id": "p1", "name": "Anna" }],
    "startBalance": 0,
    "startMonth": "2026-11"
  },
  "recurring": [
    { "id": "r1", "name": "Lön", "type": "income", "amount": 3200000,
      "category": "salary", "person": "p1", "every": 1, "start": "2026-01", "end": null },
    { "id": "r2", "name": "Bilförsäkring", "type": "expense", "amount": 430000,
      "category": "insurance", "every": 12, "start": "2026-03", "end": null }
  ],
  "oneOffs": [
    { "id": "o1", "month": "2026-11", "name": "Nya däck", "type": "expense",
      "amount": 650000, "category": "transport" }
  ],
  "adjustments": { "2027-01": { "r3": 210000 } },
  "accounts": [
    { "id": "a1", "name": "Buffert", "balances": { "2026-10": 4000000, "2026-11": 4500000 } }
  ]
}
```

| Nyckel | Innehåll |
|---|---|
| `bb.data` | Hela datan ovan |
| `bb.tab` | Senast öppnade flik |

- `every`: 1 = varje månad, 2 = varannan, 3 = kvartal, 12 = år. Inkomster har alltid `every: 1` (`store.js` tvingar det). En post gäller månad `m` om `start ≤ m ≤ end` och antalet månader sedan `start` är jämnt delbart med `every`.
- `adjustments[månad][postId]` ersätter beloppet den månaden. `0` = posten utgår den månaden.
- Kategorier har `type` (`income`/`expense`); en post får bara ha en kategori av sin egen typ, annars "Övrig inkomst"/"Övrigt". Borttagen kategori: poster flyttas dit.
- `person`: id i `settings.people` eller `null` (= Gemensamt). Borttagen person: posterna blir gemensamma.
- `accounts` (v0.7.0): sparkonton, max 20. `balances[månad]` = saldo i ören (heltal 0–100 000 000 kr), ett per månad, max 600 per konto. Valideras i `store.js` som övrig data (giltigt id, namn ≤ 30 tecken, giltiga månader); äldre data utan `accounts` får en tom lista.
- `accounts[].currency` (v0.8.0): en av `CURRENCIES`, annars `SEK`; saldon i valutans minsta enhet (cent/öre). `settings.rates` (öre per enhet, heltal 1–100 000), `settings.ratesDate` (`ÅÅÅÅ-MM-DD`), `settings.ratesOwn` (bool). Egna kurser behålls bara om `ratesOwn` är `true` och allt validerar; annars gäller appens inbyggda kurser (som blir nyare vid uppdatering).
- All sparad data valideras i `store.js` innan den används (typer, belopp heltal inom rimligt intervall, giltiga månader, kända id:n). Trasig data ger standardvärden, aldrig blank skärm.
- Vid ny `version` körs en migreringsfunktion.

## Datakälla och uppdatering
- **Ingen.** Appen gör inga nätverksanrop – allt skrivs in av användaren och sparas bara i `localStorage` på enheten (`connect-src 'none'`).
- Beräkningar görs vid varje visning; inga timers i bakgrunden.

### Integritet och säkerhet
- Ekonomiska uppgifter är känsliga – de lämnar aldrig enheten.
- CSP: arbetsytans grund-CSP med `connect-src 'none'` och `require-trusted-types-for 'script'`. Inga undantag.
- `no-referrer`. All inmatning renderas med `textContent`/`el()`, aldrig `innerHTML`.
- Inga hemligheter i koden.
- Sparkonton (v0.7.0) sparas i samma `bb.data` i `localStorage` – ingen ny nyckel, ingen ny lagringsteknik, inget undantag. Kontonamn renderas med `textContent`/`el()`, staplarna med `createElementNS`. Saldona går genom `loadData()` innan de används.
- Valutakurser (v0.8.0): **hämtas aldrig** – de är konstanter i `store.js` eller skrivs in av användaren. Inga anrop, ingen ny nyckel (samma `bb.data`), inget undantag.
- `docs/presentation.html` har CSS och JS i egna filer, utan `'unsafe-inline'` och utan `style`-attribut.
- Arbetsytans agent `granskning` bestämmer över säkerheten.
- **Ingen backup i v1:** rensas webbplatsdata försvinner allt. Det sägs tydligt i Inställningar (se Framtida idéer: export).

## PWA-krav
- `manifest.webmanifest` med ikoner 192/512 (any + maskable), `display: standalone`.
- `sw.js` cachar appens filer under `bb-<version>`, svarar bara på GET från egen origin och raderar bara egna cacher.
- Fungerar offline efter första besöket.
- Versionsnummer i `version.js` visas uppe till höger och styr cachenamnet.
- Testfil för `file://`: `dist/budget-buddy.html`, byggs med `tools/build-single.ps1`.

## Design
Material Design 3 enligt `../CLAUDE.md`. Nyckelfärg blå `#2a6fb0`. Bottenmeny < 600 px, navigation rail 600–839 px, två kolumner ≥ 840 px.
- Belopp med tabellsiffror (`tabular-nums`), högerjusterade, tusentalsavgränsare med mellanslag ("32 000 kr"). Inmatning tillåter både komma och punkt som decimaltecken.
- "Kvar" stort i kortet överst: grön ton vid överskott, `--error` vid underskott.
- Markeringar för återkommande (↻), justerad (✎) och avvikelse (★), så att man ser varför en månad avviker.

## Acceptanskriterier
- [ ] Lägga in lön och fem räkningar på under två minuter.
- [ ] En årlig post (`every: 12`) syns bara i rätt månad.
- [ ] En avvikelse i november påverkar bara november.
- [ ] Justering av el i januari ändrar bara januari.
- [ ] Översikten visar 12 månader och markerar underskott.
- [ ] Belopp räknas i ören utan avrundningsfel (0,10 + 0,20 = 0,30).
- [ ] Trasig data i `localStorage` ger standardvärden, inte blank skärm.
- [ ] Installerbar som PWA på Android och iPhone.
- [ ] Fungerar offline.
- [ ] Ljust och mörkt tema.
- [ ] Layout fungerar på 390 px (mobil), 820 px (iPad stående) och 1280 px (dator).
- [ ] Sparkonto: saldo för två månader visar förändring och summa; nytt saldo samma månad ersätter det gamla; ta bort konto går att ångra.
- [ ] `granskning` utan anmärkning.

## Framtida idéer
- **Export och import av data** (backup och flytt mellan enheter):
  - **JSON** – hela datan, för backup och återställning i appen.
  - **CSV** – månader och poster, för att öppna i Excel eller Google Kalkylark.
  - Export via nedladdning (`Blob` + `a[download]`), import via filväljare (`<input type="file">` + `FileReader`). Fortfarande inga nätverksanrop.
  - **Säkerhet:** filinläsning och nedladdning ligger utanför arbetsytans grund (bara `localStorage`). Kräver ett godkänt undantag (U4) i `granskning` innan det byggs. En importerad fil är opålitlig data och ska gå genom samma validering som `store.js`.
  - **Förhandsprövad 2026-11-08: Tillstyrkt med villkor** (inte godkänd av användaren, inte byggd). CSP:n behöver inte ändras och `connect-src 'none'` står kvar. Förslaget nedan läggs in i `granskning.md` och `tools/check.ps1` först när användaren godkänt det.
    - *Föreslagen U4 – Export och import via fil.* Tillåter export (JSON + CSV) via `Blob` + `URL.createObjectURL` + `<a download>` och import av JSON via `<input type="file" accept=".json,application/json">` + `FileReader`/`file.text()`.
    - Bara på användarens knapptryck i Inställningar. Inget automatiskt, ingen Web Share API, `showSaveFilePicker`/`showOpenFilePicker` eller drag-och-släpp.
    - Export: bara data som `loadData()` godkänner, rätt MIME-typ (`application/json`, `text/csv;charset=utf-8`), `revokeObjectURL` direkt efter nedladdning, en kort text om att filen innehåller känslig ekonomidata.
    - CSV: alla fält citeras och `"` dubbleras. Textfält som börjar med `=`, `+`, `-`, `@`, tab eller CR får `'` först (skydd mot formelinjektion i Excel).
    - Import: bara JSON, inte CSV. Filer över 5 MB avvisas före läsning. `JSON.parse` i try, resultatet går *bara* genom `loadData()` – aldrig direkt till `localStorage` eller rendering. Fel ger en kort text i `#status` och befintlig data lämnas orörd.
    - Innan något skrivs över: `<dialog>` som visar vad filen innehåller (antal poster, månader), och ångra-snackbar som återställer tidigare data.
    - Importerad data renderas som all annan data (`textContent`/`el()`), aldrig i `href`, `src` eller CSS.
    - Föreslagen tabellrad: `budget-buddy | bb- (cache), bb. (data) | U4 | Inga anrop: connect-src 'none'. Ekonomidata lämnar bara enheten som fil när användaren själv exporterar (U4). Import valideras via loadData().`
    - Vid bygge: uppdatera även undantagstabellen i `tools/check.ps1` och avsnittet Integritet och säkerhet ovan, och kör efterkontroll.
- Sparmål (t.ex. "semester 15 000 kr till juni") som visas i översikten.
- Diagram per kategori (vart pengarna går).

- Mall för återkommande avvikelser / kopiera från förra månaden.
