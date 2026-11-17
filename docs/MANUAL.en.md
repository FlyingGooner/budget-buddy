# Budget buddy – how to use the app

The same text is in the app under **Settings → General → Help and manual**. Write only here: Help in `index.html` is built from this file with `node tools/build-help.mjs` (or `tools/build-help.ps1`).

## Get started
- Tap **+ Income** under Month and add your salary after tax. Tap **+ Cost** and add rent, electricity, loans and other bills. Choose how often a cost comes – every month, every other month, quarterly or once a year.
- Everything is entered once. Then the app works out every month for you.
- Paid on another day than the 1st? Choose **Payday** under Settings → Household (see below).

## Why your data is safe here
- This is your whole economy: salary, loans, bills, savings and who in the household pays what. That should not end up with a company, an advertiser or a hacker.
- **No server to hack.** Your data is only on your phone. Anyone who wants it has to get into your phone.
- **Nothing to sell.** No account, no analytics, no ads and no trackers. The browser also technically blocks all outgoing calls, so the data cannot be sent anywhere even by mistake.
- **Locked backup.** The backup file is encrypted with AES-256 and your code. If you put it in the cloud, the cloud service only sees unreadable data.
- **Open source.** All code is public on GitHub and can be reviewed by anyone.
- **Honestly: nothing is 100 % safe.** Lock your phone with a code, keep it updated, and save the backup code in a password manager.

## Month
- At the top is what is **Left** after the month's costs and savings, compared with last month. The bar shows where the income goes: costs, savings and left.
- **Income**, **Expenses** and **Savings** are folded. Tap to unfold. Expenses are grouped by category – tap a category to see the items. **+ Add to Housing** adds a cost with the same category, person and frequency.
- Change month with **◀ ▶** or swipe left/right. Tap **Month** in the menu to return to the current month.
- Tap a row to change the amount for this month only, skip it, or **Edit item** (name, amount, category, period). **+ Deviation** adds a one-off item, e.g. new tyres or a dentist bill.
- **All items ›** shows all recurring items. There you can sort (↕), and press and hold an item to select several: **End** sets a last month, **Delete** moves them to the trash.

## Close the month
- What is shown under Left is planned – what is left after the fixed costs. Food, fun and unexpected spending do not show there.
- When the month is over (the day before payday), tap **✓ Close the month** under Left and enter what was actually left in the account. Left then shows the actual amount, and the difference from the plan is shown as **Variable** in the bar.
- History, Trend and the balance then use the actual amount for that month. **Edit** corrects the amount, **Reopen** removes it.

## Payday
- Under **Settings → Household → Payday** you choose which day the budget month starts. The 1st means normal calendar months.
- If you are paid e.g. on the 25th, the salary on 25 November covers December. That month is then called **December**, with the dates **25 Nov – 24 Dec** below. Before payday you are still in the previous month.

## Savings and savings accounts
- Costs in the **Savings** category are shown in a card of their own, both in Month and under All items. They are still deducted from what is left.
- **Savings accounts** are under **Trend**. Add an account and enter the balance once. Then tick which savings items go there – the balance then counts up by itself every month (shown with ≈). Enter a new balance whenever you want to reconcile.
- An account can have another currency (e.g. USD); the total is then converted to your currency with the rates under Currency. Accounts in another currency do not count up automatically.

## Trend
- Key figures for the month: how much is left, savings rate, average, saved and the largest cost. Expenses by category and in/out over the last 12 months. At the bottom: savings accounts.

## History
- Shows one year at a time – change year with **◀ ▶**. At the top, figures for the year: income, expenses, saved, left, average, best and worst month and a forecast for the full year.
- A chart of how much money is left during the year – or the balance, if you have entered a **Starting balance** under Settings → Household. Dashed is forecast.
- Below the chart: the months of the year. Tap a month to open it.

## People and categories
- Optional: add the people in the household under **Settings → Household**, so each item can belong to a person or be shared. Under Left you then see In, Out and Left per person and for Shared. Shared costs are not split automatically – the row **Split evenly** shows what is left per person if they are shared evenly.
- Categories can be renamed, added and removed.

## Trash
- Items, deviations and savings accounts you delete go to **Trash** under Settings → General. They stay there for 30 days and can be brought back with **Restore**. Then they are deleted for good.

## Language and currency
- Change language under **Settings → General → Language** and currency (kronor, euro, dollar, pound, Norwegian or Danish kroner) under **Settings → Currency**.
- If you change currency, all amounts are converted with the exchange rates. Undo is available right after. Savings accounts keep their own currency.
- Numbers are always written the same way (1 250,50), whatever the language.

## Exchange rates
- The app has the ECB reference rates built in (the date is shown in the card). They are updated every weekday when the app is updated – the app never fetches rates itself. You can enter your own rates and tap Save; **Use the app's rates** resets them.

## Backup and moving
- Under **Settings → General → Data**: tap **Save backup file** now and then. To restore: **Load backup file**, check the summary and tap **Replace** (Undo is available).
- The file is always locked with **your code**: 16 random characters the app creates for you. **Show**, **Copy** and **New code** are next to Your code. Save the code in your password manager – on a new phone you need it to open the backup.
- Under **More options**: Export CSV, Paste text (if the file cannot be chosen), Choose your own code and Delete all data.

## Back
- The phone's back button first closes the open dialog, then selection mode. After that it goes back through the tabs you visited.

## Install and offline
- **Android (Chrome):** menu ⋮ → Install app. **iPhone (Safari):** Share → Add to Home Screen.
- Installed, the app works fully offline. New versions are fetched automatically.

## Privacy
- The app makes no calls – no server, no bank connection, no analytics, no account. All data is only in this browser.
- If you clear site data, everything is gone. So: save a backup file now and then.
