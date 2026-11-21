// Budget buddy – Statistik. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Statistik (for the month chosen in Månad) ----------
// SVG helper: createElementNS + setAttribute only (no markup strings).
function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (/^(on|style$|href$|src$|xlink:href$)/i.test(k)) throw new Error('svg: unsafe attribute ' + k);
    n.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
}
const stat = (value, label) => el('div', { class: 'stat' }, el('span', { class: 'stat-n', text: value }), el('span', { text: label }));

// Översikt (2026-11-18, förenklad): förra stängda månaden – förbrukat, sparat, kvar – och jämförelse med månaden innan.
// Konsumtion (2026-11-18) = kvar efter räkningar och sparande (planerat) − det som faktiskt blev över.
function closedSummary(m) {
  const t = monthTotals(data, m);
  return { m, spent: t.planned - t.left, saved: t.savings, left: t.left };
}
// Totalt sparat på kontona i slutet av månad m, i hemvalutan (hela kronor). null utan konton.
const accTotal = (m) => data.accounts.length ? Math.round(data.accounts.reduce((s, a) => s + toSek(estBalance(data, a, m)?.amount || 0, a.currency), 0) / 100) * 100 : null;
const closedMonths = () => Object.keys(data.closed).sort().reverse();
function renderStats() {
  const ms = closedMonths(), box = $('last-month');
  if (!ms.length) {
    fill(box, el('h2', { text: 'Förra månaden' }),
      el('p', { class: 'muted', text: 'Stäng månaden dagen före lön, så ser du här vad du konsumerade och sparade.' }),
      el('button', { type: 'button', class: 'btn tonal', text: 'Till Månad', on: { click: () => showTab('month') } }));
  } else {
    const c = closedSummary(ms[0]), p = ms[1] ? closedSummary(ms[1]) : null;
    const big = (v, label, key, good, prev = p && p[key]) => {
      const d = prev != null ? v - prev : 0;
      return el('div', { class: 'lm-stat' }, el('span', { class: 'lm-n', text: kr(v, key === 'left') }), el('span', { class: 'lm-l', text: label }),
        d ? el('span', { class: 'lm-d ' + ((d > 0) === good ? 'pos' : 'neg'), text: `${d > 0 ? '▲' : '▼'} ${kr(Math.abs(d))}` }) : null);
    };
    fill(box, el('h2', { class: 'split' }, el('span', { text: monthLabel(c.m) }), el('span', { text: '✓ Stängd' })),
      el('div', { class: 'lm-stats' }, big(c.spent, 'Konsumtion', 'spent', false), (accTotal(c.m) != null
        ? big(accTotal(c.m), '🐷 Totalt sparat', 'total', true, accTotal(addMonths(c.m, -1)))   // 2026-11-18: summan på kontona mot månaden innan
        : big(c.saved, '🐷 Sparat', 'saved', true)), big(c.left, 'Kvar på kontot', 'left', true)),
      el('p', { class: 'muted small', text: `▲▼ mot ${monthLabel(addMonths(c.m, -1)).toLowerCase()}` }));
  }
  renderAccounts();
}
