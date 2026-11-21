// Budget buddy – Månad + raddialogen. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Month view ----------
function markers(r) {
  return el('span', { class: 'markers', 'aria-hidden': 'true' },
    r.kind === 'rec' ? '↻' : r.kind === 'carry' ? '⇢' : '★', r.adjusted ? '✎' : null);
}
function rowLabel(r) {
  const bits = [r.kind === 'rec' ? 'återkommande' : r.kind === 'carry' ? 'från stängningen av förra månaden' : 'avvikelse'];
  if (r.adjusted) bits.push('justerad denna månad');
  return bits.join(', ');
}

function monthRow(r) {
  const li = el('li', { class: 'row' });
  li.append(el('button', { type: 'button', class: 'row-main', 'aria-label': `${r.name}, ${kr(r.amount)}, ${rowLabel(r)}. Ändra`,
    on: { click: () => (r.kind === 'carry' ? setMonth(addMonths(month, -1)) : openRowDialog(r)) } },
    el('span', { class: 'row-name' }, el('span', { text: r.name }), el('span', { class: 'row-sub', text: subLine(r) })),
    el('span', { class: 'amount', text: kr(r.amount) }), markers(r)));
  return li;
}

// Ostängda månader (2026-11-17): flera månader kan vara öppna. Har man börjat stänga månader påminns man om
// tidigare månader (från den första stängda) som inte är stängda – tryck för att gå dit och stänga.
function unclosedMonths() {
  const ms = Object.keys(data.closed).sort();
  if (!ms.length) return [];
  const out = [];
  for (let x = ms[0]; x < activeMonth() && out.length < 24; x = addMonths(x, 1)) {
    const t = monthTotals(data, x);
    if (!t.closed && (t.income || t.expense)) out.push(x);
  }
  return out;
}
function renderOpenMonths() {
  const open = unclosedMonths().filter((m) => m !== month);
  $('open-months').hidden = !open.length;
  fill($('open-months'), open.length ? [el('span', { text: open.length === 1 ? 'Inte stängd:' : 'Inte stängda:' }),
    ...open.slice(-4).map((m) => el('button', { type: 'button', class: 'om-chip', text: (named(m).slice(0, 4) !== named(activeMonth()).slice(0, 4) ? monthShortYear(m) : monthShortLabel(m)),
      'aria-label': `Gå till ${monthLabel(m)} och stäng den`, on: { click: () => setMonth(m) } }))] : null);
}

function renderMonth() {
  renderOpenMonths();
  $('month-title').replaceChildren(...monthTitle(month));
  // 2026-11-18: störst belopp först, lika belopp i bokstavsordning – samma ordning i alla kort och i Alla poster.
  const rows = rowsForMonth(data, month).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'sv'));
  const t = monthTotals(data, month);   // stängd månad: left = faktiskt kvar
  const bal = balanceAfter(data, month);

  const income = rows.filter((r) => r.type === 'income');
  const expense = rows.filter((r) => r.type === 'expense' && r.category !== SAVINGS_CAT);
  const saving = rows.filter((r) => r.type === 'expense' && r.category === SAVINGS_CAT);   // eget kort (2026-11-17)

  // Nothing at all this month: one welcoming card instead of three empty ones.
  const blank = !rows.length;
  $('income-card').hidden = $('expense-card').hidden = blank;
  $('savings-card').hidden = blank || (!saving.length && !data.accounts.length);
  monthHints(blank ? [] : rows);
  if (blank) {
    const any = data.recurring.length || data.oneOffs.length;
    const step = (n, text) => el('li', {}, el('span', { class: 'step-n', text: n }), el('span', { text }));
    fill($('summary'),
      el('h2', { text: any ? 'Inget den här månaden' : 'Kom igång' }),
      any ? el('p', { class: 'muted', text: 'Inga poster gäller den här månaden. Lägg till en avvikelse nedan eller gå till innevarande månad.' })
        : el('ol', { class: 'steps' },
          step('1', 'Lägg in nettolönen och andra inkomster.'),
          step('2', 'Lägg in räkningarna – hyra, el, försäkringar …'),
          step('3', 'Se vad som blir kvar varje månad – och hur mycket du sparar.')),
      // 2026-11-18: posterna börjar först nästa månad (t.ex. efter att lönedag valts) – erbjud att flytta dem hit.
      any && month === activeMonth() && rowsForMonth(data, addMonths(month, 1)).length ? el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn filled', text: `Börja posterna i ${monthLabel(month).toLowerCase()}`,
          on: { click: () => withUndo('Posterna flyttades en månad bakåt', () => { shiftMonths(data, -1); data = loadData(data); }) } })) : null,
      el('div', { class: 'actions' },
        any ? el('button', { type: 'button', class: 'btn tonal', text: 'Till innevarande månad', on: { click: () => setMonth(activeMonth()) } })
          : el('button', { type: 'button', class: 'btn filled', text: 'Lägg till inkomst', on: { click: () => focusAdd('income') } })));
    return;
  }

  const pct = t.income ? Math.min(100, Math.round((t.expense / t.income) * 100)) : (t.expense ? 100 : 0);
  const barFill = el('div', { class: 'bar-fill' + (t.left < 0 ? ' over' : '') });
  barFill.style.width = pct + '%'; // CSSOM, allowed by CSP
  // Mer synligt (2026-11-17): fördelning av inkomsten (kostnader / sparande / kvar), jämförelse med förra månaden, saldo.
  const prevT = monthTotals(data, addMonths(month, -1));
  const varSpend = t.closed ? Math.max(0, t.planned - t.left) : 0;   // rörliga utgifter = planerat − faktiskt
  const fc = forecast(data, month);
  // 2026-11-21: jämför lika med lika – kvar på kontot bara när båda månaderna är stängda, annars efter räkningar.
  const both = t.closed && prevT.closed, plan = (x) => (x.closed ? x.planned : x.left);
  const delta = (both ? t.left - prevT.left : plan(t) - plan(prevT)), hasPrev = prevT.income || prevT.expense;
  const base = Math.max(t.income, t.expense + varSpend, 1);
  const seg = (cls, v, label) => { const x = el('span', { class: 'seg ' + cls, title: label }); x.style.width = Math.max(0, (v / base) * 100) + '%'; return x; };
  // 2026-11-21: öppen månad = vad som finns efter räkningar och sparande; stängd = det som faktiskt fanns kvar på kontot.
  const leftWord = t.closed ? 'Kvar på kontot' : 'Efter räkningar';
  const legend = (cls, label) => el('span', { class: 'lgd' }, el('span', { class: 'dot ' + cls }), label);
  fill($('summary'), fold('kvar', [el('h2', { text: leftWord }),
    el('p', { class: 'big ' + (t.left < 0 ? 'neg' : 'pos'), text: kr(t.left, true) }),
    closeLine(t),
    // 2026-11-18: beloppen står i korten nedan – här bara jämförelsen, stapeln och färgernas namn.
    hasPrev && delta ? el('p', { class: 'delta ' + (delta < 0 ? 'neg' : 'pos'), text: `${delta > 0 ? '▲' : '▼'} ${kr(Math.abs(delta))} mot ${monthShortLabel(addMonths(month, -1)).toLowerCase()}` }) : null,
    el('div', { class: 'segbar', role: 'img', 'aria-label': `Av inkomsten: kostnader ${kr(t.expense - t.savings)}, sparande ${kr(t.savings)}, ${leftWord.toLowerCase()} ${kr(Math.max(0, t.left))}` },
      seg('s-exp', t.expense - t.savings, 'Kostnader'), seg('s-sav', t.savings, 'Sparande'), seg('s-var', varSpend, 'Rörligt'), seg('s-left', Math.max(0, t.left), leftWord)),
    el('div', { class: 'lgds' }, legend('s-exp', 'Kostnader'), t.savings ? legend('s-sav', 'Sparande') : null, varSpend ? legend('s-var', 'Rörligt') : null,
      t.left > 0 ? legend('s-left', leftWord) : null),
    // 2026-11-21: förra månadens kvar (faktiskt om den är stängd) – för att följa ekonomin över tid.
    // 2026-11-21: prognos på samma rad; tryck för förklaringen.
    // 2026-11-21: en rad var – " · " mellan dem bröts fult på telefonen.
    hasPrev || fc ? el('div', { class: 'muted small prev-fc' },
      hasPrev ? el('span', { text: `${prevT.closed ? 'Kvar på kontot' : 'Efter räkningar'} i ${monthShortLabel(addMonths(month, -1)).toLowerCase()}: ${kr(prevT.left, true)}` }) : null,
      fc ? el('button', { type: 'button', class: 'link', 'aria-expanded': String(fcOpen), text: `Kvar vid stängning: ≈ ${kr(fc.left, true)}`,
        on: { click: (e) => { e.preventDefault(); e.stopPropagation(); fcOpen = !fcOpen; renderMonth(); } } }) : null) : null,
    fc && fcOpen ? el('p', { class: 'muted small', text: fcText(fc) }) : null,
    bal == null ? null : el('p', { class: 'muted small', text: `Saldo efter månaden: ${kr(bal)}` })],
    perPerson(rows)));

  // Empty card: one quiet line with a text link to Poster (like follow-diet-tracker), not a big button.
  const emptyMsg = (text, label, type) => el('p', { class: 'empty-line muted' }, text + ' ',
    el('button', { type: 'button', class: 'link', text: label, on: { click: () => focusAdd(type) } }));

  const sumAll = t.income + (t.pre || 0) - (t.expense - t.savings);
  // 2026-11-21: inkomster och kostnader i samma kort, två rader som fälls ut var för sig.
  fill($('income-card'), fold('inc',
    el('h2', { class: 'split' }, el('span', {}, 'Inkomster ', el('small', { class: 'netto', text: '(netto)' }), payNote() ? el('small', { class: 'netto', text: ' · ' }) : null, payNote() ? el('small', { class: 'netto', text: payNote() }) : null), el('span', { text: kr(t.income) })),
    income.length ? el('ul', { class: 'list' }, income.map(monthRow))
      : emptyMsg('Inga inkomster den här månaden.', 'Lägg till', 'income'),
    // 2026-11-21: kvar från förra månaden kan fyllas i för hand (t.ex. första månaden, före någon stängning).
    income.some((r) => r.kind === 'carry' || r.name === CARRY_NAME) ? null
      : el('p', { class: 'carry-add' }, el('button', { type: 'button', class: 'link', text: '+ Kvar från förra månaden', on: { click: openCarryDialog } }))),
    fold('exp',
    el('h2', { class: 'split' }, el('span', { text: 'Kostnader' }),
      el('span', { text: kr(t.expense - t.savings) })),
    expense.length ? expenseGroups(expense)
      : emptyMsg('Inga kostnader den här månaden.', 'Lägg till', 'expense')),
    // 2026-11-21: summa (inkomster − kostnader) och hur mycket av den som går till sparande.
    // 2026-11-21: sparande som dras före lönen räknas med – det har aldrig kommit in i nettolönen.
    el('div', { class: 'ie-sum' },
      el('h2', { class: 'split' }, el('span', { text: 'Summa' }), el('span', { class: sumAll < 0 ? 'neg' : null, text: kr(sumAll, true) })),
      t.savings ? el('p', { class: 'split ie-sav' }, el('span', { text: t.pre ? `Varav sparande (${kr(t.pre)} före lön)` : 'Varav sparande' }),
        el('span', { text: kr(t.savings) + (t.income + t.pre ? ` (${Math.round((t.savings / (t.income + t.pre)) * 100)} %)` : '') })) : null));
  $('expense-card').hidden = true;
  const cb = $('close-month');   // 2026-11-21: Stäng månad som knapp bredvid Lägg till / Alla poster
  if (cb) { cb.hidden = month > activeMonth() && !t.closed; cb.textContent = t.closed ? '🔓 Ändra' : '🔒 Stäng'; cb.setAttribute('aria-label', t.closed ? 'Ändra / öppna igen' : 'Stäng månad'); cb.onclick = openCloseDialog; $('add-pair').classList.toggle('three', !cb.hidden); }
  renderSavingsCard(saving, t);
}

// Sparande (2026-11-17): eget kort med andel av inkomsten, så att det syns att pengarna inte är borta.
// Sparande-kortet (2026-11-17, förenklat): en lista där varje rad är ett sparkonto med sitt månadssparande
// (sparpost + konto hör ihop). Sparposter utan konto får en egen rad. Tryck på en rad för att ändra.
function renderSavingsCard(saving, t) {
  if (!saving.length && !data.accounts.length) {   // 2026-11-21: synlig ingång även utan sparande
    const ie0 = document.querySelector('#income-card .ie-sum');
    if (ie0) ie0.append(el('p', { class: 'split ie-sav' }, el('span', { text: 'Sparkonton' }),
      el('button', { type: 'button', class: 'link', text: '+ Nytt sparkonto', on: { click: newAccount } })));
    return;
  }
  const share = t.income ? Math.round((t.savings / t.income) * 100) : 0;
  const prev = addMonths(month, -1), round = (v) => Math.round(v / 100) * 100;
  const used = new Set();
  // Dolda konton (t.ex. barnens, som inte rörs) räknas i Totalt sparat men visas inte som rad; deras sparposter döljs också.
  const hiddenAcc = data.accounts.filter((a) => a.hidden);
  const rowsAll = data.accounts.map((a) => {
    const cur = estBalance(data, a, month), was = estBalance(data, a, prev);
    const items = saving.filter((r) => (a.feeds || []).includes(r.id)); items.forEach((r) => used.add(r.id));
    return { name: a.name, a, items, monthly: items.reduce((x, r) => x + r.amount, 0), cur,
      now: cur ? round(toSek(cur.amount, a.currency)) : null, diff: cur && was ? round(toSek(cur.amount - was.amount, a.currency)) : null };
  }).concat(saving.filter((r) => !used.has(r.id)).map((r) => ({ name: r.name, items: [r], monthly: r.amount })));
  const rowsOut = rowsAll.filter((r) => !r.a || !r.a.hidden);
  const total = rowsAll.reduce((x, r) => x + (r.now || 0), 0), totalDiff = rowsAll.reduce((x, r) => x + (r.diff || 0), 0);
  const approx = rowsAll.some((r) => r.cur?.estimated || (r.a && r.a.currency !== home()));
  // 2026-11-21: Totalt sparat också i inkomst/kostnadskortet.
  const ie = document.querySelector('#income-card .ie-sum');
  const open = (r) => (r.items.length === 1 ? openRowDialog(r.items[0]) : r.a ? openAccDialog(r.a) : null);
  // Hopfällt (2026-11-17): rubrik och Totalt sparat syns, kontona fälls ut.
  // 2026-11-21: inget eget blått kort – Totalt sparat är en rad i det övre kortet som fälls ut med kontona.
  const savFold = fold('sav',
    el('h2', { class: 'split' }, el('span', { text: data.accounts.length ? 'Totalt sparat' : 'Sparande' }),
      el('span', { text: data.accounts.length ? (approx ? '≈ ' : '') + kr(total) : `${kr(t.savings)}/mån` })),
    totalDiff ? el('p', { class: 'sv-diff ' + (totalDiff < 0 ? 'neg' : 'pos'), text: `${totalDiff > 0 ? '+' : '−'}${kr(Math.abs(totalDiff))} sedan ${monthShortLabel(prev).toLowerCase()}` }) : null,
    el('ul', { class: 'sv-accs' }, rowsOut.map((r) => {
      const foreign = r.a && r.a.currency !== home();
      const sub = [r.monthly ? `+${kr(r.monthly)}/mån` : null, foreign && r.cur ? `(${money(r.cur.amount, r.a.currency)})` : null].filter(Boolean).join(' · ');
      return el('li', {}, el('button', { type: 'button', class: 'sv-row', 'aria-label': `${r.name}. Ändra`, on: { click: () => open(r) } },
        el('span', { class: 'sv-name' }, el('span', { text: r.name }), sub ? el('small', { text: sub }) : null),
        el('span', { class: 'sv-val' }, el('span', { text: r.a ? (r.cur ? ((r.cur.estimated || foreign) ? '≈ ' : '') + kr(r.now) : '–') : '' }),
          r.diff ? el('small', { class: r.diff < 0 ? 'neg' : 'pos', text: `${r.diff > 0 ? '+' : '−'}${kr(Math.abs(r.diff))}` }) : null)),
        r.a ? goalLine(r.a) : null);
    })),
    hiddenAcc.length ? el('p', { class: 'sv-hidden' }, hiddenAcc.length === 1 ? '+ 1 dolt konto: ' : `+ ${hiddenAcc.length} dolda konton: `,   // tryck för att visa igen
      ...hiddenAcc.map((a, i) => el('button', { type: 'button', class: 'link', text: (i ? ', ' : '') + a.name, on: { click: () => openAccDialog(a) } }))) : null,
    el('div', { class: 'sv-foot' },
      el('button', { type: 'button', class: 'link', text: '+ Nytt sparande', on: { click: () => focusAdd('savings') } }),
      el('button', { type: 'button', class: 'link', text: '+ Sparkonto', on: { click: newAccount } }),
      data.accounts.length ? el('button', { type: 'button', class: 'link', text: 'Utveckling ›', on: { click: () => { showTab('stats'); $('stats-accounts').scrollIntoView({ block: 'start' }); } } }) : null));
  $('savings-card').hidden = true;
  if (ie) ie.append(savFold);
}

// Sparmål (2026-11-21, valfritt): stapel och en rad under kontot – bara information, aldrig varning.
function goalLine(a) {
  const g = goalStatus(data, a, month);
  if (!g) return null;
  const m = (v) => money(v, a.currency), ml = (x) => monthShortYear(x).toLowerCase();
  const f = el('div', { class: 'bar-fill' }); f.style.width = g.pct + '%';
  const text = g.reached ? `✓ Målet ${m(g.goal)} är nått`
    : [`${g.pct} % av ${m(g.goal)}`, g.eta ? `klart ≈ ${ml(g.eta)}` : null,
      g.need && (!g.eta || g.eta > g.target) ? `${m(g.need)}/mån för att hinna till ${ml(g.target)}` : null].filter(Boolean).join(' · ');
  return el('div', { class: 'sv-goal' + (g.reached ? ' done' : '') }, el('span', { class: 'bar' }, f), el('small', { text }));
}

// Stäng månaden (2026-11-17): skriv in vad som faktiskt var kvar dagen före nästa lön. Ersätter planerat kvar i Historik och saldo.
function closeLine(t) {
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };   // knappen ligger i rubriken (summary)
  if (t.closed) return el('p', { class: 'close-line' }, el('span', { text: `✓ Stängd · efter räkningar ${kr(t.planned, true)}` }));   // knappen ligger bredvid Lägg till (2026-11-21)
  if (month > activeMonth()) return null;
  // 2026-11-18: när ska månaden stängas? Lugn text långt innan, färg 3 dagar innan, tydlig påminnelse när dagen har kommit.
  const iso = closeIso(), days = Math.round((new Date(iso + 'T12:00') - new Date(isoToday() + 'T12:00')) / 864e5);
  const lvl = days <= 0 ? 'due' : days <= 3 ? 'soon' : 'later';
  const when = days === 0 ? 'i dag' : days === 1 ? 'i morgon' : days > 0 ? `om ${days} dagar` : null;
  const text = lvl === 'due' ? (days === 0 ? 'Dags att stänga månaden i dag – hur mycket finns kvar?' : `Dags att stänga månaden – hur mycket fanns kvar ${dayLabel(iso)}?`)
    : lvl === 'soon' ? `Snart dags: stäng månaden ${dayLabel(iso)} (${when})` : `Stäng månaden ${dayLabel(iso)} · ${when}`;
  // 2026-11-21: texten står kvar här, själva knappen Stäng månad ligger bredvid Lägg till.
  return el('p', { class: 'close-line cl-' + lvl }, el('span', { class: 'link', text: (lvl === 'later' ? '✓ ' : '⏰ ') + text }));
}
const closeDay = () => dayLabel(closeIso());
function closeIso() {   // dagen före nästa lön (eller sista dagen i månaden), som YYYY-MM-DD
  const p = data.settings.payday, n = addMonths(month, 1), [y, mo] = n.split('-').map(Number);
  // 2026-11-18: lönedag på lördag/söndag → lönen kommer fredagen före, så frågan gäller dagen före den.
  // 2026-11-18: även dagen att stänga är en vardag – sista vardagen före lönen (lön den 1:a när lönedag inte är vald).
  const wk = (x) => { while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() - 1); return x; };
  const pay = wk(new Date(y, mo - 1, p > 1 ? p : 1)), d = new Date(pay);
  d.setDate(d.getDate() - 1); wk(d);
  return closeIso.pay ? isoOf(pay) : isoOf(d);
}
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 2026-11-21: vilken lön månaden bygger på – lönedagen i nyckelmånaden (helg → fredagen före), t.ex. " · lön 25 okt".
function payNote() {
  const p = data.settings.payday;
  if (!(p > 1)) return '';
  const [y, mo] = month.split('-').map(Number), d = new Date(y, mo - 1, p);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return `lön ${d.getDate()} ${shortOf(isoOf(d).slice(0, 7))}`;
}
function payIso() { closeIso.pay = true; try { return closeIso(); } finally { closeIso.pay = false; } }

// 2026-11-21: två korta rader under knapparna – dagar till nästa lön (innevarande månad) och största kostnadsförändringen mot förra månaden.
function monthHints(rows) {
  const box = $('month-hints'), out = [];
  if (month === activeMonth()) {
    const days = Math.round((new Date(payIso() + 'T12:00') - new Date(isoToday() + 'T12:00')) / 864e5);
    if (days >= 0) out.push(days === 0 ? 'Lön i dag' : days === 1 ? 'Nästa lön i morgon' : `Nästa lön om ${days} dagar`);
  }
  const byCat = (rs) => { const m = {}; for (const r of rs) if (r.type === 'expense' && r.category !== SAVINGS_CAT) m[r.category] = (m[r.category] || 0) + r.amount; return m; };
  const prevRows = rowsForMonth(data, addMonths(month, -1));
  if (prevRows.length) {
    const a = byCat(rows), b = byCat(prevRows);
    let best = null;
    for (const c of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = (a[c] || 0) - (b[c] || 0);
      if (d && (!best || Math.abs(d) > Math.abs(best.d))) best = { c, d };
    }
    if (best) out.push(`Största förändring: ${catName(best.c)} ${kr(best.d, true)} mot ${monthShortLabel(addMonths(month, -1)).toLowerCase()}`);
  }
  box.hidden = !out.length;
  box.replaceChildren(...out.map((t) => el('p', { class: 'muted small', text: t })));
}
function openCloseDialog() {
  const t = monthTotals(data, month);
  $('cd-title').textContent = `Stäng ${monthLabel(month).toLowerCase()}`;
  // 2026-11-18: kortare och tydligare – dagen står i fältets rubrik, planerat och konsumtion i en rad under.
  $('cd-label').textContent = `Kvar på kontot ${closeDay()} (${unit()})`;
  $('cd-sub').textContent = `Sista vardagen före lönen. Planerat ${kr(t.closed ? t.planned : t.left, true)} – skillnaden blir månadens konsumtion.`
    + (data.settings.payday > 1 ? '' : ' Lön en annan dag än den 1:a? Välj Lönedag under Inställningar.');
  $('cd-amount').value = t.closed ? (t.left < 0 ? '-' : '') + krInput(Math.abs(t.left)) : '';
  $('cd-reopen').hidden = !t.closed;
  $('cd-carry-label').textContent = `Pengarna ligger kvar och följer med till ${monthLabel(addMonths(month, 1)).toLowerCase()}`;
  $('cd-carry').checked = t.closed ? data.carry.includes(month) : true;
  // Sparkonton (2026-11-17): fyll i saldona samtidigt – förifyllt med beräknat/senaste saldo, t.ex. efter en extra överföring.
  // 2026-11-18: en rad per konto – namn och var siffran kommer ifrån till vänster, saldot till höger.
  fill($('cd-accounts'), data.accounts.length ? [el('p', { class: 'cd-acc-h' }, el('span', { text: 'Sparkonton' }), el('small', { class: 'muted', text: 'Ändra bara det som skiljer mot banken' })),
    el('ul', { class: 'cd-accs' }, data.accounts.map((a) => {
      const est = estBalance(data, a, month);
      const inp = el('input', { inputmode: 'decimal', autocomplete: 'off', 'data-acc': a.id, 'aria-label': `Saldo ${a.name}` });
      inp.value = est ? krInput(est.amount) : '';
      inp.dataset.orig = inp.value;
      const from = (a.feeds || []).map((id) => data.recurring.find((x) => x.id === id)?.name).filter(Boolean);
      const note = !est ? 'Inget saldo än' : est.estimated ? '≈ beräknat' : `ifyllt ${monthShortLabel(balanceAt(a, month).month).toLowerCase()}`;
      // 2026-11-18: vad som fyllde på kontot den här månaden, per sparpost.
      const feeds = rowsForMonth(data, month).filter((r) => (a.feeds || []).includes(r.id) && r.amount);
      return el('li', {}, el('label', { class: 'cd-acc' }, el('span', { class: 'cd-acc-name' }, el('span', { text: a.name }), el('small', { class: 'muted', text: note })),
        el('span', { class: 'cd-acc-in' }, inp, el('small', { class: 'muted', text: unit(a.currency) }))),
      feeds.length ? el('p', { class: 'cd-feed small' }, feeds.map((r) => `+${kr(r.amount)} från ${r.name}`).join(' · ') + ` i ${monthLabel(month).toLowerCase().replace(/ \d{4}$/, '')}`) : null);
    }))] : null);
  $('cd-error').textContent = '';
  $('close-dialog').showModal();
  $('close-dialog').focus();   // 2026-11-21: tangentbordet öppnas först när man trycker i fältet
}
$('cd-cancel').addEventListener('click', () => $('close-dialog').close());
$('cd-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = $('cd-amount').value.trim(), neg = /^[-−]/.test(raw), ore = parseKr(neg ? raw.slice(1) : raw);
  if (ore == null) { $('cd-error').textContent = 'Skriv beloppet, t.ex. 3 250 eller -500.'; return; }
  for (const inp of $('cd-accounts').querySelectorAll('input[data-acc]')) {
    const v = inp.value.trim();
    if (!v || v === inp.dataset.orig && !Object.hasOwn(data.accounts.find((a) => a.id === inp.dataset.acc)?.balances || {}, month)) continue;
    const amt = parseKr(v);
    if (amt == null || !isAmount(amt)) { $('cd-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
    const a = data.accounts.find((x) => x.id === inp.dataset.acc);
    if (a) a.balances[month] = amt;
  }
  const closing = month, wasActive = month === activeMonth();
  data.closed[month] = neg ? -ore : ore;
  data.carry = data.carry.filter((x) => x !== month).concat($('cd-carry').checked ? [month] : []);
  data = loadData(data);
  $('close-dialog').close();
  if (wasActive) { month = activeMonth(); overviewStart = month; }   // nästa månad blir den aktuella
  save();
  snackbar(wasActive ? `${monthLabel(closing)} är stängd – nu gäller ${monthLabel(month).toLowerCase()}` : `${monthLabel(closing)} är stängd`, null, null, 4000);
});
$('cd-reopen').addEventListener('click', () => {
  $('close-dialog').close();
  withUndo(`${monthLabel(month)} är öppen igen`, () => { delete data.closed[month]; });
});

// Största kategorierna som små rader under rubriken (syns även hopfällt).
function topCats(expense) {
  const sums = new Map();
  for (const r of expense) sums.set(r.category, (sums.get(r.category) || 0) + r.amount);
  const top = [...sums].sort((a, b) => b[1] - a[1]).slice(0, 3), all = expense.reduce((a, r) => a + r.amount, 0) || 1;
  return el('ul', { class: 'top-cats' }, top.map(([id, v]) => {
    const f = el('span', { class: 'cg-bar' }); f.style.width = Math.round((v / all) * 100) + '%';
    return el('li', {}, el('span', { text: catName(id) }), el('span', { class: 'cg-track' }, f), el('span', { class: 'amount', text: kr(v) }));
  }));
}

// Hopfällbart kort (2026-11-17): rubriken (och det viktigaste) syns alltid, resten fälls ut. Läget sparas i openCats.
function fold(key, head, ...body) {
  const d = el('details', { class: 'fold', open: openCats.has('#' + key) }, el('summary', {}, head), ...body);
  d.addEventListener('toggle', () => { if (d.open) openCats.add('#' + key); else openCats.delete('#' + key); });
  return d;
}

// Lägg till i en grupp (2026-11-17): öppnar Ny kostnad med samma kategori, person (om alla i gruppen har samma) och hur ofta.
function addLike(rs, label) {
  const same = (f) => rs.every((r) => (f(r) ?? null) === (f(rs[0]) ?? null)) ? f(rs[0]) ?? null : undefined;
  const rec = (r) => data.recurring.find((x) => x.id === r.id);
  return el('button', { type: 'button', class: 'link add-like', text: `+ Lägg till i ${label}`, on: { click: () => {
    const sav = rs[0].category === SAVINGS_CAT;
    focusAdd(sav ? 'savings' : 'expense');
    const f = $(sav ? 'sav-form' : 'exp-form').elements;
    if (!sav) f.category.value = rs[0].category;
    const person = same((r) => r.person);
    if (person !== undefined && f.person) f.person.value = person || '';
    const every = same((r) => rec(r)?.every);
    if (every) f.every.value = String(every);
  } } });
}

// Kostnader per kategori (2026-11-17): en rad per kategori med summa och andel; tryck för att fälla ut posterna.
const openCats = new Set();
function expenseGroups(expense) {
  const total = expense.reduce((a, r) => a + r.amount, 0) || 1;
  const groups = new Map();
  for (const r of expense) { if (!groups.has(r.category)) groups.set(r.category, []); groups.get(r.category).push(r); }
  return el('div', { class: 'cat-groups' }, [...groups].map(([id, rs]) => [id, rs, rs.reduce((a, r) => a + r.amount, 0)])
    .sort((a, b) => b[2] - a[2]).map(([id, rs, sum]) => {
      const bar = el('span', { class: 'cg-bar' }); bar.style.width = Math.max(2, Math.round((sum / total) * 100)) + '%';
      const d = el('details', { class: 'cat-group', open: openCats.has(id) },
        el('summary', {},
          el('span', { class: 'cg-name' }, el('span', { text: catName(id) }), el('span', { class: 'cg-n', text: rs.length === 1 ? '1 post' : `${rs.length} poster` })),
          el('span', { class: 'cg-sum', text: kr(sum) }),
          el('span', { class: 'cg-track', 'aria-hidden': 'true' }, bar)),
        el('ul', { class: 'list' }, rs.map(monthRow)),
        addLike(rs, catName(id)));
      d.addEventListener('toggle', () => { if (d.open) openCats.add(id); else openCats.delete(id); });
      return d;
    }));
}

// Per person: income, costs and left for each person + "Gemensamt" (only when people are used).
function perPerson(rows) {
  if (!hasPeople()) return null;
  const groups = [...data.settings.people.map((p) => ({ id: p.id, name: p.name })), { id: null, name: 'Gemensamt' }];
  const lines = groups.map((g) => ({ ...g, ...totals(rows.filter((r) => (r.person || null) === g.id)) }))
    .filter((g) => g.income || g.expense);
  if (!lines.length) return null;
  return el('table', { class: 'per-person' },
    el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Person' }), el('th', { scope: 'col', text: 'In' }),
      el('th', { scope: 'col', text: 'Ut' }), el('th', { scope: 'col', text: 'Efter räkningar' }))),   // planerat per person (2026-11-21)
    el('tbody', {}, lines.map((g) => el('tr', {}, el('th', { scope: 'row', text: g.name }),
      el('td', { text: kr(g.income) }), el('td', { text: kr(g.expense) }),
      el('td', { class: g.left < 0 ? 'neg' : '', text: kr(g.left, true) })))),
    sharedSplit(lines));
}
// Delat lika (2026-11-17): gemensamt (in och ut) fördelat jämnt på personerna, så att Gemensamt-raden inte vilseleder.
function sharedSplit(lines) {
  const shared = lines.find((g) => g.id === null), people = data.settings.people;
  if (!shared || !people.length || !(shared.income || shared.expense)) return null;
  const share = Math.round(shared.left / people.length / 100) * 100;   // hela kronor
  return el('tfoot', {}, el('tr', { class: 'split-row' }, el('th', { scope: 'row', colspan: '4' },
    el('span', { text: 'Delat lika: ' }),
    ...people.map((p, i) => { const g = lines.find((x) => x.id === p.id) || { left: 0 }, v = g.left + share;
      return el('span', { class: v < 0 ? 'neg' : 'pos', text: `${i ? ' · ' : ''}${p.name} ${kr(v, true)}` }); }))));
}


function changeMonth(n) { setMonth(addMonths(month, n)); }
function setMonth(m) { month = m; renderMonth(); renderStats(); }
$('prev-month').addEventListener('click', () => changeMonth(-1));
$('next-month').addEventListener('click', () => changeMonth(1));
$('month-title').addEventListener('click', () => setMonth(activeMonth()));

// Swipe left/right anywhere on the screen (not the menu, inputs or dialogs), like follow-diet-tracker:
// Månad and Statistik change month, Översikt changes year.
let touchX = null, touchY = null;
document.addEventListener('touchstart', (e) => {
  touchX = e.target.closest('input, select, textarea, #nav, dialog') || e.touches.length > 1 ? null : e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const dir = dx < 0 ? 1 : -1, tab = store.get(CONFIG.tabKey);
  if (tab === 'month') changeMonth(dir);
});

// ---------- Row dialog (adjust a recurring item for one month / edit a one-off) ----------
// Category select: only categories of the given type (income/expense).
function fillCategorySelect(sel, value, type = 'expense') {
  // Sparande väljs inte som kostnadskategori – det har en egen knapp (+ Sparande). Kvar för befintliga sparposter.
  const cats = data.settings.categories.filter((c) => c.type === type && (c.id !== SAVINGS_CAT || value === SAVINGS_CAT));
  sel.replaceChildren(...cats.map((c) => el('option', { value: c.id, text: c.name })));
  sel.value = cats.some((c) => c.id === value) ? value : FALLBACK_CAT[type];
}
// Person select: "Gemensamt" (empty value) + people.
function fillPersonSelect(sel, value) {
  sel.replaceChildren(el('option', { value: '', text: hasPeople() ? 'Gemensamt' : 'Gemensamt (lägg till personer under Inställningar)' }),
    ...data.settings.people.map((p) => el('option', { value: p.id, text: p.name })));
  sel.value = data.settings.people.some((p) => p.id === value) ? value : '';
}
const personValue = (sel) => sel.value || null;

// Kvar från förra månaden för hand (2026-11-21): en avvikelse (inkomst, Övrig inkomst) i den här månaden.
const CARRY_NAME = 'Kvar från förra månaden';
function openCarryDialog() {
  openRowDialog(null);
  $('rd-title').textContent = CARRY_NAME;
  $('rd-name').value = CARRY_NAME;
  $('rd-type').value = 'income';
  $('rd-type').dispatchEvent(new Event('change'));
  $('rd-cat').value = 'income-other';
  $('rd-sub').textContent = `Det som fanns kvar på kontot när ${monthLabel(month).toLowerCase()} började. Gäller bara den här månaden.`;
  $('row-dialog').focus();
}
function openRowDialog(r) {
  dialogRow = r || null;
  const isNew = !r, isOne = isNew || r.kind === 'one';
  $('rd-title').textContent = isNew ? 'Ny avvikelse' : r.name;
  $('rd-sub').textContent = isNew ? `Gäller bara ${monthLabel(month).toLowerCase()}.`
    : r.kind === 'rec' ? `Belopp för ${monthLabel(month).toLowerCase()}${r.type === 'income' && r.category === 'salary' && payNote() ? ` (${payNote().replace('lön', 'lönen')})` : ''}. Ordinarie ${kr(r.base)}.` : `Avvikelse i ${monthLabel(month).toLowerCase()}.`;
  $('rd-oneoff-fields').hidden = !isOne;
  $('rd-name').value = isOne && !isNew ? r.name : '';
  $('rd-type').value = isOne && !isNew ? r.type : 'expense';
  fillCategorySelect($('rd-cat'), isOne && !isNew ? r.category : null, $('rd-type').value);
  fillPersonSelect($('rd-person'), isOne && !isNew ? r.person : null);
  $('rd-pre').checked = !!(r && r.pre); showPre();
  $('rd-amount').value = isNew ? '' : krInput(r.amount);
  $('rd-delete').hidden = isNew;
  $('rd-delete').textContent = r && r.kind === 'rec' ? 'Ta bort posten' : 'Ta bort';
  $('rd-reset').hidden = isNew || r.kind !== 'rec' || !r.adjusted;
  // En ruta per post (2026-11-18): det som gäller alla månader ligger hopfällt under beloppet.
  const rec = r && r.kind === 'rec' ? data.recurring.find((x) => x.id === r.id) : null;
  $('rd-all').hidden = !rec; $('rd-all').open = false;
  if (rec) {
    $('f-name').value = rec.name;
    $('f-amount').value = krInput(rec.amount);
    fillEverySelect($('f-every'), rec.every);
    $('f-every-wrap').hidden = rec.type === 'income';
    fillCategorySelect($('f-cat'), rec.category, rec.type);
    fillPersonSelect($('f-person'), rec.person);
    $('f-start').value = rec.start;
    $('f-end').value = rec.end || '';
  }
  $('rd-amount').dataset.orig = $('rd-amount').value;
  $('rd-skip').hidden = isNew || r.kind !== 'rec' || (r.adjusted && r.amount === 0);
  // 2026-11-18: kontots egna inställningar (valuta, kopplingar, ta bort) nås härifrån – sparkonton hanteras bara i Månad.
  $('rd-account').hidden = !(r && data.accounts.some((a) => (a.feeds || []).includes(r.id)));
  // Sparpost = konto (2026-11-17): visa kontots saldo direkt i rutan. Saknas konto skapas ett med samma namn när du fyller i saldot.
  const isSave = r && r.kind === 'rec' && r.category === SAVINGS_CAT;
  $('rd-acc').hidden = !isSave;
  if (isSave) {
    // Koppla till ett befintligt sparkonto, skapa ett nytt eller inget. Saldot hämtas från kontot och räknas upp framåt.
    const linked = data.accounts.find((a) => (a.feeds || []).includes(r.id));
    $('rd-acc-pick').replaceChildren(el('option', { value: '', text: 'Inget sparkonto' }),
      el('option', { value: 'new', text: `Nytt konto: ${r.name}` }),
      ...data.accounts.map((a) => el('option', { value: a.id, text: a.name })));
    $('rd-acc-pick').value = linked ? linked.id : data.accounts.length ? '' : 'new';
    showAccBalance();
  }
  $('rd-error').textContent = '';
  $('row-dialog').showModal();
  $('row-dialog').focus();   // inget tangentbord direkt (2026-11-21)
}

// 2026-11-18: en knapp ＋ Lägg till; rutan frågar vad. Avvikelse öppnar radrutan, resten rutan Ny post.
$('add-any').addEventListener('click', () => $('add-dialog').showModal());
$('add-cancel').addEventListener('click', () => $('add-dialog').close());
$('add-dialog').addEventListener('click', (e) => {
  const kind = e.target.closest('button[data-add]')?.dataset.add;
  if (!kind) return;
  $('add-dialog').close();
  setTimeout(() => (kind === 'oneoff' ? openRowDialog(null) : focusAdd(kind)), 0);
});
$('rd-account').addEventListener('click', () => {
  const acc = dialogRow && data.accounts.find((a) => (a.feeds || []).includes(dialogRow.id));
  if (!acc) return;
  $('row-dialog').close();
  setTimeout(() => openAccDialog(acc), 0);
});
function showAccBalance() {
  const pick = $('rd-acc-pick').value, acc = data.accounts.find((a) => a.id === pick), est = acc ? estBalance(data, acc, month) : null;
  $('rd-balance').closest('label').hidden = !pick;
  $('rd-show-wrap').hidden = !acc;
  $('rd-show').checked = acc ? !acc.hidden : true;
  $('rd-bal-label').textContent = acc ? `Saldo på ${acc.name} (${unit(acc.currency)})` : 'Saldo på kontot nu';
  $('rd-balance').value = est ? krInput(est.amount) : '';
  $('rd-balance').dataset.orig = $('rd-balance').value;
  $('rd-acc-note').textContent = !pick ? '' : !acc ? 'Fyll i saldot så skapas kontot. Det räknas upp med sparandet varje månad.'
    : est && est.estimated ? 'Beräknat från senaste saldot + sparandet – ändra om det inte stämmer.' : 'Räknas upp med sparandet varje månad.';
}
$('rd-acc-pick').addEventListener('change', showAccBalance);
// Sparande före lönen (2026-11-18): bara för avvikelser i kategorin Sparande.
function showPre() {
  const r = dialogRow;
  $('rd-pre-wrap').hidden = r && r.kind === 'rec' ? r.category !== SAVINGS_CAT : $('rd-type').value !== 'expense' || $('rd-cat').value !== SAVINGS_CAT;
}
$('rd-type').addEventListener('change', () => { fillCategorySelect($('rd-cat'), null, $('rd-type').value); showPre(); });
$('rd-cat').addEventListener('change', showPre);
$('rd-cancel').addEventListener('click', () => $('row-dialog').close());

$('rd-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseKr($('rd-amount').value);
  if (amount == null) { $('rd-error').textContent = 'Skriv ett belopp, t.ex. 1 250 eller 99,50.'; return; }
  const r = dialogRow;
  let item = null;
  if (r && r.kind === 'rec') {   // fälten under "Ändra posten" kontrolleras först, innan något ändras
    const rec = data.recurring.find((x) => x.id === r.id);
    const name = cleanName($('f-name').value), base = parseKr($('f-amount').value);
    const start = $('f-start').value, end = $('f-end').value || null;
    const err = !name ? 'Skriv ett namn.' : base == null ? 'Skriv ett ordinarie belopp, t.ex. 1 250 eller 99,50.'
      : !isMonth(start) ? 'Välj från vilken månad.' : end && (!isMonth(end) || end < start) ? 'Till-månaden måste vara efter från-månaden.' : '';
    if (err) { $('rd-all').open = true; $('rd-error').textContent = err; return; }
    if (rec) item = { ...rec, name, amount: base, every: rec.type === 'income' ? 1 : Number($('f-every').value), start, end,
      category: $('f-cat').value, person: personValue($('f-person')) };
  }
  if (!$('rd-acc').hidden) {
    const pick = $('rd-acc-pick').value, balRaw = $('rd-balance').value.trim();
    const bal = balRaw ? parseKr(balRaw) : null;
    if (balRaw && (bal == null || !isAmount(bal))) { $('rd-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
    for (const a of data.accounts) a.feeds = (a.feeds || []).filter((x) => x !== r.id);   // en sparpost går till ett konto
    let acc = data.accounts.find((a) => a.id === pick);
    if (pick === 'new' && balRaw) {
      if (data.accounts.length >= MAX_ACCOUNTS) { $('rd-error').textContent = `Max ${MAX_ACCOUNTS} sparkonton.`; return; }
      acc = { id: 'a' + newId().slice(-10), name: cleanName(r.name, 30) || 'Sparkonto', currency: home(), balances: {}, feeds: [] };
      data.accounts.push(acc);
    }
    if (acc) {
      acc.feeds.push(r.id);
      if (!$('rd-show-wrap').hidden) acc.hidden = !$('rd-show').checked;   // dölj kontot i Sparande-kortet
      if (balRaw && balRaw !== $('rd-balance').dataset.orig) acc.balances[month] = bal;
    }
  }
  if (!r || r.kind === 'one') {
    const name = cleanName($('rd-name').value);
    if (!name) { $('rd-error').textContent = 'Skriv ett namn.'; return; }
    const o = { id: r ? r.id : newId(), month, name, type: $('rd-type').value === 'income' ? 'income' : 'expense',
      amount, category: $('rd-cat').value, person: personValue($('rd-person')), ...(!$('rd-pre-wrap').hidden && $('rd-pre').checked ? { pre: true } : {}) };
    if (r) data.oneOffs = data.oneOffs.map((x) => (x.id === r.id ? o : x)); else data.oneOffs.push(o);
  } else {
    // Sparpost: "Dras före lönen" gäller posten (alla månader).
    if (item) {
      if (!$('rd-pre-wrap').hidden && $('rd-pre').checked && item.category === SAVINGS_CAT) item.pre = true; else delete item.pre;
      data.recurring = data.recurring.map((x) => (x.id === item.id ? item : x));
      // Månadens belopp: oförändrat fält följer ordinarie (eller behåller en tidigare avvikelse); ändrat = avvikelse.
      const changed = $('rd-amount').value !== $('rd-amount').dataset.orig;
      if (changed ? amount === item.amount : !r.adjusted) clearAdjustment(r.id);
      else if (changed) (data.adjustments[month] ||= {})[r.id] = amount;
    }
  }
  data = loadData(data);
  $('row-dialog').close();
  save();
});

function clearAdjustment(id) {
  const a = data.adjustments[month];
  if (!a) return;
  delete a[id];
  if (!Object.keys(a).length) delete data.adjustments[month];
}
$('rd-reset').addEventListener('click', () => { clearAdjustment(dialogRow.id); $('row-dialog').close(); save(); });
$('rd-skip').addEventListener('click', () => {
  const r = dialogRow;
  $('row-dialog').close();
  withUndo(`${r.name} hoppas över i ${monthLabel(month).toLowerCase()}`, () => { (data.adjustments[month] ||= {})[r.id] = 0; });
});
$('rd-delete').addEventListener('click', () => {
  const r = dialogRow;
  $('row-dialog').close();
  withUndo(`${r.name} ligger i papperskorgen`, () => trashItems(data, r.kind === 'rec' ? 'rec' : 'one', [r.id], isoToday()));
});

// Förklaring till prognosen (2026-11-21).
let fcOpen = false;
function fcText(fc) {
  const pct = Math.round((fc.factor - 1) * 100), name = monthShortLabel(month);   // stor bokstav, står först i meningen
  const season = pct > 0 ? ` ${name} brukar kosta ${pct} % mer.` : pct < 0 ? ` ${name} brukar kosta ${-pct} % mindre.` : '';
  return `Efter räkningar minus rörliga utgifter ≈ ${kr(fc.variable)} (snitt för de senaste stängda månaderna).${season}`;
}
