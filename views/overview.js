// Budget buddy – Historik (tidigare Översikt, 2026-11-17). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// Visar de 12 månaderna fram till vald månad (bakåt) och de 12 kommande. Pilarna och svep flyttar ett år.
function ovRows(months, max, anyBal) {
  return el('ul', { class: 'list ov' }, months.map((r) => {
    const barFill = el('div', { class: 'bar-fill' + (r.left < 0 ? ' over' : '') });
    barFill.style.width = Math.round((Math.abs(r.left) / max) * 100) + '%';
    return el('li', {}, el('button', { type: 'button', class: 'ov-row' + (r.m === currentMonth() ? ' current' : ''),
      'aria-label': `${monthLabel(r.m)}: kvar ${kr(r.left, true)}. Öppna månaden`,
      on: { click: () => { showTab('month'); setMonth(r.m); } } },
    el('span', { class: 'ov-m', text: `${monthShortLabel(r.m)}${r.m.endsWith('-01') || r === months[0] ? ' ' + r.m.slice(2, 4) : ''}` }),
    el('span', { class: 'bar' }, barFill),
    el('span', { class: 'amount ' + (r.left < 0 ? 'neg' : ''), text: kr(r.left, true) }),
    anyBal ? el('span', { class: 'amount muted small', text: r.bal == null ? '' : kr(r.bal) }) : null));
  }));
}
function renderOverview() {
  const box = $('overview'), end = overviewStart;
  const calc = (m) => ({ m, ...totals(rowsForMonth(data, m)), bal: balanceAfter(data, m) });
  const past = Array.from({ length: 12 }, (_, i) => calc(addMonths(end, i - 11))).filter((r) => r.income || r.expense).reverse();
  const next = Array.from({ length: 12 }, (_, i) => calc(addMonths(end, i + 1)));
  const all = [...past, ...next];
  const max = Math.max(1, ...all.map((r) => Math.abs(r.left)));
  const anyBal = all.some((r) => r.bal != null);
  const sum = (rs) => rs.reduce((s, r) => s + r.left, 0);
  const total = (label, rs) => el('p', { class: 'split total' }, el('span', { text: label }),
    el('span', { class: 'amount ' + (sum(rs) < 0 ? 'neg' : 'pos'), text: kr(sum(rs), true) }));

  const head = el('div', { class: 'monthbar' },
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Föregående år', on: { click: () => { overviewStart = addMonths(overviewStart, -12); renderOverview(); } } }, '◀'),
    el('h1', { class: 'ov-title' }, 'Historik', el('small', { text: `t.o.m. ${monthShortLabel(end).toLowerCase()} ${end.slice(0, 4)}` })),
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nästa år', on: { click: () => { overviewStart = addMonths(overviewStart, 12); renderOverview(); } } }, '▶'));

  const hasData = data.recurring.length || data.oneOffs.length;
  if (!hasData) {
    fill(box, el('div', { class: 'card' }, el('div', { class: 'empty' },
      el('p', { class: 'muted', text: 'Inga poster än – lägg till inkomster och räkningar så syns månaderna här.' }),
      el('button', { type: 'button', class: 'btn tonal', text: 'Lägg till inkomster och kostnader', on: { click: () => focusAdd('income') } }))));
    return;
  }
  fill(box,
    head,
    el('div', { class: 'card' }, el('h2', { text: 'Senaste 12 månaderna' }),
      past.length ? ovRows(past, max, anyBal) : el('p', { class: 'muted', text: 'Inga poster bakåt i tiden.' }),
      past.length ? total('Summa', past) : null),
    el('div', { class: 'card' }, el('h2', { text: 'Kommande 12 månader' }), ovRows(next, max, anyBal), total('Summa 12 mån', next)),
    anyBal ? el('p', { class: 'muted small', text: 'Högra kolumnen: saldo efter månaden.' }) : null);
}
