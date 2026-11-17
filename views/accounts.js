// Budget buddy – Sparkonton. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Sparkonton (balances entered by hand, separate from Kvar) ----------
let dialogAcc = null;
function renderAccounts() {
  const accs = data.accounts;
  const total = (m) => Math.round(accs.reduce((s, a) => s + toSek(estBalance(data, a, m)?.amount || 0, a.currency), 0) / 100) * 100;   // hela kronor
  const foreign = accs.some((a) => a.currency !== home());
  // Hemvalutan i fokus (2026-11-17): stor total, varje konto i hemvalutan, egen valuta inom parentes.
  const tNow = total(month), tDiff = accs.length ? tNow - total(addMonths(month, -1)) : 0;
  $('acc-total').textContent = accs.length ? (foreign ? '≈ ' : '') + kr(tNow) : '';
  $('acc-total-diff').textContent = tDiff ? `${tDiff > 0 ? '+' : '−'}${kr(Math.abs(tDiff))} sedan ${monthShortLabel(addMonths(month, -1)).toLowerCase()}` : '';
  $('acc-total-diff').className = 'acc-total-diff ' + (tDiff < 0 ? 'neg' : 'pos');
  $('acc-rates').textContent = foreign ? `Utländsk valuta räknas om: ${ratesNote()} (ändras under Inställningar).` : '';
  fill($('acc-list'), accs.length ? accs.map((a) => {
    const cur = estBalance(data, a, month), real = balanceAt(a, month);
    const prev = cur ? estBalance(data, a, addMonths(month, -1)) : null;
    const diff = cur && prev ? cur.amount - prev.amount : null;
    const feedNames = (a.feeds || []).map((id) => data.recurring.find((r) => r.id === id)?.name).filter(Boolean);
    const foreignA = a.currency !== home();
    const subBits = [foreignA && cur ? `(${money(cur.amount, a.currency)})` : null,
      !cur ? 'Inget saldo än – tryck för att fylla i'
        : cur.estimated ? `beräknat + ${feedNames.join(', ')}`
        : real && real.month !== month ? `ifyllt ${monthShortLabel(real.month).toLowerCase()}` : null].filter(Boolean);
    const sub = subBits.join(' · ');
    const homeAmt = cur ? Math.round(toSek(cur.amount, a.currency) / 100) * 100 : null;
    const homeDiff = diff != null ? Math.round(toSek(diff, a.currency) / 100) * 100 : null;
    return el('li', { class: 'row' }, el('button', { type: 'button', class: 'row-main',
      'aria-label': `${a.name}, ${cur ? money(cur.amount, a.currency) : 'inget saldo'}. Fyll i saldo`, on: { click: () => openAccDialog(a) } },
    el('span', { class: 'row-name' }, el('span', { text: a.name }), sub ? el('span', { class: 'row-sub', text: sub }) : null),
    el('span', { class: 'acc-amt amount' }, el('span', { text: cur ? ((cur.estimated || foreignA) ? '≈ ' : '') + kr(homeAmt) : '–' }),
      homeDiff ? el('span', { class: 'row-sub ' + (homeDiff < 0 ? 'neg' : 'pos'), text: kr(homeDiff, true) }) : null)));
  }) : el('li', { class: 'muted empty-row', text: 'Inga sparkonton än – lägg till det första nedan.' }));

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
  el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Totalt sparsaldo', el('span', { class: 'muted', text: `(tusental ${unit()})` })));
}

function openAccDialog(a) {
  dialogAcc = a;
  const cur = balanceAt(a, month);
  $('ad-title').textContent = a.name;
  $('ad-sub').textContent = `Saldo i ${monthLabel(month).toLowerCase()}.` + (cur && cur.month !== month ? ` Senast: ${money(cur.amount, a.currency)} (${monthLabel(cur.month).toLowerCase()}).` : '');
  $('ad-currency').value = a.currency;
  $('ad-show').checked = !a.hidden;
  setAccCurrencyLabel();
  const est = estBalance(data, a, month);
  $('ad-amount').value = Object.hasOwn(a.balances, month) ? krInput(a.balances[month]) : '';
  $('ad-amount').placeholder = est && est.estimated ? krInput(est.amount) : '';
  // Sparposter som fyller på kontot (2026-11-17): kryssa i, så räknas saldot upp varje månad.
  const savers = data.recurring.filter((r) => r.type === 'expense' && r.category === SAVINGS_CAT);
  fill($('ad-feeds'), savers.length ? [el('p', { class: 'small', text: 'Sparande som går hit varje månad:' }),
    ...savers.map((r) => el('label', { class: 'check' }, el('input', { type: 'checkbox', value: r.id, checked: (a.feeds || []).includes(r.id) }),
      el('span', { text: `${r.name} · ${kr(r.amount)}` })))]
    : el('p', { class: 'muted small', text: 'Lägg en återkommande kostnad i kategorin Sparande, så kan den kopplas hit och saldot räknas upp själv.' }));
  $('ad-error').textContent = '';
  $('acc-dialog').showModal();
  $('ad-amount').focus();
}
function setAccCurrencyLabel() {
  const c = $('ad-currency').value;
  $('ad-amount-label').textContent = `Saldo (${unit(c)})`;
}
$('ad-currency').replaceChildren(...CURRENCIES.map((c) => el('option', { value: c, text: CUR_NAMES[c] })));
$('ad-currency').addEventListener('change', setAccCurrencyLabel);
$('ad-cancel').addEventListener('click', () => $('acc-dialog').close());
$('ad-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = $('ad-amount').value.trim();
  const amount = raw ? parseKr(raw) : null;
  if (raw && (amount == null || !isAmount(amount))) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  const a = data.accounts.find((x) => x.id === dialogAcc.id);
  const feeds = [...$('ad-feeds').querySelectorAll('input:checked')].map((i) => i.value);
  if (!raw && !a?.feeds?.length && !feeds.length && !Object.keys(a?.balances || {}).length) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  if (a) { if (raw) a.balances[month] = amount; a.currency = $('ad-currency').value; a.feeds = feeds; a.hidden = !$('ad-show').checked; }
  data = loadData(data);
  $('acc-dialog').close();
  save();
});
$('ad-delete').addEventListener('click', () => {
  const a = dialogAcc;
  $('acc-dialog').close();
  withUndo(`${a.name} ligger i papperskorgen`, () => trashItems(data, 'acc', [a.id], isoToday()));
});
$('acc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName($('acc-name').value, 30);
  if (!n) return;
  if (data.accounts.length >= MAX_ACCOUNTS) { snackbar(`Max ${MAX_ACCOUNTS} sparkonton.`, null, null, 3000); return; }
  const a = { id: 'a' + newId().slice(-10), name: n, currency: home(), balances: {} };   // nytt konto i hemvalutan
  data.accounts.push(a);
  data = loadData(data);
  $('acc-name').value = '';
  save();
  openAccDialog(data.accounts.find((x) => x.id === a.id));
});
