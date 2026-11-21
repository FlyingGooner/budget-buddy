# Budget buddy – dataformat

All data ligger i `localStorage` under `bb.data` (JSON). `loadData()` i `store.js` validerar allt och bygger nya objekt av kända fält; okända fält tas bort. Ändras formatet: ändra `loadData()`, `packData()`/`unpackData()` och den här filen tillsammans, och höj `DATA_VERSION` med en funktion i `MIGRATIONS` om ett fält byter betydelse.

Belopp är heltal i ören (minsta enheten) i hemvalutan, utom sparkontons saldon och mål som är i kontots valuta. Månader skrivs `YYYY-MM` och betyder budgetmånaden (den månad lönen räcker till, se `payday`). Id är korta strängar (`isId`).

## Rot

| Fält | Typ | Betydelse |
|---|---|---|
| `version` | heltal | Dataversion, nu `4` (`DATA_VERSION`). Äldre data går genom `migrate()`. |
| `settings` | objekt | Se nedan. |
| `recurring` | lista | Återkommande poster (max `MAX_RECURRING`). |
| `oneOffs` | lista | Avvikelser – engångsposter en viss månad (max `MAX_ONEOFFS`). |
| `adjustments` | `{ månad: { postId: belopp } }` | Annat belopp för en återkommande post en viss månad. `0` = hoppa över. |
| `accounts` | lista | Sparkonton (max 20). |
| `closed` | `{ månad: belopp }` | Stängda månader: vad som faktiskt fanns kvar på kontot dagen före nästa lön. Ersätter planerat kvar. |
| `carry` | lista av månader | Stängda månader vars kvar ligger kvar och blir raden *Kvar från förra månaden* i nästa månad. |
| `trash` | lista | Papperskorg, 30 dagar. Inte i exporten. |

## settings

| Fält | Betydelse |
|---|---|
| `categories` | `[{ id, name, type: 'income'\|'expense' }]`, max 60. `savings` = Sparande, `other`/`income-other` = reserv. |
| `people` | `[{ id, name }]`. En post utan person är gemensam. |
| `home` | Hemvaluta: SEK, EUR, USD, GBP, NOK eller DKK. |
| `payday` | Lönedag 1–28; budgetmånaden börjar då (1 = kalendermånad). |
| `startBalance`, `startMonth` | Valfritt startsaldo för löpande saldo. |
| `rates`, `ratesDate`, `ratesOwn` | Egna valutakurser (öre per enhet). Sparas bara om `ratesOwn`; annars gäller appens. |
| `sort`, `catsV` | Sortering i Alla poster; engångstillägg av kategorier (äldre data). |

## recurring

`{ id, name, type: 'income'|'expense', amount, category, person, every: 1|2|3|12, start, end, src? }`

- `every`: varannan, var tredje … månad räknat från `start`. Inkomster är alltid `1`.
- `end`: sista månaden (eller `null`).
- `src` (v3): bara för kostnader i kategorin Sparande – varifrån sparandet kommer. Saknas = från lönen (en vanlig kostnad, minskar Efter räkningar). `'pre'` = dras före nettolönen, `'extra'` = utöver lönen (t.ex. en gåva direkt till sparkontot). Båda räknas som sparat men minskar inte Efter räkningar. Äldre data med `pre: true` blir `src: 'pre'`. Från v4 flyttas poster med `src` som är kopplade till ett sparkonto dit (`pre` resp. `deposits`) och tas bort som poster; nytt sparande före lön och insättningar fylls i på kontot.

## oneOffs

`{ id, month, name, type, amount, category, person, src? }` – gäller bara `month`. `src` som ovan.

## accounts

`{ id, name, currency, balances: { månad: belopp }, feeds: [postId], hidden, goal?, pre?, deposits? }`

- `balances`: ifyllda saldon. Saldot en senare månad beräknas som senaste ifyllda plus det som `feeds` sparar (omräknat från hemvalutan).
- `feeds`: id på återkommande sparposter eller avvikelser (från version 2) som fyller på kontot.
- `hidden`: visas inte i Månad men räknas i Totalt sparat.
- `goal`: `{ amount, month? }` – sparmål i kontots valuta, ev. klart till en månad.
- `pre` (v4): `{ amount, from }` – sätts in före lönen varje månad från och med `from`, i hemvalutan. Räknas som sparat, påverkar inte budgeten.
- `deposits` (v4): `{ månad: belopp }` – insättningar utöver lönen (t.ex. en gåva), i hemvalutan. Räknas som sparat den månaden.
- Namnen är unika (kontrolleras i dialogen, inte i `loadData`).

## trash

`[{ d: 'YYYY-MM-DD', rec | one | acc: posten, adj?: { månad: belopp }, accs?: [kontoId] }]`

- `adj`: en återkommande posts avvikande belopp, läggs tillbaka vid återställning.
- `accs` (version 2): konton som posten fyllde på; kopplingen läggs tillbaka vid återställning.

## Export och backup

`exportText()` skriver `{ app, format, exported, data }` där `data` är `packData()`: samma fält men utan standardvärden, `type` som `i`/`e`, och utan `trash` och sortering. `importText()` → `unpackData()` → `loadData()`.
