# Budget buddy – how to use the app

The same text is in the app under **Settings → General → Help and manual**. Write only here: Help in `index.html` is built from this file with `node tools/build-help.mjs` (or `tools/build-help.ps1`).

## Get started
- Under **Month** there are four buttons: **+ Income** (salary after tax), **+ Cost** (rent, electricity, loans …), **+ Saving** and **+ Deviation** (something that only applies to one month).
- Everything is entered once and then applies every month. The app works out what is left.
- Paid on another day than the 1st? Choose **Payday** under Settings → Household.

## Month
- **Left** at the top is what remains after costs and savings. The line below shows In · Out · Saved and the comparison with last month. The bar shows where the income goes.
- **Income** and **Expenses** are folded – tap to see them. Expenses are grouped by category, and the three largest are shown right away.
- Tap a row to change the amount for this month only, skip it or **Edit item** (name, amount, category, period). **+ Add to Housing** adds a cost with the same category, person and frequency.
- Change month with **◀ ▶** or swipe. Tap **Month** in the menu to return to the current month.
- **All items ›** shows all recurring items. There you can sort (↕) and press and hold an item to select several (End, Delete).

## Savings
- Savings are not a cost, but they are deducted from what is left. Add with **+ Saving**: name, amount, frequency and preferably **Balance now**. A savings account is then created that counts up by itself every month.
- The **🐷 Savings** card in Month shows the month's savings and **Total saved** in your currency. Tap to unfold one row per account: balance in your currency, the monthly saving and the change since last month. Accounts in another currency show their own amount in brackets, e.g. (730 USD).
- Tap a row to change the amount, choose which **Savings account** the money goes to, or correct the balance. A balance marked ≈ is estimated: last entered plus the savings.
- If the saving is taken before your net salary is paid (e.g. shares through work), tick **Taken before payday**. It then counts as saved but does not reduce Left.
- Accounts you never touch (e.g. the children's) can be hidden from Month: tap the row in the Savings card and untick **Show in Month**. Tap the name under "+ 1 hidden account" to show it again. It still counts in Total saved.
- All accounts, with a chart, are also under **Trend → Savings accounts**. There you add an account without a savings item, or delete one (it goes to the trash).

## Close the month
- What is shown under Left is planned. Food, fun and unexpected spending do not show there.
- The day before payday, tap **✓ Close the month** under Left and enter what was actually left in the account. In the same dialog you reconcile the savings accounts (prefilled – only change what differs).
- Left then shows the actual amount, and the difference is shown as **Variable** in the bar. The next month becomes the current one right away.
- Once you have started closing months, months that are not closed are shown at the top of Month (**Not closed: Oct**) – tap to go there. **Edit** corrects the amount, **Reopen** removes the closing.

## Payday
- Under **Settings → Household → Payday** you choose which day the budget month starts. The 1st means normal calendar months.
- With payday on the 25th, the salary on 25 November covers December. That month is called **December**, with **25 Nov – 24 Dec** below.

## Trend
- Key figures for the month: left of income, savings rate, average, saved and the largest cost. Expenses by category, in and out over the last 12 months, and the savings accounts.

## History
- One year at a time – change year with **◀ ▶**. At the top, figures for the year: income, expenses, saved, left, average, best and worst month and a forecast for the full year.
- The chart shows left + saved over time (or the balance, if you have a **Starting balance** under Settings → Household). Dashed is forecast.
- Months that are not closed are counted with the average variable spending (≈). ✓ = closed. Tap a month to open it.

## People and categories
- Optional: add the people in the household under **Settings → Household**. Each item can then belong to a person or be shared, and Left shows In, Out and Left per person. **Split evenly** shows what is left per person if the shared part is split evenly.
- Categories can be renamed, added and removed.

## Currency and rates
- The home currency is chosen under **Settings → Currency** (kronor, euro, dollar, pound, Norwegian or Danish kroner). If you change it, all amounts are converted (Undo is available). Savings accounts keep their own currency.
- The app has the ECB reference rates built in. They are updated every weekday when the app is updated – the app never fetches rates itself. Your own rates can be entered under **Exchange rates**.

## Trash
- Items, deviations and savings accounts you delete stay in **Trash** under Settings → General for 30 days and can be brought back with **Restore**.

## Backup and moving
- Under **Settings → General → Data**: tap **Save backup file** now and then. To restore: **Load backup file**, check and tap **Replace** (Undo is available).
- The file is always locked with **your code** (Show, Copy, New code). Save the code in your password manager – you need it on a new phone.
- Under **More options**: Export CSV, Paste text, Choose your own code and Delete all data.

## Why your data is safe here
- **No server to hack.** Your data is only on your phone.
- **Nothing to sell.** No account, no analytics, no ads. The browser technically blocks all outgoing calls.
- **Locked backup.** The backup file is encrypted with AES-256 and your code.
- **Open source** on GitHub. Lock your phone with a code and keep it updated.

## Install as an app

![Android: Chrome menu ⋮ → Install app](manual/install-android-en.png)
- **Android (Chrome):** open the app link, tap ⋮ at the top right and choose **Install app**.

![iPhone: Safari → Share → Add to Home Screen](manual/install-ios-en.png)
- **iPhone (Safari):** open the link in Safari, tap **Share** (the box with the arrow) and choose **Add to Home Screen** → **Add**.
- Installed, the app works like a normal app, even offline.
- If you clear site data, everything is gone – save a backup file now and then.

## Back
- The back button first closes the open dialog, then selection mode, then goes back through the tabs.
