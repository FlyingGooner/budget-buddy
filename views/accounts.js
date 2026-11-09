// Budget buddy – Sparkonton. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Sparkonton (balances entered by hand, separate from Kvar) ----------
let dialogAcc = null;
function renderAccounts() {
  const accs = data.accounts;
  const total = (m) => accs.reduce((s, a) => s + toSek(balanceAt(a, m)?.amount || 0, a.currency), 0);
  const foreign = accs.some((a) => a.currency !== 'SEK');
  $('acc-total').textContent = accs.length ? (foreign ? '≈ ' : '') + kr(total(month)) : '';
  $('acc-rates').textContent = foreign ? `Omräknat till kronor: ${ratesNote()}. Kurserna ändras under Inställningar.` : '';
  fill($('acc-list'), accs.length ? accs.map((a) => {
    const cur = balanceAt(a, month), prev = prevBalance(a, month);
    const diff = cur && prev ? cur.amount - prev.amount : null;
    const sub = !cur ? 'Inget saldo än – tryck för att fylla i'
      : cur.month === month ? 'Ifyllt den här månaden' : `Senast ifyllt ${monthLabel(cur.month).toLowerCase()}`;
    return el('li', { class: 'row' }, el('button', { type: 'button', class: 'row-main',
      'aria-label': `${a.name}, ${cur ? money(cur.amount, a.currency) : 'inget saldo'}. Fyll i saldo`, on: { click: () => openAccDialog(a) } },
    el('span', { class: 'row-name' }, el('span', { text: a.name }), el('span', { class: 'row-sub', text: sub })),
    el('span', { class: 'acc-amt amount' }, el('span', { text: cur ? money(cur.amount, a.currency) : '–' }),
      cur && a.currency !== 'SEK' ? el('span', { class: 'row-sub', text: '≈ ' + kr(toSek(cur.amount, a.currency)) }) : null,
      diff != null ? el('span', { class: 'row-sub ' + (diff < 0 ? 'neg' : 'pos'), text: money(diff, a.currency, true) }) : null)));
  }) : el('li', { class: 'muted empty-row', text: 'Inga sparkonton än – lägg till det första nedan.' }));

  // Total savings balance, the 12 months up to the chosen month
  const ms = Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)), vals = ms.map(total);
  if (!vals.some((v) => v > 0)) { fill($('acc-chart')); return; }
  const W = 340, H = 140, P = { l: 40, r: 6, t: 8, b: 20 };
  const top = Math.max(1, ...vals);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / top);
  const cw = (W - P.l - P.r) / 12, bw = Math.max(4, cw * 0.6);
  const short = (ore) => nf0.format(Math.round(ore / 100000)) + 'k';
  const kids = [0, 0.5, 1].map((f) => [
    svg('line', { class: 'grid', x1: P.l, x2: W - P.r, y1: y(top * f), y2: y(top * f) }),
    svg('text', { class: 'ax', x: P.l - 4, y: y(top * f) + 3, 'text-anchor': 'end' }, short(top * f))]);
  vals.forEach((v, i) => {
    const cx = P.l + cw * i + cw / 2;
    kids.push(svg('rect', { class: 'b-in' + (ms[i] === month ? ' b-cur' : ''), x: cx - bw / 2, y: y(v), width: bw, height: y(0) - y(v), rx: 1 }));
    if (i % 2 === 1 || i === 11) kids.push(svg('text', { class: 'ax', x: cx, y: H - 6, 'text-anchor': 'middle' }, monthShortLabel(ms[i])));
  });
  fill($('acc-chart'), svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Totalt sparsaldo per månad, ${monthLabel(ms[0])} till ${monthLabel(month)}` }, kids),
  el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Totalt sparsaldo', el('span', { class: 'muted', text: '(tusental kr)' })));
}

function openAccDialog(a) {
  dialogAcc = a;
  const cur = balanceAt(a, month);
  $('ad-title').textContent = a.name;
  $('ad-sub').textContent = `Saldo i ${monthLabel(month).toLowerCase()}.` + (cur && cur.month !== month ? ` Senast: ${money(cur.amount, a.currency)} (${monthLabel(cur.month).toLowerCase()}).` : '');
  $('ad-currency').value = a.currency;
  setAccCurrencyLabel();
  $('ad-amount').value = Object.hasOwn(a.balances, month) ? krInput(a.balances[month]) : '';
  $('ad-error').textContent = '';
  $('acc-dialog').showModal();
  $('ad-amount').focus();
}
function setAccCurrencyLabel() {
  const c = $('ad-currency').value;
  $('ad-amount-label').textContent = c === 'SEK' ? 'Saldo (kr)' : `Saldo (${c})`;
}
$('ad-currency').replaceChildren(...CURRENCIES.map((c) => el('option', { value: c, text: c === 'SEK' ? 'Kronor (SEK)' : c })));
$('ad-currency').addEventListener('change', setAccCurrencyLabel);
$('ad-cancel').addEventListener('click', () => $('acc-dialog').close());
$('ad-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseKr($('ad-amount').value);
  if (amount == null || !isAmount(amount)) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  const a = data.accounts.find((x) => x.id === dialogAcc.id);
  if (a) { a.balances[month] = amount; a.currency = $('ad-currency').value; }
  data = loadData(data);
  $('acc-dialog').close();
  save();
});
$('ad-delete').addEventListener('click', () => {
  const a = dialogAcc;
  $('acc-dialog').close();
  withUndo(`${a.name} togs bort`, () => { data.accounts = data.accounts.filter((x) => x.id !== a.id); });
});
$('acc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName($('acc-name').value, 30);
  if (!n) return;
  if (data.accounts.length >= MAX_ACCOUNTS) { snackbar(`Max ${MAX_ACCOUNTS} sparkonton.`, null, null, 3000); return; }
  const a = { id: 'a' + newId().slice(-10), name: n, balances: {} };
  data.accounts.push(a);
  data = loadData(data);
  $('acc-name').value = '';
  save();
  openAccDialog(data.accounts.find((x) => x.id === a.id));
});
