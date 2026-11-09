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

function renderStats() {
  $('stats-title').textContent = monthLabel(month);
  const rows = rowsForMonth(data, month), t = totals(rows);
  const exp = rows.filter((r) => r.type === 'expense');
  const last12 = Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)).map((m) => ({ m, ...totals(rowsForMonth(data, m)) }));
  const used = last12.filter((x) => x.income || x.expense);
  const avgLeft = used.length ? Math.round(used.reduce((s, x) => s + x.left, 0) / used.length / 100) * 100 : null; // whole kronor
  const biggest = exp.reduce((b, r) => (!b || r.amount > b.amount ? r : b), null);

  fill($('stats-kpi'),
    el('h2', { text: 'Nyckeltal' }),
    stat(t.income ? Math.round((t.left / t.income) * 100) + ' %' : '–', 'Kvar av inkomst'),
    stat(t.income ? Math.round((t.savings / t.income) * 100) + ' %' : '–', '🐷 Sparkvot (sparande av inkomst)'),
    stat(avgLeft == null ? '–' : kr(avgLeft, true), `Snitt kvar/mån (${used.length} mån)`),
    stat(biggest ? kr(biggest.amount) : '–', biggest ? `Största: ${biggest.name}` : 'Största kostnad'),
    stat(kr(last12.reduce((s, x) => s + x.savings, 0)), '🐷 Sparat 12 mån'),
    stat(kr(t.savings), '🐷 Sparat den här månaden'));

  // Costs per category this month
  const byCat = new Map();
  for (const r of exp) byCat.set(r.category, (byCat.get(r.category) || 0) + r.amount);
  const cats = [...byCat].sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 1;
  fill($('stats-cats'), el('h2', { class: 'split' }, el('span', { text: 'Kostnader per kategori' }), el('span', { text: kr(t.expense) })),
    cats.length ? el('ul', { class: 'cat-bars' }, cats.map(([id, sum]) => {
      const f = el('div', { class: 'bar-fill' });
      f.style.width = Math.round((sum / max) * 100) + '%';
      return el('li', {}, el('span', { class: 'lbl', text: catName(id) }), el('span', { class: 'bar' }, f), el('span', { class: 'amount', text: kr(sum) }));
    })) : el('div', { class: 'empty' }, el('p', { class: 'muted', text: 'Inga kostnader den här månaden.' }),
      el('button', { type: 'button', class: 'btn tonal', text: 'Gå till kostnader', on: { click: () => focusAdd('expense') } })));

  // Trend: income and costs, the 12 months up to the chosen month
  const W = 340, H = 180, P = { l: 40, r: 6, t: 8, b: 20 };
  const top = Math.max(1, ...last12.map((x) => Math.max(x.income, x.expense)));
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / top);
  const cw = (W - P.l - P.r) / 12, bw = Math.max(3, cw * 0.36);
  const short = (ore) => nf0.format(Math.round(ore / 100000)) + 'k';
  const kids = [0, 0.5, 1].map((f) => [
    svg('line', { class: 'grid', x1: P.l, x2: W - P.r, y1: y(top * f), y2: y(top * f) }),
    svg('text', { class: 'ax', x: P.l - 4, y: y(top * f) + 3, 'text-anchor': 'end' }, short(top * f))]);
  last12.forEach((x, i) => {
    const cx = P.l + cw * i + cw / 2, cur = x.m === month ? ' b-cur' : '';
    kids.push(svg('rect', { class: 'b-in' + cur, x: cx - bw, y: y(x.income), width: bw, height: y(0) - y(x.income), rx: 1 }),
      svg('rect', { class: 'b-out' + cur, x: cx, y: y(x.expense), width: bw, height: y(0) - y(x.expense), rx: 1 }));
    if (i % 2 === 1 || i === 11) kids.push(svg('text', { class: 'ax', x: cx, y: H - 6, 'text-anchor': 'middle' }, monthShortLabel(x.m)));
  });
  fill($('stats-trend'), el('h2', { text: 'In och ut, 12 månader' }),
    used.length ? [svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Inkomster och kostnader per månad, ${monthLabel(last12[0].m)} till ${monthLabel(month)}` }, kids),
      el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Inkomster', el('span', { class: 'lg lg-out' }), 'Kostnader', el('span', { class: 'muted', text: '(tusental kr)' }))]
      : el('p', { class: 'muted', text: 'Inga poster än – lägg till inkomster och kostnader så syns trenden här.' }));
  renderAccounts();
}
