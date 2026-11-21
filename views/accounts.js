// Budget buddy – Sparkonton. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Sparkonton (balances entered by hand, separate from Kvar) ----------
let dialogAcc = null;
function renderAccounts() {
  const accs = data.accounts;
  const total = (m) => Math.round(accs.reduce((s, a) => s + toSek(estBalance(data, a, m)?.amount || 0, a.currency), 0) / 100) * 100;   // hela kronor
  const foreign = accs.some((a) => a.currency !== home());
  // Hemvalutan i fokus (2026-11-17): stor total, varje konto i hemvalutan, egen valuta inom parentes.
  // 2026-11-21: ändringen räknas bara på konton som hade ett värde förra månaden (annars blev hela saldot "ändring").
  const pm = addMonths(month, -1), cmp = accs.filter((a) => estBalance(data, a, pm) && estBalance(data, a, month));
  const sumOf = (list, m) => Math.round(list.reduce((s, a) => s + toSek(estBalance(data, a, m).amount, a.currency), 0) / 100) * 100;
  const tNow = total(month), tDiff = cmp.length ? sumOf(cmp, month) - sumOf(cmp, pm) : 0;
  $('acc-total').textContent = accs.length ? (foreign ? '≈ ' : '') + kr(tNow) : '';
  $('acc-total-diff').textContent = tDiff ? `${tDiff > 0 ? '+' : '−'}${kr(Math.abs(tDiff))} sedan ${monthShortLabel(addMonths(month, -1)).toLowerCase()}` : '';
  $('acc-total-diff').className = 'acc-total-diff ' + (tDiff < 0 ? 'neg' : 'pos');
  $('acc-rates').textContent = foreign ? `Utländsk valuta räknas om: ${ratesNote()} (ändras under Inställningar).` : '';
  $('stats-accounts').hidden = !accs.length;   // 2026-11-18: bara summa och graf här, kontona ändras i Månad

  // Total savings balance, the 12 months up to the chosen month
  // Grafen börjar vid första månaden med saldo (minst 4 månader), så att staplarna inte blir tunna streck.
  let ms = Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)), vals = ms.map(total);
  if (vals.filter((v) => v > 0).length < 2) { fill($('acc-chart')); return; }   // en stapel säger inget
  const firstI = Math.min(vals.findIndex((v) => v > 0), 8);
  ms = ms.slice(firstI); vals = vals.slice(firstI);
  const W = 340, H = 140, P = { l: 40, r: 6, t: 8, b: 20 };
  const top = Math.max(1, ...vals);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / top);
  const cw = (W - P.l - P.r) / ms.length, bw = Math.min(28, Math.max(4, cw * 0.6));
  const short = (ore) => nf0.format(Math.round(ore / 100000)) + 'k';
  const kids = [0, 0.5, 1].map((f) => [
    svg('line', { class: 'grid', x1: P.l, x2: W - P.r, y1: y(top * f), y2: y(top * f) }),
    svg('text', { class: 'ax', x: P.l - 4, y: y(top * f) + 3, 'text-anchor': 'end' }, short(top * f))]);
  vals.forEach((v, i) => {
    const cx = P.l + cw * i + cw / 2;
    kids.push(svg('rect', { class: 'b-in' + (ms[i] === month ? ' b-cur' : ''), x: cx - bw / 2, y: y(v), width: bw, height: y(0) - y(v), rx: 1 }));
    if (ms.length <= 6 || i % 2 === (ms.length - 1) % 2) kids.push(svg('text', { class: 'ax', x: cx, y: H - 6, 'text-anchor': 'middle' }, monthShortLabel(ms[i])));
  });
  fill($('acc-chart'), svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Totalt sparsaldo per månad, ${monthLabel(ms[0])} till ${monthLabel(month)}` }, kids),
  // En serie (2026-11-21): ingen färgförklaring, bara enheten.
  el('div', { class: 'legend' }, el('span', { class: 'muted', text: `Totalt sparsaldo, tusental ${unit()}` })));
}

function openAccDialog(a) {
  dialogAcc = a;
  const cur = balanceAt(a, month);
  const isNew = !data.accounts.some((x) => x.id === a.id);   // 2026-11-21: nytt konto direkt, utan sparpost
  $('ad-title').textContent = isNew ? 'Nytt sparkonto' : a.name;
  $('ad-name').value = a.name || '';
  $('ad-delete').hidden = isNew;
  // Nytt konto: namnet överst; befintligt: namnet under Fler inställningar (2026-11-21).
  if (isNew) $('ad-name-new').append($('ad-name-wrap')); else $('ad-more').querySelector('summary').after($('ad-name-wrap'));
  $('ad-more').open = false;
  $('ad-sub').textContent = !cur ? '' : cur.month === month ? `Ifyllt i ${monthLabel(month).toLowerCase()}.` : `Senast ifyllt ${money(cur.amount, a.currency)} i ${monthLabel(cur.month).toLowerCase()} – förslaget här är det plus sparandet sedan dess.`;
  $('ad-currency').value = a.currency;
  $('ad-show').checked = !a.hidden;
  setAccCurrencyLabel();
  const est = estBalance(data, a, month);
  $('ad-amount').value = Object.hasOwn(a.balances, month) ? krInput(a.balances[month]) : '';
  $('ad-amount').placeholder = est && est.estimated ? krInput(est.amount) : '';
  // Sparmål (2026-11-21): valfritt – fälten visas först efter + Sparmål, eller när kontot redan har ett mål.
  const g = a.goal;
  $('ad-goal').hidden = !g; $('ad-goal-add').hidden = !!g;
  $('ad-pay').value = a.pay ? krInput(a.pay.amount) : '';   // v5: sparande från lönen ligger på kontot
  $('ad-pre').value = a.pre ? krInput(a.pre.amount) : '';   // v4: före lön och insättning ligger på kontot
  $('ad-goal-amount').value = g ? krInput(g.amount) : '';
  { // appens månadsnamn (lönedag), 3 år framåt från vald månad
    const ms = Array.from({ length: 36 }, (_, i) => addMonths(month, i + 1));
    if (g?.month && !ms.includes(g.month)) ms.unshift(g.month);
    $('ad-goal-month').replaceChildren(el('option', { value: '', text: '–' }), ...ms.map((m) => el('option', { value: m, text: monthLabel(m) })));
  }
  $('ad-goal-month').value = g?.month || '';
  $('ad-error').textContent = '';
  $('acc-dialog').showModal();
  $('acc-dialog').focus();   // 2026-11-21: inget tangentbord direkt
}
function setAccCurrencyLabel() {
  const c = $('ad-currency').value;
  $('ad-amount-label').textContent = `Värde (${unit(c)})`;
  $('ad-goal-label').textContent = `Sparmål (${unit(c)})`;
}
$('ad-currency').replaceChildren(...CURRENCIES.map((c) => el('option', { value: c, text: CUR_NAMES[c] })));
$('ad-currency').addEventListener('change', setAccCurrencyLabel);
$('ad-goal-add').addEventListener('click', () => { $('ad-goal-add').hidden = true; $('ad-goal').hidden = false; $('ad-goal-amount').focus(); });
$('ad-cancel').addEventListener('click', () => $('acc-dialog').close());
$('ad-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = $('ad-amount').value.trim();
  const amount = raw ? parseKr(raw) : null;
  if (raw && (amount == null || !isAmount(amount))) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  // Tomt mål = inget mål (tas bort). Månad utan belopp ignoreras.
  const gRaw = $('ad-goal-amount').value.trim(), gAmount = gRaw ? parseKr(gRaw) : null;
  if (gRaw && (gAmount == null || !isAmount(gAmount) || gAmount <= 0)) { $('ad-error').textContent = 'Skriv ett sparmål, t.ex. 15 000 – eller lämna fältet tomt.'; return; }
  const gMonth = $('ad-goal-month').value;
  const num = (id) => { const v = $(id).value.trim(); return v ? parseKr(v) : 0; };
  const preAmt = num('ad-pre'), payAmt = num('ad-pay');
  if (preAmt == null || payAmt == null || preAmt < 0 || payAmt < 0) { $('ad-error').textContent = 'Skriv ett belopp, t.ex. 3 400 – eller lämna fältet tomt.'; return; }
  const name = cleanName($('ad-name').value, 30);
  if (!name) { $('ad-error').textContent = 'Skriv ett namn på kontot.'; return; }
  if (data.accounts.some((x) => x.id !== dialogAcc.id && x.name.toLowerCase() === name.toLowerCase())) { $('ad-error').textContent = `Det finns redan ett konto som heter ${name}.`; return; }
  const isNewAcc = !data.accounts.some((x) => x.id === dialogAcc.id);
  if (isNewAcc && data.accounts.length >= MAX_ACCOUNTS) { $('ad-error').textContent = `Max ${MAX_ACCOUNTS} sparkonton – ta bort något först.`; return; }
  const before = JSON.stringify(data);   // Ångra (2026-11-21)
  const old = data.accounts.find((x) => x.id === dialogAcc.id);
  if (!raw && !old?.feeds?.length && !preAmt && !payAmt && !Object.keys(old?.balances || {}).length) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  let a = old;
  if (!a) { a = { id: dialogAcc.id, name, currency: home(), balances: {}, feeds: [] }; data.accounts.push(a); }
  a.name = name;
  if (a) { if (raw) a.balances[month] = amount; a.currency = $('ad-currency').value; a.hidden = !$('ad-show').checked;
    if (gAmount) a.goal = { amount: gAmount, ...(isMonth(gMonth) ? { month: gMonth } : {}) }; else delete a.goal;
    if (payAmt) a.pay = { amount: payAmt, from: a.pay?.from && a.pay.from <= month ? a.pay.from : month, ...(a.pay?.end ? { end: a.pay.end } : {}) }; else delete a.pay;
    if (preAmt) a.pre = { amount: preAmt, from: a.pre?.from && a.pre.from <= month ? a.pre.from : month }; else delete a.pre;
  }   // äldre kopplingar (feeds) och insättningar (deposits) behålls som de är
  data = loadData(data);
  $('acc-dialog').close();
  save();
  snackbar(isNewAcc ? `${name} skapat` : `${name} sparat`, 'Ångra', () => { data = loadData(JSON.parse(before)); save(); });
});
$('ad-delete').addEventListener('click', () => {
  const a = dialogAcc;
  $('acc-dialog').close();
  withUndo(`${a.name} ligger i papperskorgen`, () => trashItems(data, 'acc', [a.id], isoToday()));
});

function newAccount() {
  if (data.accounts.length >= MAX_ACCOUNTS) { snackbar(`Max ${MAX_ACCOUNTS} sparkonton – ta bort något först.`); return; }
  openAccDialog({ id: 'a' + newId().slice(-10), name: '', currency: home(), balances: {}, feeds: [] });
}

// ＋ Lägg till → Före lön / insättning (2026-11-21): välj konto (eller skapa nytt), kontodialogen öppnas.
function openAccPick() {
  if (!data.accounts.length) { newAccount(); return; }
  fill($('ap-list'), data.accounts.map((a) => el('li', {}, el('button', { type: 'button', class: 'acc-set-row',
    on: { click: () => { $('accpick-dialog').close(); setTimeout(() => openAccDialog(a), 0); } } },
    el('span', { text: a.name }), el('span', { class: 'muted', text: (() => { const e = estBalance(data, a, month); return e ? (e.estimated ? '≈ ' : '') + money(e.amount, a.currency) : '–'; })() })))));   // värdet, så att man ser vilket konto
  $('accpick-dialog').showModal();
}
$('ap-new').addEventListener('click', () => { $('accpick-dialog').close(); setTimeout(newAccount, 0); });
$('ap-cancel').addEventListener('click', () => $('accpick-dialog').close());
