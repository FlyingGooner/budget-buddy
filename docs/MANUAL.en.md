# Budget buddy – how to use the app

The same text is in the app under **Settings → General → Help and manual**. Write only here: Help in `index.html` is built from this file with `node tools/build-help.mjs` (or `tools/build-help.ps1`).

## Get started
- Under **Month** there is the **＋ Add** button. Choose **Income** (salary after tax), **Cost** (rent, electricity, loans …), **Saving** or **Only this month** (a one-off).
- Everything is entered once and then applies every month. The app works out what is left.
- Paid on another day than the 1st? Choose **Payday** under Settings → Household.

## Month
- **Left** at the top is what remains after costs and savings. Below it the comparison with last month, and the bar shows where the income goes. The amounts are in the cards below.
- **Income** and **Expenses** are folded – tap to see them. Expenses are grouped by category, and the three largest are shown right away.
- Tap a row to change the amount for this month only, skip it or **Edit item** (name, amount, category, period). **+ Add to Housing** adds a cost with the same category, person and frequency.
- Change month with **◀ ▶** or swipe. Tap **Month** in the menu to return to the current month.
- **All items ›** below Add shows all recurring items, including ended and upcoming ones. Tap one to change it.
- Tap an item to change it. The amount at the top applies only to the month you are viewing. Under **Edit the item (all months)** you change name, regular amount, how often, category and period. **Delete the item** moves it to the trash.
- To end an item, fill in **To month**. Items that have ended or not started show in the months they apply to.

## Savings
- Savings are not a cost, but they are deducted from what is left. Add with **+ Saving**: name, amount, frequency and preferably **Balance now**. A savings account is then created that counts up by itself every month.
- The **🐷 Savings** card in Month shows the month's savings and **Total saved** in your currency. Tap to unfold one row per account: balance in your currency, the monthly saving and the change since last month. Accounts in another currency show their own amount in brackets, e.g. (730 USD).
- Tap a row to change the amount, choose which **Savings account** the money goes to, or correct the balance. A balance marked ≈ is estimated: last entered plus the savings.
- If the saving is taken before your net salary is paid (e.g. shares through work), tick **Taken before payday**. It then counts as saved but does not reduce Left. The same option is available on a one-off in the Savings category.
- Accounts you never touch (e.g. the children's) can be hidden from Month: tap the row in the Savings card and untick **Show in Month**. Tap the name under "+ 1 hidden account" to show it again. It still counts in Total saved.
- Savings accounts are managed only here. **Account ›** in the box for a savings item changes the account's currency, which savings items go there, or deletes the account (it goes to the trash).
- The total and a chart of all accounts are under **Overview → Savings accounts**.

## Close the month
- What is shown under Left is planned. Food, fun and unexpected spending do not show there.
- Below Left it says when it is time to close (e.g. *Close the month Tue 24 Nov · in 6 days*). Three days before, the line gets a colour, and when the day has come it says **Time to close the month**.
- The day before payday, tap **✓ Close the month** under Left and enter what was actually left in the account. In the same dialog you reconcile the savings accounts (prefilled – only change what differs).
- Left then shows the actual amount, and the difference is shown as **Variable** in the bar. The next month becomes the current one right away.
- Once you have started closing months, months that are not closed are shown at the top of Month (**Not closed: Oct**) – tap to go there. **Edit** corrects the amount, **Reopen** removes the closing.

## Payday
- Under **Settings → Household → Payday** you choose which day the budget month starts. The 1st means normal calendar months.
- With payday on the 25th, the salary on 25 November covers December. That month is called **December**, with **25 Nov – 24 Dec** below.
- If you change payday the items move along, so November is still November (Undo is available). If the current month is empty but the next has items, **Start the items in …** is shown – tap it to move everything back one month.
- If payday falls on a Saturday or Sunday, the app assumes the salary arrives the Friday before. **Close month** always asks for the balance on the last weekday before payday, usually the Thursday when the salary comes on Friday.

## Overview
- At the top **last month** – the latest one you have closed: **Spending** (what was left after bills and savings minus what was actually left over – food, fun and the rest), **🐷 Total saved** (the total in the savings accounts) and **Left**. ▲▼ shows the difference from the month before.
- Then the savings accounts total with a chart, and **Month by month**: spending and saved for each closed month. Tap a month to open it.
- The overview is based on closed months – close the month the day before payday (see above).

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
