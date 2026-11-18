# Budget buddy – så använder du appen

Samma text finns i appen under **Inställningar → Allmänt → Hjälp och manual**. Skriv bara här: Hjälp i `index.html` byggs från den här filen med `node tools/build-help.mjs` (eller `tools/build-help.ps1`).

## Kom igång
- Under **Månad** finns knappen **＋ Lägg till**. Välj **Inkomst** (lön efter skatt), **Kostnad** (hyra, el, lån …), **Sparande** eller **Bara den här månaden** (en avvikelse).
- Allt läggs in en gång och gäller sedan varje månad. Appen räknar ut vad som blir kvar.
- Får du lön en annan dag än den 1:a: välj **Lönedag** under Inställningar → Hushåll.

## Månad
- **Kvar** överst är det som blir över efter kostnader och sparande. Under det jämförelsen med förra månaden, och stapeln visar vart inkomsten går. Beloppen finns i korten nedanför.
- **Inkomster** och **Kostnader** är hopfällda – tryck för att se dem. Kostnaderna är grupperade per kategori, och de tre största syns direkt.
- Tryck på en rad för att ändra beloppet bara den här månaden, hoppa över den eller **Ändra posten** (namn, belopp, kategori, period). **+ Lägg till i Boende** lägger till en kostnad med samma kategori, person och hur ofta.
- Byt månad med **◀ ▶** eller svep. Tryck på **Månad** i menyn för att komma tillbaka till aktuell månad.
- Tryck på en post för att ändra den. Beloppet överst gäller bara månaden du tittar på. Under **Ändra posten (alla månader)** ändrar du namn, ordinarie belopp, hur ofta, kategori och period. **Ta bort posten** lägger den i papperskorgen.
- Vill du avsluta en post, fyll i **Till månad**. Poster som har slutat eller inte börjat syns i de månader de gäller.

## Sparande
- Sparande är inte en kostnad, men dras av från det som blir kvar. Lägg till med **+ Sparande**: namn, belopp, hur ofta och gärna **Saldo nu**. Då skapas ett sparkonto som räknas upp av sig självt varje månad.
- Kortet **🐷 Sparande** i Månad visar månadens sparande och **Totalt sparat** i din valuta. Tryck för att fälla ut en rad per konto: saldo i din valuta, månadssparandet och ändringen sedan förra månaden. Konton i annan valuta visar sitt eget belopp inom parentes, t.ex. (730 USD).
- Tryck på en rad för att ändra belopp, välja vilket **Sparkonto** pengarna går till eller rätta saldot. Saldot märkt ≈ är beräknat: senast ifyllt plus sparandet.
- Dras sparandet innan nettolönen betalas ut (t.ex. aktier via jobbet), bocka i **Dras före lönen**. Då räknas det som sparat men minskar inte Kvar. Samma val finns på en avvikelse i kategorin Sparande.
- Konton som inte rörs (t.ex. barnens) kan döljas från Månad: tryck på raden i Sparande-kortet och bocka ur **Visa i Månad**. Tryck på namnet under "+ 1 dolt konto" för att visa det igen. Det räknas fortfarande i Totalt sparat.
- Sparkonton hanteras bara här. **Kontot ›** i rutan för en sparpost ändrar kontots valuta, vilka sparposter som går dit, eller tar bort kontot (det hamnar i papperskorgen).
- Summan och en graf över alla konton finns under **Översikt → Sparkonton**.

## Stäng månaden
- Det som står under Kvar är planerat. Mat, nöjen och oväntade utgifter syns inte där.
- Under Kvar står när det är dags att stänga (t.ex. *Stäng månaden tis 24 nov · om 6 dagar*). Tre dagar innan blir raden färgad, och när dagen har kommit står det **Dags att stänga månaden**.
- Dagen före lön trycker du **✓ Stäng månaden** under Kvar och skriver in vad som faktiskt fanns kvar på kontot. I samma ruta stämmer du av sparkontona (förifyllda – ändra bara det som skiljer).
- Kvar visar då det faktiska beloppet, och skillnaden visas som **Rörligt** i stapeln. Nästa månad blir den aktuella direkt.
- Har du börjat stänga månader visas överst i Månad de som inte är stängda (**Inte stängd: Okt**) – tryck för att gå dit. **Ändra** rättar beloppet, **Öppna igen** tar bort stängningen.

## Lönedag
- Under **Inställningar → Hushåll → Lönedag** väljer du vilken dag budgetmånaden börjar. Den 1:a är vanliga kalendermånader.
- Med lön den 25:e räcker lönen den 25 november till december. Den månaden heter **December**, med **25 nov – 24 dec** under.
- Infaller lönedagen på en lördag eller söndag räknar appen med att lönen kommer fredagen före. **Stäng månaden** frågar då efter saldot dagen före det, oftast torsdagen.

## Översikt
- Överst **förra månaden** – den senaste du har stängt: **Konsumtion** (det som blev kvar efter räkningar och sparande minus det som faktiskt blev över – mat, nöjen och annat), **🐷 Totalt sparat** (summan på sparkontona) och **Kvar**. ▲▼ visar skillnaden mot månaden innan.
- Sedan sparkontonas summa med graf, och **Månad för månad**: konsumtion och sparat för varje stängd månad. Tryck på en månad för att öppna den.
- Översikten bygger på stängda månader – stäng månaden dagen före lön (se ovan).

## Personer och kategorier
- Valfritt: lägg till personerna i hushållet under **Inställningar → Hushåll**. Varje post kan då höra till en person eller vara gemensam, och Kvar visar In, Ut och Kvar per person. **Delat lika** visar vad som blir kvar per person om det gemensamma delas lika.
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
