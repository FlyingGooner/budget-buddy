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
- Budgeten räknas bara i kronor. (Sparkonton kan ha utländsk valuta sedan v0.8.0 och räknas om till kronor, se Statistik.)
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
│ Budget buddy         v0.11.x │
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
│ │ Hyra             9 800 ↻ │ │
│ │ El               1 200 ↻✎│ │
│ │ Bilförsäkring    4 300 ↻ │ │
│ │ Nya däck         6 500 ★ │ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│         ( + Avvikelse )      │
├──────────────────────────────┤
│ Månad Översikt Stat. Poster ⚙│
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
- **Valuta på sparkonton** (v0.8.0): varje konto har en valuta (SEK, USD, EUR, GBP, NOK, DKK) som väljs i saldodialogen. Saldot visas i kontots valuta med "≈ X kr" under; summan och staplarna räknas om till kronor ("≈" när något konto är i utländsk valuta). Under listan: "Omräknat till kronor: ECB:s referenskurser <datum>" (eller "Egna kurser från <datum>"). Inställningar → kortet **Valutakurser**: kr per 1 enhet för varje valuta, förifyllt med ECB:s referenskurser från `RATES_DATE` (skrivs in av `tools/update-rates.ps1`, som git-hooken `pre-commit` kör vid varje commit), Spara gör dem till egna kurser med dagens datum, "Använd appens kurser" återställer.
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
- Valutakurser för sparkonton (se Statistik).
- **Data:** Spara backup-fil, Läs in backup-fil, "Klistra in text" (import av inklistrad text; textexporten borttagen 2026-11-11) och sist **Radera all data** (v0.11.1, flyttad från kortet App): bekräftelsedialog som föreslår en backup-fil först, därefter snackbar "All data är raderad". Raderingen körs på klicket på Radera (`#cd-ok`), inte på dialogens `close`-händelse.
- App: text om att data bara finns på enheten och att man ska spara en backup-fil då och då, plus egen "Installera"-knapp när `beforeinstallprompt` finns.
- Hjälp (v0.10.0): samma text som `docs/MANUAL.md`, med bilder.

### Layout (bara mobil, beslut 2026-11-09)
- En kolumn (test 390 px), bottenmeny som i follow-diet-tracker (emoji-ikoner, fylld markering, fet etikett): Månad, Översikt, Statistik, Poster, Inst. Svep byter månad (Översikt: år).
- Bredare skärmar visar samma vy centrerad (max 640 px), bottenmenyn kvar. Sidomeny och tvåkolumnsvyer togs bort 2026-11-10.

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
- Skript (2026-11-09): `app.js` delades i `app.js`, `views/*.js` och `main.js`, alla egna filer från samma origin via `<script src>`. CSP oförändrad.
- Inga hemligheter i koden.
- Sparkonton (v0.7.0) sparas i samma `bb.data` i `localStorage` – ingen ny nyckel, ingen ny lagringsteknik, inget undantag. Kontonamn renderas med `textContent`/`el()`, staplarna med `createElementNS`. Saldona går genom `loadData()` innan de används.
- Valutakurser (v0.8.0): **appen hämtar aldrig kurser** – de är konstanter i `store.js` eller skrivs in av användaren. Konstanterna uppdateras med `tools/update-rates.ps1` (Frankfurter, `api.frankfurter.dev`, ECB-data), ett utvecklarverktyg på datorn som git-hooken `pre-commit` kör vid varje commit (stoppar aldrig committen; `SKIP_RATES=1` hoppar över). Inga anrop, ingen ny nyckel (samma `bb.data`), inget undantag.
- **Export/import som text (U5, godkänd 2026-11-08, byggd i v0.9.0).** Gemensam standard i `../STANDARD.md` (punkt 5). Inställningar → kort **Data**: exportruta (skrivskyddad, "Markera allt") och importruta. Kuvert `{"app":"budget-buddy","format":1,"exported":…,"data":…}`. **Nivå 1, smal JSON:** samma struktur som `bb.data` men utan standardvärden och tomma fält (t.ex. `every: 1`, `person: null`, `end: null`, tomma `adjustments`/`balances`, `currency: "SEK"`, standardkategorier och `rates` när `ratesOwn` är falskt); `type` som `"i"`/`"e"`. Import: max 2 MB → `JSON.parse` → `app`/`format` kontrolleras → koder och standardvärden återställs → `loadData()` → sammanfattning (poster, avvikelser, konton, period, antal ogiltiga) → bekräftelsedialog → ersätter allt → ångra-snackbar. Fel = inget ändras. Renderas med `textContent`/`el()` som i dag. Ersätter "Ingen backup i v1" som enda skydd: exporten är användarens egen backup.
- **Fil-backup (U5 utökad 2026-11-09, byggd i v0.11.0).** Kortet **Data**: **Spara backup-fil** (`budget-buddy-ÅÅÅÅ-MM-DD.txt`, exakt exporttexten) och **Läs in backup-fil**; inklistring för import under **Klistra in text** (textexporten togs bort 2026-11-11). Fil-delen är den gemensamma `backup.js` (identisk kopia av `../template/backup.js`, se `../STANDARD.md` punkt 5): i en artifact sparar värden filen efter att användaren bekräftat (`claude.use("downloads")`), annars vanlig nedladdning via `Blob` (`href` som egenskap, `revokeObjectURL` i `setTimeout`). Import: `file.size` ≤ 8 MB före läsning, strikt UTF-8 (`arrayBuffer()` + `TextDecoder` med `fatal`), BOM bort, namn och MIME ignoreras, `input.value` nollställs – sedan samma `importText()`, sammanfattning, bekräftelse och ångra. Exporten är kompakt JSON; indragna exporter importeras som förut. `cleanName()` tar bort styr- och riktningstecken, och exportdatum visas bara om det är ett datum. Ingen CSP-ändring, `connect-src 'none'`. Varningstexten säger att filen är okrypterad bland hämtade filer och kan synkas till molnet (gäller inte längre: sedan 2026-11-11 är filen alltid krypterad).
- **Krypterad backup-fil (U5 utökad 2026-11-11).** **Spara backup-fil** öppnar lösenordsdialogen `#pw-dialog` (i `index.html`, ingen inline-kod). **Kryptering är tvingande sedan 2026-11-11** (hälso- och ekonomidata): det finns inget val att spara okrypterat, och utan `crypto.subtle` sparas ingen fil (`nocrypto`, snackbar). Lösenordet skrivs två gånger (minst 8 tecken, stor och liten bokstav, siffra och specialtecken, högst 200). **Visa lösenord** (`#pw-show`, kryssruta, avbockad från start) växlar fälten mellan `password` och `text`; fälten har `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"` så att mobiltangentbord inte lär sig lösenordet, och döljs igen vid varje stängning. Kryptografin påverkas inte. Kryptering i gemensamma `backup.js` med inbyggda `crypto.subtle`: AES-GCM 256, PBKDF2-SHA256 600 000 iterationer, nytt salt (16 byte) och IV (12 byte) per export, AAD `app|format|iter`, icke-extraherbar nyckel. Kuvert `{app,format:1,encrypted:true,kdf,iter,salt,iv,data}`, ingen klartext. Import (fil eller klistrad text): kuvertet känns igen → lösenord (bara längdkrav) → strikt kuvertkontroll (exakta nycklar, slug, format, kdf, iter 100 000–2 000 000, base64 med längdtak, salt/IV-längd) → dekryptering → samma `importText()`, sammanfattning, bekräftelse och ångra. Alla fel ger "Fel lösenord eller skadad fil." och ändrar inget. Lösenordet sparas och loggas aldrig; fälten töms vid varje stängning. Den okrypterade textexporten (Visa som text) är borttagen; kvar finns bara inklistring (**Klistra in text**) för import. Okrypterade filer läses in som förut. Ingen ny lagringsnyckel, ingen CSP-ändring. Kontrolleras av `check.ps1` (S4c) och de gemensamma testerna i `tools/backup.test.js`. Lösenordsgenerator och Kopiera som simple-nutrition (2026-11-13): **Skapa slumpmässigt lösenord** (`crypto.getRandomValues`, sparas aldrig), färgkodad förhandsvisning, **Kopiera** bara för genererat lösenord (U5), dolt användarnamn ”Budget buddy backup” för lösenordshanterare.
- `docs/presentation.html` har CSS och JS i egna filer, utan `'unsafe-inline'` och utan `style`-attribut.
- Arbetsytans agent `granskning` bestämmer över säkerheten.
- **Backup:** rensas webbplatsdata försvinner allt. Backup-filen (kortet Data, v0.11.0; alltid krypterad sedan v0.12.0) är användarens egen backup; Inställningar påminner om att spara en backup-fil då och då.

## PWA-krav
- `manifest.webmanifest` med ikoner 192/512 (any + maskable), `display: standalone`.
- `sw.js` cachar appens filer under `bb-<version>`, svarar bara på GET från egen origin och raderar bara egna cacher.
- Fungerar offline efter första besöket.
- Versionsnummer i `version.js` visas uppe till höger och styr cachenamnet.
- Testfil för `file://`: `dist/budget-buddy.html`, byggs med `tools/build-single.ps1`.

## Design
Material Design 3 enligt `../STIL.md`. Nyckelfärg blå `#2a6fb0`. Bottenmeny, bara mobil (390 px).
- Belopp med tabellsiffror (`tabular-nums`), högerjusterade, tusentalsavgränsare med mellanslag ("32 000 kr"). Inmatning tillåter både komma och punkt som decimaltecken.
- "Kvar" stort i kortet överst: grön ton vid överskott, `--error` vid underskott.
- Markeringar för återkommande (↻), justerad (✎) och avvikelse (★), så att man ser varför en månad avviker.

### Planerat: stilrenare som diet (köas, start efter token-reset onsdag 2026-11-11)
Mål: samma minimalistiska känsla som follow-diet-tracker – mindre synligt på en gång, inmatning bara när den behövs. CSS-grunden är redan densamma; skillnaden är innehåll och struktur. Allt i en omgång, en release. Uppskattat ≈ 95–135k tokens totalt.
1. **Poster: dölj formulären** bakom "+ Ny inkomst" / "+ Ny kostnad" (fälten fälls ut eller öppnas i dialog). `index.html`, `views/items.js`, CSS, test. ~25–35k.
2. **Ta bort de flesta grå hjälptexterna** i korten; förklaringen finns i Hjälp/`MANUAL.md`. ~8–12k.
3. **Ta bort h1 på flikar** där fliknamnet säger samma sak (Översikt, Poster, Inställningar); kontrollera datorlayouten. ~5–8k.
4. **Dialoger: sällan använda fält bakom "Fler val"** (Person, Till månad, Återställ, Hoppa över). `views/month.js`, `views/items.js`, test. ~25–40k.
5. **Inställningar: slå ihop Personer + inkomst-/kostnadskategorier** till ett kort. `views/settings.js`, test. ~20–30k.
6. Release + publicering. ~10k.

Billig start om tokens tryter: 2 + 3 först (~25k med release).

## Acceptanskriterier
Bockade punkter täcks av automatiska tester (`tools/test.ps1`). Obockade kräver en människa (layout, tema, installation, offline) eller saknar test än.

- [ ] Lägga in lön och fem räkningar på under två minuter.
- [x] En årlig post (`every: 12`) syns bara i rätt månad. *(test: applies: varje kvartal och slutmånad)*
- [ ] En avvikelse i november påverkar bara november.
- [ ] Justering av el i januari ändrar bara januari.
- [ ] Översikten visar 12 månader och markerar underskott.
- [ ] Belopp räknas i ören utan avrundningsfel (0,10 + 0,20 = 0,30).
- [x] Trasig data i `localStorage` ger standardvärden, inte blank skärm. *(test: loadData: skräp ger tom standarddata)*
- [ ] Installerbar som PWA på Android och iPhone.
- [ ] Fungerar offline.
- [ ] Ljust och mörkt tema.
- [ ] Layout fungerar på 390 px (mobil). Surfplatta och dator är inte krav (beslut 2026-11-09).
- [ ] Sparkonto: saldo för två månader visar förändring och summa; nytt saldo samma månad ersätter det gamla; ta bort konto går att ångra.
- [ ] `granskning` utan anmärkning.

## Framtida idéer
- CSV-export av poster för Excel (bara export). Export/import som **fil** finns sedan v0.11.0 (U5) – se Integritet och säkerhet. Lösenordskryptering av filen (`"format": 2`) är en möjlig nästa idé.
- Sparmål (t.ex. "semester 15 000 kr till juni") som visas i översikten.
- Diagram per kategori (vart pengarna går).
- Mall för återkommande avvikelser / kopiera från förra månaden.
