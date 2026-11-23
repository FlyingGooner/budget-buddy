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
// 2026-11-21: de tre senaste månaderna står överst (utfall: kvar på kontot om stängd). Ingen summarad och inget saldo om ett år.
const AHEAD_SHOWN = 3, PAST_SHOWN = 3;
let aheadOpen = false;
function aheadCard() {
  const start = activeMonth(), ms = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  const rows = ms.map((m) => ({ m, plan: monthTotals(data, m).left, fc: forecast(data, m) }));
  const past = Array.from({ length: PAST_SHOWN }, (_, i) => addMonths(start, i - PAST_SHOWN)).map((m) => {
    const t = monthTotals(data, m);
    return { m, plan: t.closed ? t.planned : t.left, done: t.closed ? t.left : null };
  }).filter((r) => r.plan || r.done != null);
  if (!rows.some((r) => r.plan) && !past.length) return null;
  const hasPastDone = past.some((r) => r.done != null);
  const hasFc = rows.some((r) => r.fc) || hasPastDone;
  const cell = (v, cls = '') => el('td', { class: (cls + (v < 0 ? ' neg' : '')).trim(), text: kr(v, true) });
  const open = (m) => () => { showTab('month'); setMonth(m); };
  // 2026-11-23: raderna går att nå med tangentbord och skärmläsare (Enter/mellanslag öppnar månaden).
  const rowAttrs = (m, cls = '') => ({ class: cls, tabindex: '0', role: 'link', 'aria-label': `Öppna ${monthLabel(m).toLowerCase()}`,
    on: { click: open(m), keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(m)(); } } } });
  return el('div', { class: 'card' },
    el('h2', { text: 'Senaste och kommande månader' }),
    el('table', { class: 'ahead' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Månad' }), el('th', { scope: 'col', text: 'Efter räkningar' }),
        hasFc ? el('th', { scope: 'col', text: hasPastDone ? 'Kvar' : 'Kvar (prognos)' }) : null)),
      el('tbody', {},
        past.map((r) => el('tr', rowAttrs(r.m, 'past'),
          el('td', { text: monthShortYear(r.m) }), cell(r.plan),
          hasFc ? (r.done != null ? cell(r.done) : el('td', { class: 'fc', text: '–' })) : null)),
        rows.slice(0, aheadOpen ? 12 : AHEAD_SHOWN).map((r, i) => el('tr', rowAttrs(r.m, i === 0 && past.length ? 'now' : ''),
          el('td', { text: monthShortYear(r.m) }), cell(r.plan),
          hasFc ? (r.fc ? cell(r.fc.left, 'fc') : el('td', { class: 'fc', text: '–' })) : null)))),
    el('button', { type: 'button', class: 'link ahead-more', 'aria-expanded': String(aheadOpen), text: aheadOpen ? 'Visa färre' : `Visa alla 12 månader ›`,
      on: { click: () => { aheadOpen = !aheadOpen; renderOverview(); } } }),
    hasFc ? el('p', { class: 'muted small', text: hasPastDone
      ? 'Kvar = kvar på kontot för stängda månader, annars prognos: efter räkningar minus rörliga utgifter (samma månad förra året om den är stängd, annars snittet av de senaste stängda månaderna).'
      : 'Kvar (prognos) = efter räkningar minus rörliga utgifter (samma månad förra året om den är stängd, annars snittet av de senaste stängda månaderna).' }) : null);
}
