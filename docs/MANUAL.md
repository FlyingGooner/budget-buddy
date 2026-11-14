# Budget buddy – så använder du appen

Samma text finns i appen under **Inställningar → Hjälp**. Ändras den ena: ändra den andra (kortet `help` i `index.html`).

## Kom igång

![Poster: inkomster och kostnader](manual/poster.png)

- Gå till **Poster** och lägg in dina inkomster (efter skatt) och fasta kostnader. Ange hur ofta en kostnad kommer – varje månad, varannan, kvartal eller en gång om året – och från vilken månad.
- Allt läggs in en gång. Sedan räknar appen ut varje månad åt dig.

## Månad

![Månad](manual/manad.png)

- Visar vad som är kvar efter månadens kostnader, och hur mycket av det som är sparande.
- Byt månad med **◀ ▶** eller svep åt vänster/höger. Tryck på en rad för att ändra beloppet bara den här månaden. **+ Avvikelse** lägger till en engångspost, t.ex. nya däck eller en tandläkarräkning.

## Översikt

![Översikt: kommande 12 månader](manual/oversikt.png)

- De kommande 12 månaderna på en gång. Månader med underskott markeras.
- Fyll i ett **Startsaldo** under Inställningar för att se det löpande saldot efter varje månad.

## Statistik och sparande

![Sparkonton med valuta](manual/sparkonton.png)

- Nyckeltal, sparkvot, kostnader per kategori och in/ut de senaste 12 månaderna. Kostnader i kategorin **Sparande** visas som sparande.
- **Sparkonton** (längst ner i Statistik): lägg till ett konto och fyll i vad som står på det varje månad. Kontot kan ha en annan valuta (t.ex. USD); då räknas summan om till kronor med kurserna under Valutakurser.

## Personer och kategorier
- Valfritt: lägg till personerna i hushållet, så kan varje post höra till en person eller vara gemensam. Kategorierna kan byta namn, läggas till och tas bort.

## Valutakurser
- Appen har ungefärliga kurser från ECB inbyggda (datumet står i kortet). Du kan skriva in egna kurser och trycka Spara; **Använd appens kurser** återställer.

## Backup och flytt

![Kortet Data: export och import](manual/data.png)

- Under **Data**: tryck **Spara backup-fil**. Filen heter t.ex. budget-buddy-2026-11-09.txt och hamnar bland hämtade filer (i Claude-appen bekräftar du först). Gör det då och då.
- För att läsa tillbaka: tryck **Läs in backup-fil** och välj filen, kontrollera sammanfattningen och tryck **Ersätt**. All nuvarande data ersätts – **Ångra** finns direkt efteråt.
- Går det inte att välja filen: öppna **Klistra in text** och klistra in filens innehåll.
- Filen innehåller all din ekonomidata och krypteras alltid med ett lösenord som du väljer. Bocka i **Visa lösenord** om du vill se vad du skriver. **Skapa slumpmässigt lösenord** fyller i ett starkt lösenord som du kan kopiera – spara det i en lösenordshanterare. Glömmer du lösenordet går filen inte att öppna. Radera gamla filer.
- Backup-lösenordet sparas på enheten första gången du skriver det (när du sparar eller läser in en backup). Sedan sparas backup med ett tryck, utan fråga. Lösenordet ligger bara på den här enheten, aldrig i backup-filen, och filen är lika krypterad som förut. Bockar du i **Visa lösenord** räcker det att skriva lösenordet en gång. Under Inställningar → Data kan du **Visa** och **Byta** lösenordet, eller bocka ur **Kom ihåg backup-lösenordet** – då glöms det och appen frågar varje gång. Använd ett nytt lösenord som du inte har någon annanstans: det sparas oskyddat på den här enheten. Tryck **Skapa slumpmässigt lösenord** och spara det i din lösenordshanterare. Behåll lösenordet i din lösenordshanterare – utan det går backupen inte att öppna på en ny telefon.
- Appen är låst tills du har valt ett lösenord för dina backup-filer – första gången, efter Radera all data och så länge inget lösenord är sparat. Har du en backup-fil kan du läsa in den i stället; lösenordet som öppnar den sparas. Appen samlar ingen data – lösenordet är bara en nyckel som skyddar dina backuper. Läser du in en backup som det sparade lösenordet låser upp står det i sammanfattningen; passar det inte frågar appen efter lösenordet för den filen.

## Bakåt
- Telefonens bakåtknapp går tillbaka genom flikarna du besökt. Appen stängs först i fliken du började i. Öppna dialoger stängs först.

## Installera och offline
- **Android (Chrome):** menyn ⋮ → Installera app. **iPhone (Safari):** Dela → Lägg till på hemskärmen.
- Installerad fungerar appen helt utan nät. Nya versioner hämtas automatiskt.

## Integritet
- Appen gör inga anrop – ingen server, ingen bankkoppling, ingen analys, inget konto. All data finns bara i den här webbläsaren.
- Rensar du webbplatsdata försvinner allt. Därför: spara en backup-fil då och då.
