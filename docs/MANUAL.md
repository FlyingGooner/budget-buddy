# Budget buddy – så använder du appen

Samma text finns i appen under **Inställningar → Allmänt → Hjälp och manual**. Skriv bara här: Hjälp i `index.html` byggs från den här filen med `node tools/build-help.mjs` (eller `tools/build-help.ps1`).

## Kom igång
- Under **Månad** finns knappen **＋ Lägg till**. Välj **Inkomst** (lön efter skatt), **Kostnad** (hyra, el, lån …), **Sparande** eller **Bara den här månaden** (en avvikelse).
- Allt läggs in en gång och gäller sedan varje månad. Appen räknar ut vad som blir kvar.
- Får du lön en annan dag än den 1:a: välj **Lönedag** under Inställningar → Hushåll.

## Månad
- **Efter räkningar** överst är det som blir över efter kostnader och sparande – pengarna att leva på (mat, nöjen och annat rörligt). När månaden är stängd står **Kvar på kontot** i stället: det som faktiskt fanns kvar. Under det jämförelsen med förra månaden, och stapeln visar vart inkomsten går. Beloppen finns i korten nedanför.
- **Inkomster**, **Kostnader** och **Totalt sparat** ligger i samma kort och är hopfällda – tryck på en rad för att se den. Kostnaderna är grupperade per kategori. Under dem står **Efter räkningar** (inkomster minus kostnader, samma belopp som överst) och **Sparat i månaden** med andel av inkomsten.
- Tryck på en rad för att ändra beloppet den här månaden. Under **Mer** finns **Ändra posten (alla månader)** (namn, belopp, kategori, period), **Hoppa över den här månaden**, **Återställ till ordinarie** och **Ta bort**. **+ Lägg till i Boende** lägger till en kostnad med samma kategori, person och hur ofta.
- Byt månad med **◀ ▶** eller svep. Tryck på **Månad** i menyn för att komma tillbaka till aktuell månad.
- **＋ Lägg till**, **☰ Alla poster** och **🔒 Stäng** (eller **🔓 Ändra** i en stängd månad) ligger på en rad längst ner. **☰ Alla poster** visar alla återkommande poster, även avslutade och kommande. Posterna står med störst belopp först, både där och i Månad. Tryck på en för att ändra den.
- Under knapparna står hur många dagar det är kvar till nästa lön (innevarande månad) och vilken kategori som ändrats mest mot förra månaden. I kortet står också förra månaden: kvar på kontot om den är stängd, annars efter räkningar.
- **Kvar vid stängning** (prognos) står på samma rad, när minst en tidigare månad är stängd: efter räkningar minus de rörliga utgifterna (snittet av de tre senaste stängda månaderna). Är samma månad förra året stängd räknas den med i procent – är december 65 % dyrare än vanligt, räknas det in. Tryck på prognosen för förklaringen.
- **Senaste och kommande månader** (Översikt): de tre senaste månaderna överst (stängda med vad som blev kvar på kontot), sedan efter räkningar för de tre närmaste månaderna (tryck **Visa alla 12 månader** för resten) och, när någon månad är stängd, kvar enligt prognosen bredvid. Tryck på en månad för att öppna den.
- **Sparmål** (valfritt): öppna ett sparkonto och tryck **+ Sparmål**. Skriv ett belopp och, om du vill, en månad det ska vara klart. Under kontot visas hur långt du har kommit, när du når målet i nuvarande takt och – med datum – vad som behövs per månad för att hinna. Töm fältet för att ta bort målet.
- Tryck på en post för att ändra den. Beloppet överst gäller bara månaden du tittar på; resten ligger under **Mer**. **Ta bort** lägger posten i papperskorgen.
- Vill du avsluta en post, fyll i **Till månad**. Poster som har slutat eller inte börjat syns i de månader de gäller.

## Sparande
- Sparande från lönen är en kostnad: pengarna lämnar kontot. Lägg till med **+ Sparande**: namn, belopp, hur ofta och gärna **Saldo nu**. Då skapas ett sparkonto som räknas upp av sig självt varje månad.
- Raden **Totalt sparat** i Månad visar summan på sparkontona i din valuta. Tryck för att fälla ut en rad per konto: saldo i din valuta, månadssparandet och ändringen sedan förra månaden. Konton i annan valuta visar sitt eget belopp inom parentes, t.ex. (730 USD).
- Tryck på en rad för att ändra belopp, välja vilket **Sparkonto** pengarna går till eller rätta saldot. Saldot märkt ≈ är beräknat: senast ifyllt plus sparandet.
- Sparande och sparkonto är samma sak. **＋ Lägg till → 🐷 Sparande** väljer eller skapar ett sparkonto, där du fyller i **Saldo**, **Från lönen / mån** (en kostnad – står under Kostnader → Sparande och minskar Efter räkningar), **Före lön / mån** (t.ex. aktier via jobbet) och **Insättning** den här månaden (t.ex. en gåva). Före lön och insättningar räknas som sparat men påverkar inte budgeten. Tryck på ett konto under Kostnader → Sparande eller Totalt sparat för att ändra det. **Sparat i månaden** visar allt sparande och hur det fördelar sig.
- Konton som inte rörs (t.ex. barnens) kan döljas från Månad: tryck på kontot och bocka ur **Visa i Månad**. Tryck på namnet under "+ 1 dolt konto" för att visa det igen. Det räknas fortfarande i Totalt sparat.
- Tryck på ett konto under **Totalt sparat** (eller under Kostnader → Sparande) för att ändra det: **Värde**, **Från lönen / mån** och **Före lön / mån** överst; under **Fler inställningar** namn, valuta, sparmål, Visa i Månad och Ta bort konto (det hamnar i papperskorgen). **+ Nytt sparande** under Totalt sparat skapar ett nytt konto. Två konton kan inte heta likadant. När du sparar visas **Ångra** en stund.
- Summan och en graf över alla konton finns under **Översikt → Sparkonton**.

## Stäng månaden
- Efter räkningar är planerat. Mat, nöjen och oväntade utgifter syns inte där.
- Under beloppet står när det är dags att stänga (t.ex. *Stäng månaden tis 24 nov · om 6 dagar*). Tre dagar innan blir raden färgad, och när dagen har kommit står det **Dags att stänga månaden**.
- Dagen före lön trycker du **🔒 Stäng** längst ner och skriver in vad som faktiskt fanns kvar på kontot. Ligger pengarna kvar på kontot låter du **Pengarna ligger kvar och följer med** vara ibockad – då blir beloppet raden **Kvar från förra månaden** (⇢) i nästa månad. Flyttar du dem, t.ex. till sparkontot, bockar du ur. Första månaden, eller om förra månaden inte är stängd, fyller du i det själv med **+ Kvar från förra månaden** under Inkomster. I samma ruta stämmer du av sparkontona (förifyllda – ändra bara det som skiljer).
- Rubriken blir då **Kvar på kontot** med det faktiska beloppet, och skillnaden visas som **Rörligt** i stapeln. Nästa månad blir den aktuella direkt.
- Har du börjat stänga månader visas överst i Månad de som inte är stängda (**Inte stängd: Okt**) – tryck för att gå dit. I en stängd månad trycker du **🔓 Ändra**: där rättar du beloppet eller tar bort stängningen med **Öppna igen**.

## Lönedag
- Under **Inställningar → Hushåll → Lönedag** väljer du vilken dag budgetmånaden börjar. Den 1:a är vanliga kalendermånader.
- Med lön den 25:e räcker lönen den 25 november till december. Den månaden heter **December**, med **25 nov – 24 dec** under.
- Byter du lönedag flyttas posterna med, så att november fortfarande är november (Ångra finns). Står den aktuella månaden tom men nästa har poster visas **Börja posterna i …** – tryck för att flytta allt en månad bakåt.
- Infaller lönedagen på en lördag eller söndag räknar appen med att lönen kommer fredagen före, och den nya månaden börjar då redan på fredagen (även sparandet räknas in då). **Stäng månaden** frågar alltid efter saldot sista vardagen före lönen, oftast torsdagen när lönen kommer på fredag.

## Översikt
- Överst **förra månaden** – den senaste du har stängt: **Konsumtion** (det som blev kvar efter räkningar och sparande minus det som faktiskt blev över – mat, nöjen och annat), **🐷 Totalt sparat** (summan på sparkontona) och **Kvar på kontot**. ▲▼ visar skillnaden mot månaden innan.
- Sedan sparkontonas summa med graf, och **Månad för månad**: konsumtion och sparat för varje stängd månad. Tryck på en månad för att öppna den.
- Översikten bygger på stängda månader – stäng månaden dagen före lön (se ovan).

## Personer och kategorier
- Valfritt: lägg till personerna i hushållet under **Inställningar → Hushåll**. Varje post kan då höra till en person eller vara gemensam, och kortet visar In, Ut och Efter räkningar per person. **Delat lika** visar vad som blir kvar per person om det gemensamma delas lika.
- Kategorierna kan byta namn, läggas till och tas bort.

## Valuta och kurser
- Hemvalutan väljs under **Inställningar → Valuta** (kronor, euro, dollar, pund, norska eller danska kronor). Byter du räknas alla belopp om (Ångra finns). Sparkonton behåller sin egen valuta.
- Appen har ECB:s referenskurser inbyggda. De uppdateras varje vardag när appen uppdateras – appen hämtar aldrig kurser själv. Egna kurser går att skriva in under **Valutakurser**.

## Papperskorg
- Poster, avvikelser och sparkonton du tar bort ligger i **Papperskorg** under Inställningar → Allmänt i 30 dagar och kan tas tillbaka med **Återställ**.

## Backup och flytt
- Under **Inställningar → Allmänt → Data**: tryck **Spara backup-fil** då och då. För att läsa tillbaka: **Läs in backup-fil**, kontrollera och tryck **Ersätt** (Ångra finns).
- Filen låses alltid med **din kod** (Visa, Kopiera, Ny kod). Spara koden i din lösenordshanterare – på en ny telefon behöver du den.
- Under **Fler val**: Exportera CSV, Klistra in text, Välj egen kod och Radera all data.

## Varför din data är säker här
- **Ingen server att hacka.** Din data finns bara i din telefon.
- **Inget att sälja.** Inget konto, ingen analys, ingen reklam. Webbläsaren spärrar tekniskt alla anrop ut.
- **Låst backup.** Backup-filen krypteras med AES-256 och din kod.
- **Öppen kod** på GitHub. Lås telefonen med kod och håll den uppdaterad.

## Installera som app

![Android: Chrome-menyn ⋮ → Installera app](manual/install-android.png)
- **Android (Chrome):** öppna appens länk, tryck ⋮ uppe till höger och välj **Installera app**.

![iPhone: Safari → Dela → Lägg till på hemskärmen](manual/install-ios.png)
- **iPhone (Safari):** öppna länken i Safari, tryck **Dela** (rutan med pilen) och välj **Lägg till på hemskärmen** → **Lägg till**.
- Installerad fungerar appen som en vanlig app, även utan nät.
- Rensar du webbplatsdata försvinner allt – spara en backup-fil då och då.

## Bakåt
- Bakåtknappen stänger först den öppna rutan, sedan markeringsläget, sedan går den tillbaka genom flikarna.
