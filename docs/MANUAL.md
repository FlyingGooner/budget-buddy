# Budget buddy – så använder du appen

Samma text finns i appen under **Inställningar → Allmänt → Hjälp och manual**. Skriv bara här: Hjälp i `index.html` byggs från den här filen med `node tools/build-help.mjs` (eller `tools/build-help.ps1`).

## Kom igång
- Tryck **+ Inkomst** under Månad och lägg in din lön efter skatt. Tryck **+ Kostnad** och lägg in hyra, el, lån och andra räkningar. Ange hur ofta en kostnad kommer – varje månad, varannan, kvartal eller en gång om året.
- Allt läggs in en gång. Sedan räknar appen ut varje månad åt dig.
- Får du lön en annan dag än den 1:a: välj **Lönedag** under Inställningar → Hushåll (se nedan).

## Varför din data är säker här
- Här finns hela din ekonomi: lön, lån, räkningar, sparande och vem i hushållet som betalar vad. Sådant ska inte hamna hos ett företag, en annonsör eller en hackare.
- **Ingen server att hacka.** Din data finns bara i din telefon. Den som vill åt den måste komma åt just din telefon.
- **Inget att sälja.** Inget konto, ingen analys, ingen reklam och inga spårare. Webbläsaren spärrar dessutom tekniskt alla anrop ut, så datan kan inte skickas iväg ens av misstag.
- **Låst backup.** Backup-filen krypteras med AES-256 och din kod. Lägger du den i molnet ser molntjänsten bara obegriplig data.
- **Öppen kod.** All kod ligger öppet på GitHub och kan granskas av vem som helst.
- **Ärligt: inget är 100 % säkert.** Lås telefonen med kod och håll den uppdaterad, och spara backup-koden i en lösenordshanterare.

## Månad
- Överst står vad som blir **Kvar** efter månadens kostnader och sparande, jämfört med förra månaden. Stapeln visar vart inkomsten går: kostnader, sparande och kvar.
- **Inkomster**, **Kostnader** och **Sparande** är hopfällda. Tryck för att fälla ut. Kostnaderna är grupperade per kategori – tryck på en kategori för att se posterna. **+ Lägg till i Boende** lägger till en kostnad med samma kategori, person och hur ofta.
- Byt månad med **◀ ▶** eller svep åt vänster/höger. Tryck på **Månad** i menyn för att komma tillbaka till nuvarande månad.
- Tryck på en rad för att ändra beloppet bara den här månaden, hoppa över den eller **Ändra posten** (namn, belopp, kategori, period). **+ Avvikelse** lägger till en engångspost, t.ex. nya däck eller en tandläkarräkning.
- **Alla poster ›** visar alla återkommande poster. Där kan du sortera (↕), och hålla in en post för att markera flera: **Avsluta** sätter en sista månad, **Ta bort** lägger dem i papperskorgen.

## Lönedag
- Under **Inställningar → Hushåll → Lönedag** väljer du vilken dag budgetmånaden börjar. Den 1:a är vanliga kalendermånader.
- Får du lön t.ex. den 25:e räcker lönen den 25 november till december. Den månaden heter då **December**, med datumen **25 nov – 24 dec** under. Före lönedagen är du kvar i förra månaden.

## Sparande och sparkonton
- Kostnader i kategorin **Sparande** visas i ett eget kort, både i Månad och under Alla poster. De räknas fortfarande av från det som blir kvar.
- **Sparkonton** finns under **Trend**. Lägg till ett konto och fyll i saldot en gång. Kryssa sedan i vilka sparposter som går dit – då räknas saldot upp av sig självt varje månad (visas med ≈). Fyll i ett nytt saldo när du vill stämma av.
- Ett konto kan ha en annan valuta (t.ex. USD); då räknas summan om till din valuta med kurserna under Valuta. Konton i annan valuta räknas inte upp automatiskt.

## Trend
- Nyckeltal för månaden: hur mycket som blir kvar, sparkvot, snitt, sparat och största kostnaden. Kostnader per kategori och in/ut de senaste 12 månaderna. Längst ner: sparkonton.

## Historik
- Visar ett år i taget – byt år med **◀ ▶**. Överst statistik för året: inkomster, kostnader, sparat, kvar, snitt, bästa och sämsta månad och prognos för helåret.
- En graf över hur mycket pengar som blir kvar under året – eller saldot, om du har fyllt i ett **Startsaldo** under Inställningar → Hushåll. Streckat är prognos.
- Under grafen: årets månader. Tryck på en månad för att öppna den.

## Personer och kategorier
- Valfritt: lägg till personerna i hushållet under **Inställningar → Hushåll**, så kan varje post höra till en person eller vara gemensam. Under Kvar visas då In, Ut och Kvar per person och för Gemensamt. Gemensamma kostnader delas inte automatiskt – raden **Delat lika** visar vad som blir kvar per person om de delas lika.
- Kategorierna kan byta namn, läggas till och tas bort.

## Papperskorg
- Poster, avvikelser och sparkonton som du tar bort hamnar i **Papperskorg** under Inställningar → Allmänt. Där ligger de i 30 dagar och kan tas tillbaka med **Återställ**. Sedan raderas de för gott.

## Språk och valuta
- Byt språk under **Inställningar → Allmänt → Språk** och valuta (kronor, euro, dollar, pund, norska eller danska kronor) under **Inställningar → Valuta**.
- Byter du valuta räknas alla belopp om med valutakurserna. Ångra finns direkt efteråt. Sparkonton behåller sin egen valuta.
- Tal skrivs alltid likadant (1 250,50), oavsett språk.

## Valutakurser
- Appen har ECB:s referenskurser inbyggda (datumet står i kortet). De uppdateras varje vardag när appen uppdateras – appen hämtar aldrig kurser själv. Du kan skriva in egna kurser och trycka Spara; **Använd appens kurser** återställer.

## Backup och flytt
- Under **Inställningar → Allmänt → Data**: tryck **Spara backup-fil** då och då. För att läsa tillbaka: **Läs in backup-fil**, kontrollera sammanfattningen och tryck **Ersätt** (Ångra finns).
- Filen låses alltid med **din kod**: 16 slumpade tecken som appen skapar åt dig. **Visa**, **Kopiera** och **Ny kod** finns vid Din kod. Spara koden i din lösenordshanterare – på en ny telefon behöver du den för att öppna backupen.
- Under **Fler val**: Exportera CSV, Klistra in text (om det inte går att välja filen), Välj egen kod och Radera all data.

## Bakåt
- Telefonens bakåtknapp stänger först den ruta som är öppen, sedan markeringsläget. Därefter går den tillbaka genom flikarna du besökt.

## Installera och offline
- **Android (Chrome):** menyn ⋮ → Installera app. **iPhone (Safari):** Dela → Lägg till på hemskärmen.
- Installerad fungerar appen helt utan nät. Nya versioner hämtas automatiskt.

## Integritet
- Appen gör inga anrop – ingen server, ingen bankkoppling, ingen analys, inget konto. All data finns bara i den här webbläsaren.
- Rensar du webbplatsdata försvinner allt. Därför: spara en backup-fil då och då.
