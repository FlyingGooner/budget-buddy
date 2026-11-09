// Budget buddy – Översikt (12 månader). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Overview (12 months) ----------
function renderOverviewInto(box, compact) {
  const start = compact ? month : overviewStart;
  const months = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  const res = months.map((m) => ({ m, ...totals(rowsForMonth(data, m)), bal: balanceAfter(data, m) }));
  const max = Math.max(1, ...res.map((r) => Math.abs(r.left)));
  const sum = res.reduce((s, r) => s + r.left, 0);
  const anyBal = res.some((r) => r.bal != null);

  const head = compact
    ? el('h2', { text: `Kommande 12 månader` })
    : el('div', { class: 'monthbar' },
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Föregående år', on: { click: () => { overviewStart = addMonths(overviewStart, -12); renderOverview(); } } }, '◀'),
      el('h2', { text: `${monthShortLabel(months[0])} ${months[0].slice(0, 4)} – ${monthShortLabel(months[11])} ${months[11].slice(0, 4)}` }),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nästa år', on: { click: () => { overviewStart = addMonths(overviewStart, 12); renderOverview(); } } }, '▶'));

  const list = el('ul', { class: 'list ov' }, res.map((r) => {
    const barFill = el('div', { class: 'bar-fill' + (r.left < 0 ? ' over' : '') });
    barFill.style.width = Math.round((Math.abs(r.left) / max) * 100) + '%';
    return el('li', {}, el('button', { type: 'button', class: 'ov-row' + (r.m === month && compact ? ' current' : ''),
      'aria-label': `${monthLabel(r.m)}: kvar ${kr(r.left, true)}. Öppna månaden`,
      on: { click: () => { showTab('month'); setMonth(r.m); } } },
    el('span', { class: 'ov-m', text: `${monthShortLabel(r.m)}${r.m.endsWith('-01') ? ' ' + r.m.slice(2, 4) : ''}` }),
    el('span', { class: 'bar' }, barFill),
    el('span', { class: 'amount ' + (r.left < 0 ? 'neg' : ''), text: kr(r.left, true) }),
    anyBal ? el('span', { class: 'amount muted small', text: r.bal == null ? '' : kr(r.bal) }) : null));
  }));

  const hasData = data.recurring.length || data.oneOffs.length;
  fill(box, head, hasData ? list : el('div', { class: 'empty' },
    el('p', { class: 'muted', text: 'Inga poster än – lägg till inkomster och räkningar så syns månaderna här.' }),
    el('button', { type: 'button', class: 'btn tonal', text: 'Lägg till inkomster och kostnader', on: { click: () => focusAdd('income') } })),
  hasData ? el('p', { class: 'split total' }, el('span', { text: 'Summa 12 mån' }),
    el('span', { class: 'amount ' + (sum < 0 ? 'neg' : 'pos'), text: kr(sum, true) })) : null,
  anyBal && hasData ? el('p', { class: 'muted small', text: 'Högra kolumnen: saldo efter månaden.' }) : null);
}
function renderOverview() { renderOverviewInto($('overview'), false); }
