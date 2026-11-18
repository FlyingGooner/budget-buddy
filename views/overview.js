// Budget buddy – År (Historik, 2026-11-18 en del av fliken Översikt). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// Visar de 12 månaderna fram till vald månad (bakåt) och de 12 kommande. Pilarna och svep flyttar ett år.
function ovRows(months, max, anyBal) {
  return el('ul', { class: 'list ov' }, months.map((r) => {
    const barFill = el('div', { class: 'bar-fill' + (r.left < 0 ? ' over' : '') });
    barFill.style.width = Math.round((Math.abs(r.left) / max) * 100) + '%';
    return el('li', {}, el('button', { type: 'button', class: 'ov-row' + (r.m === activeMonth() ? ' current' : ''),
      'aria-label': `${monthLabel(r.m)}: kvar ${kr(r.left, true)}. Öppna månaden`,
      on: { click: () => { showTab('month'); setMonth(r.m); } } },
    el('span', { class: 'ov-m', text: `${monthShortLabel(r.m)}${''}` }),
    el('span', { class: 'bar' }, barFill),
    el('span', { class: 'amount ' + (r.left < 0 ? 'neg' : ''), text: (r.estimated ? '≈ ' : r.closed ? '✓ ' : '') + kr(r.left, true) }),
    anyBal ? el('span', { class: 'amount muted small', text: r.bal == null ? '' : kr(r.bal) }) : null));
  }));
}
// Graf (2026-11-17): pengar kvar över tid – ackumulerat kvar (eller saldo om startsaldo finns), bakåt heldraget, framåt streckat.
function moneyChart(past, next, kpis = true) {
  const pts = [...past].reverse().concat(next);
  if (pts.length < 3) return null;   // två punkter säger inget – grafen visas från tre månader
  const useBal = pts.every((r) => r.bal != null);
  let acc = 0;
  const vals = pts.map((r) => (useBal ? r.bal : (acc += r.left + r.savings)));   // pengar över tid: kvar + sparat
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
    el('h2', { class: 'split' }, el('span', { text: useBal ? 'Saldo över tid' : 'Kvar + sparat över tid' }), el('span', { text: kr(vals[nPast - 1]) })),
    svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': useBal ? 'Saldo över tid' : 'Pengar kvar över tid, ackumulerat' }, kids),
    el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Hittills', el('span', { class: 'lg lg-fut' }), 'Prognos', el('span', { class: 'muted', text: `(tusental ${unit()})` })),
    kpis && past.length ? el('div', { class: 'mc-kpis' },
      el('div', {}, el('b', { class: avg < 0 ? 'neg' : '', text: kr(avg, true) }), el('span', { text: 'Snitt kvar/mån' })),
      el('div', {}, el('b', { text: kr(best.left, true) }), el('span', { text: `Bäst: ${monthShortLabel(best.m).toLowerCase()}` }))) : null);
}
// Historik = ett år (2026-11-17): årets tolv budgetmånader (med lönedag: de som heter jan–dec), statistik för året,
// graf över året (hittills heldraget, resten prognos) och alla månader. Pilarna byter år.
function renderOverview() {
  const box = $('overview'), now = currentMonth();
  const year = Number(monthLabel(overviewStart).slice(-4));
  const first = addMonths(`${year}-01`, paySplit() ? -1 : 0);
  // Prognos (2026-11-17): månader som inte är stängda räknas med snittet av de rörliga utgifterna i stängda månader
  // (planerat − faktiskt kvar). Utan stängda månader är prognosen det planerade.
  const closedMs = Object.keys(data.closed);
  const avgVar = closedMs.length ? Math.round(closedMs.reduce((a, m) => { const t = monthTotals(data, m); return a + (t.planned - t.left); }, 0) / closedMs.length / 100) * 100 : 0;
  const isEst = (t) => !t.closed && avgVar && (t.income || t.expense);
  const estBal = (m) => {   // saldo där varje ostängd månad sedan startsaldot också får de rörliga utgifterna
    const bal = balanceAfter(data, m);
    if (bal == null || !avgVar) return bal;
    let n = 0;
    for (let x = data.settings.startMonth; x <= m; x = addMonths(x, 1)) if (isEst(monthTotals(data, x))) n++;
    return bal - n * avgVar;
  };
  const calc = (m) => {
    const t = monthTotals(data, m), est = isEst(t);
    return { m, ...t, left: est ? t.left - avgVar : t.left, estimated: !!est, bal: estBal(m) };
  };
  const months = Array.from({ length: 12 }, (_, i) => calc(addMonths(first, i)));
  const done = months.filter((r) => r.m <= now && (r.income || r.expense));
  const rest = months.filter((r) => r.m > now);
  const max = Math.max(1, ...months.map((r) => Math.abs(r.left)));
  const anyBal = months.some((r) => r.bal != null);
  const sum = (rs, k) => rs.reduce((s, r) => s + r[k], 0);

  const go = (n) => { overviewStart = addMonths(overviewStart, 12 * n); renderOverview(); };
  const head = el('div', { class: 'monthbar' },
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Föregående år', on: { click: () => go(-1) } }, '◀'),
    el('h1', { class: 'ov-title' }, `År ${year}`,
      el('small', { text: rest.length === 12 ? 'Prognos' : rest.length ? `${done.length === 1 ? '1 månad' : `${done.length} månader`} hittills · ${rest.length} prognos` : 'Hela året' })),
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Nästa år', on: { click: () => go(1) } }, '▶'));

  const hasData = data.recurring.length || data.oneOffs.length;
  if (!hasData) {
    fill(box, head, el('div', { class: 'card' }, el('div', { class: 'empty' },
      el('p', { class: 'muted', text: 'Inga poster än – lägg till inkomster och räkningar så syns månaderna här.' }),
      el('button', { type: 'button', class: 'btn tonal', text: 'Lägg till inkomster och kostnader', on: { click: () => focusAdd('income') } }))));
    return;
  }
  // Statistik för året: hittills (om året har börjat) och helår med prognos.
  const base = done.length ? done : months;
  const best = base.reduce((b, r) => (r.left > b.left ? r : b), base[0]);
  const worst = base.reduce((b, r) => (r.left < b.left ? r : b), base[0]);
  const avg = Math.round(sum(base, 'left') / base.length / 100) * 100;
  const label = done.length && rest.length ? 'hittills' : rest.length ? 'prognos' : 'helår';
  const stats = el('div', { class: 'card stats' }, el('h2', { text: `Året ${year} · ${label}` }),
    stat(kr(sum(base, 'income')), 'Inkomster'),
    stat(kr(sum(base, 'expense') - sum(base, 'savings')), 'Kostnader'),
    stat(kr(sum(base, 'savings')), '🐷 Sparat'),
    stat(kr(sum(base, 'left'), true), 'Kvar'),
    stat(kr(avg, true), 'Snitt kvar/mån'),
    stat(monthShortLabel(best.m), `Bäst: ${kr(best.left, true)}`),
    worst !== best ? stat(monthShortLabel(worst.m), `Sämst: ${kr(worst.left, true)}`) : null,
    done.length && rest.length ? stat(kr(sum(months, 'left'), true), 'Kvar helår (prognos)') : null,
    sum(base, 'income') ? stat(Math.round((sum(base, 'savings') / sum(base, 'income')) * 100) + ' %', '🐷 Sparkvot') : null,
    avgVar ? stat(kr(avgVar), `Rörligt snitt/mån (${closedMs.length} stängda)`) : null);

  const chartPast = (done.length ? done : months.slice(0, 1)).slice().reverse();
  const chartNext = done.length ? rest : months.slice(1);
  const lead = months.findIndex((r) => r.income || r.expense);   // tomma månader före första posten visas inte
  const shown = lead > 0 ? months.slice(lead) : months;
  const list = ovRows(shown, max, anyBal);
  list.querySelectorAll('li').forEach((li, i) => { if (shown[i].m > now) li.classList.add('ov-future'); });
  fill(box,
    head,
    stats,
    moneyChart(chartPast, chartNext, false),
    el('div', { class: 'card' }, el('h2', { text: 'Månad för månad' }), list),
    anyBal ? el('p', { class: 'muted small', text: 'Högra kolumnen: saldo efter månaden.' }) : null);
}
