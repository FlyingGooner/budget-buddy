// Budget buddy – Månad för månad (2026-11-18, del av Översikt). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// En rad per stängd månad, nyast först: konsumtion och sparat. Tryck för att öppna månaden.
function renderOverview() {
  const ms = closedMonths().slice(0, 24);
  const ahead = aheadCard();
  if (!ms.length) { fill($('overview'), ahead); return; }
  const rows = ms.map(closedSummary), max = Math.max(1, ...rows.map((r) => r.spent));
  fill($('overview'), ahead, el('div', { class: 'card' }, el('h2', { class: 'split' }, el('span', { text: 'Månad för månad' }), el('span', { class: 'muted', text: 'Konsumtion · Sparat' })),
    el('ul', { class: 'list ov' }, rows.map((r) => {
      const f = el('div', { class: 'bar-fill' }); f.style.width = Math.round((Math.max(0, r.spent) / max) * 100) + '%';
      return el('li', {}, el('button', { type: 'button', class: 'ov-row', 'aria-label': `${monthLabel(r.m)}: konsumtion ${kr(r.spent)}, sparat ${kr(r.saved)}. Öppna månaden`,
        on: { click: () => { showTab('month'); setMonth(r.m); } } },
      el('span', { class: 'ov-m', text: monthShortYear(r.m) }),
      el('span', { class: 'bar' }, f),
      el('span', { class: 'amount', text: kr(r.spent) }),
      el('span', { class: 'amount muted small', text: kr(r.saved) })));
    }))));
}

// Kommande 12 månader (2026-11-21): planerat kvar och prognos (planerat minus rörligt, se forecast() i store.js).
// Prognoskolumnen visas först när minst en månad är stängd. Tryck på en rad → öppnar månaden.
// 2026-11-21: tre månader syns, resten fälls ut (Summa gäller alltid alla 12).
const AHEAD_SHOWN = 3;
let aheadOpen = false;
function aheadCard() {
  const start = activeMonth(), ms = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  const rows = ms.map((m) => ({ m, plan: monthTotals(data, m).left, fc: forecast(data, m) }));
  if (!rows.some((r) => r.plan)) return null;
  const hasFc = rows.some((r) => r.fc), sum = (k) => rows.reduce((x, r) => x + (k === 'plan' ? r.plan : r.fc ? r.fc.left : r.plan), 0);
  const cell = (v, cls = '') => el('td', { class: (cls + (v < 0 ? ' neg' : '')).trim(), text: kr(v, true) });
  const bal = balanceAfter(data, addMonths(start, -1));
  const endBal = (k) => (bal == null ? null : bal + sum(k));
  return el('div', { class: 'card' },
    el('h2', { text: 'Kommande 12 månader' }),
    el('table', { class: 'ahead' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Månad' }), el('th', { scope: 'col', text: 'Efter räkningar' }),
        hasFc ? el('th', { scope: 'col', text: 'Kvar (prognos)' }) : null)),
      el('tbody', {}, rows.slice(0, aheadOpen ? 12 : AHEAD_SHOWN).map((r) => el('tr', { on: { click: () => { showTab('month'); setMonth(r.m); } } },
        el('td', { text: monthShortYear(r.m) }), cell(r.plan),
        hasFc ? (r.fc ? cell(r.fc.left, 'fc') : el('td', { class: 'fc', text: '–' })) : null))),
      el('tfoot', {}, el('tr', {}, el('td', { text: 'Summa 12 mån' }), cell(sum('plan')), hasFc ? cell(sum('fc'), 'fc') : null),
        bal == null ? null : el('tr', {}, el('td', { text: 'Saldo om ett år' }), el('td', { text: kr(endBal('plan')) }),
          hasFc ? el('td', { class: 'fc', text: '≈ ' + kr(endBal('fc')) }) : null))),
    el('button', { type: 'button', class: 'link ahead-more', 'aria-expanded': String(aheadOpen), text: aheadOpen ? 'Visa färre' : `Visa alla 12 månader ›`,
      on: { click: () => { aheadOpen = !aheadOpen; renderOverview(); } } }),
    hasFc ? el('p', { class: 'muted small', text: 'Kvar (prognos) = efter räkningar minus rörliga utgifter (snittet av de senaste stängda månaderna, med säsong).' }) : null);
}
