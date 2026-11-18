// Budget buddy – Månad för månad (2026-11-18, del av Översikt). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// En rad per stängd månad, nyast först: konsumtion och sparat. Tryck för att öppna månaden.
function renderOverview() {
  const ms = closedMonths().slice(0, 24);
  if (!ms.length) { fill($('overview')); return; }
  const rows = ms.map(closedSummary), max = Math.max(1, ...rows.map((r) => r.spent));
  fill($('overview'), el('div', { class: 'card' }, el('h2', { class: 'split' }, el('span', { text: 'Månad för månad' }), el('span', { class: 'muted', text: 'Konsumtion · Sparat' })),
    el('ul', { class: 'list ov' }, rows.map((r) => {
      const f = el('div', { class: 'bar-fill' }); f.style.width = Math.round((Math.max(0, r.spent) / max) * 100) + '%';
      return el('li', {}, el('button', { type: 'button', class: 'ov-row', 'aria-label': `${monthLabel(r.m)}: konsumtion ${kr(r.spent)}, sparat ${kr(r.saved)}. Öppna månaden`,
        on: { click: () => { showTab('month'); setMonth(r.m); } } },
      el('span', { class: 'ov-m', text: `${monthShortLabel(r.m)} ${r.m.slice(2, 4)}` }),
      el('span', { class: 'bar' }, f),
      el('span', { class: 'amount', text: kr(r.spent) }),
      el('span', { class: 'amount muted small', text: kr(r.saved) })));
    }))));
}
