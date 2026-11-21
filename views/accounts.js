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
  // Sparmål (2026-11-21): valfritt – fälten visas först efter + Sparmål, eller när kontot redan har ett mål.
  const g = a.goal;
  $('ad-goal').hidden = !g; $('ad-goal-add').hidden = !!g;
  $('ad-goal-amount').value = g ? krInput(g.amount) : '';
  { // appens månadsnamn (lönedag), 3 år framåt från vald månad
    const ms = Array.from({ length: 36 }, (_, i) => addMonths(month, i + 1));
    if (g?.month && !ms.includes(g.month)) ms.unshift(g.month);
    $('ad-goal-month').replaceChildren(el('option', { value: '', text: '–' }), ...ms.map((m) => el('option', { value: m, text: monthLabel(m) })));
  }
  $('ad-goal-month').value = g?.month || '';
  $('ad-error').textContent = '';
  $('acc-dialog').showModal();
  $('ad-amount').focus();
}
function setAccCurrencyLabel() {
  const c = $('ad-currency').value;
  $('ad-amount-label').textContent = `Saldo (${unit(c)})`;
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
  const a = data.accounts.find((x) => x.id === dialogAcc.id);
  const feeds = [...$('ad-feeds').querySelectorAll('input:checked')].map((i) => i.value);
  if (!raw && !a?.feeds?.length && !feeds.length && !Object.keys(a?.balances || {}).length) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  if (a) { if (raw) a.balances[month] = amount; a.currency = $('ad-currency').value; a.feeds = feeds; a.hidden = !$('ad-show').checked;
    if (gAmount) a.goal = { amount: gAmount, ...(isMonth(gMonth) ? { month: gMonth } : {}) }; else delete a.goal; }
  data = loadData(data);
  $('acc-dialog').close();
  save();
});
$('ad-delete').addEventListener('click', () => {
  const a = dialogAcc;
  $('acc-dialog').close();
  withUndo(`${a.name} ligger i papperskorgen`, () => trashItems(data, 'acc', [a.id], isoToday()));
});
$('acc-manage').addEventListener('click', () => {
  showTab('month');
  const c = $('savings-card'), d = c.querySelector('details');
  if (d) d.open = true;
  c.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
