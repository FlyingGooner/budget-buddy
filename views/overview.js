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
// Graf (2026-11-17): pengar kvar över tid – ackumulerat kvar (eller saldo om startsaldo finns), bakåt heldraget, framåt streckat.
function moneyChart(past, next) {
  const pts = [...past].reverse().concat(next);
  if (pts.length < 2) return null;
  const useBal = pts.every((r) => r.bal != null);
  let acc = 0;
  const vals = pts.map((r) => (useBal ? r.bal : (acc += r.left)));
  const W = 340, H = 170, P = { l: 44, r: 10, t: 10, b: 20 };
  const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals);
  const x = (i) => P.l + ((W - P.l - P.r) * i) / (pts.length - 1);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo || 1));
  const short = (ore) => nf0.format(Math.round(ore / 100000)) + 'k';
  const nPast = past.length;
  const line = (from, to) => vals.slice(from, to).map((v, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line(0, nPast)}L${x(nPast - 1).toFixed(1)},${y(lo).toFixed(1)}L${x(0).toFixed(1)},${y(lo).toFixed(1)}Z`;
  const kids = [lo, (lo + hi) / 2, hi].map((v) => [
    svg('line', { class: 'grid', x1: P.l, x2: W - P.r, y1: y(v), y2: y(v) }),
    svg('text', { class: 'ax', x: P.l - 4, y: y(v) + 3, 'text-anchor': 'end' }, short(v))]);
  if (lo < 0) kids.push(svg('line', { class: 'zero', x1: P.l, x2: W - P.r, y1: y(0), y2: y(0) }));
  if (nPast > 1) kids.push(svg('path', { class: 'mc-area', d: area }), svg('path', { class: 'mc-line', d: line(0, nPast) }));
  kids.push(svg('path', { class: 'mc-line mc-future', d: line(nPast - 1, pts.length) }));
  kids.push(svg('circle', { class: 'mc-now', cx: x(nPast - 1), cy: y(vals[nPast - 1]), r: 4 }));
  pts.forEach((r, i) => { if (i === 0 || i === pts.length - 1 || i === nPast - 1) kids.push(svg('text', { class: 'ax', x: x(i), y: H - 5, 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' }, monthShortLabel(r.m))); });
  const best = past.reduce((b, r) => (r.left > b.left ? r : b), past[0] || next[0]);
  const avg = past.length ? Math.round(past.reduce((a, r) => a + r.left, 0) / past.length / 100) * 100 : 0;
  return el('div', { class: 'card' },
    el('h2', { class: 'split' }, el('span', { text: useBal ? 'Saldo över tid' : 'Pengar kvar över tid' }), el('span', { text: kr(vals[nPast - 1]) })),
    svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': useBal ? 'Saldo över tid' : 'Pengar kvar över tid, ackumulerat' }, kids),
    el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Hittills', el('span', { class: 'lg lg-fut' }), 'Prognos', el('span', { class: 'muted', text: `(tusental ${unit()})` })),
    past.length ? el('div', { class: 'mc-kpis' },
      el('div', {}, el('b', { class: avg < 0 ? 'neg' : '', text: kr(avg, true) }), el('span', { text: 'Snitt kvar/mån' })),
      el('div', {}, el('b', { text: kr(best.left, true) }), el('span', { text: `Bäst: ${monthShortLabel(best.m).toLowerCase()}` }))) : null);
}
function renderOverview() {
  const box = $('overview'), end = overviewStart;
  const calc = (m) => ({ m, ...totals(rowsForMonth(data, m)), bal: balanceAfter(data, m) });
  const past = Array.from({ length: 12 }, (_, i) => calc(addMonths(end, i - 11))).filter((r) => r.income || r.expense).reverse();
  const next = Array.from({ length: 3 }, (_, i) => calc(addMonths(end, i + 1)));   // ett kvartal framåt (2026-11-17)
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
    fill(box, head, el('div', { class: 'card' }, el('div', { class: 'empty' },
      el('p', { class: 'muted', text: 'Inga poster än – lägg till inkomster och räkningar så syns månaderna här.' }),
      el('button', { type: 'button', class: 'btn tonal', text: 'Lägg till inkomster och kostnader', on: { click: () => focusAdd('income') } }))));
    return;
  }
  fill(box,
    head,
    moneyChart(past, next),
    el('div', { class: 'card' }, el('h2', { text: 'Kommande kvartal' }), ovRows(next, max, anyBal), total('Summa 3 mån', next)),
    el('div', { class: 'card' }, el('h2', { text: 'Senaste 12 månaderna' }),
      past.length ? ovRows(past, max, anyBal) : el('p', { class: 'muted', text: 'Inga poster bakåt i tiden.' }),
      past.length ? total('Summa', past) : null),
    anyBal ? el('p', { class: 'muted small', text: 'Högra kolumnen: saldo efter månaden.' }) : null);
}
