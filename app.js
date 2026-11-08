// Budget buddy - app logic and rendering. See CLAUDE.md and docs/SPEC.md.
// Plain script (not a module): loaded after version.js and store.js.
// Rendering: DOM + textContent only (CSP has Trusted Types) – never innerHTML.
'use strict';

const CONFIG = { storageKey: 'bb.data', tabKey: 'bb.tab' };
const TABS = ['month', 'overview', 'stats', 'items', 'settings'];
const $ = (id) => document.getElementById(id);
const desktop = matchMedia('(min-width: 840px)');

let data = loadData(store.get(CONFIG.storageKey));
let month = currentMonth();
let overviewStart = currentMonth();
let editingId = null;     // recurring item in the form
let dialogRow = null;     // row in the month dialog (null = new one-off)

// ---------- DOM helper (textContent + setAttribute only) ----------
function el(tag, props = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) n.addEventListener(ev, fn);
    else if (/^(on|style$|href$|src$|srcset$|action$|formaction$|xlink:href$)/i.test(k)) throw new Error('el: unsafe attribute ' + k);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c);
  return n;
}

// Replace a node's children, skipping null/false (replaceChildren would print "null").
const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));

// ---------- Swedish formatting (Intl sv-SE) ----------
const nf0 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function kr(ore, sign = false) {
  const neg = ore < 0, a = Math.abs(ore);
  const s = (a % 100 === 0 ? nf0 : nf2).format(a / 100);
  return (neg ? '−' : sign && ore > 0 ? '+' : '') + s + ' kr';
}
const monthFmt = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('sv-SE', { month: 'short' });
const toDate = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = (m) => cap(monthFmt.format(toDate(m)));
const monthShortLabel = (m) => cap(monthShort.format(toDate(m)).replace('.', ''));

// Parse "1 234,50" / "1234.5" → öre (integer, no floats). null if invalid.
function parseKr(s) {
  const t = String(s).replace(/[\s ]/g, '').replace(/kr$/i, '').replace(',', '.');
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const ore = Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
  return ore <= MAX_AMOUNT ? ore : null;
}
const krInput = (ore) => (ore % 100 === 0 ? String(ore / 100) : (ore / 100).toFixed(2).replace('.', ',')); // check:ok värde i inmatningsfält, ska gå att läsa in igen

const catName = (id) => (data.settings.categories.find((c) => c.id === id) || { name: 'Övrigt' }).name;
const personName = (id) => (data.settings.people.find((p) => p.id === id) || { name: 'Gemensamt' }).name;
const hasPeople = () => data.settings.people.length > 0;
// Sub-line for a row: category, and person when people are used.
const subLine = (r, ...extra) => [catName(r.category), hasPeople() ? personName(r.person) : null, ...extra].filter(Boolean).join(' · ');
const everyLabel = { 1: 'varje månad', 2: 'varannan månad', 3: 'varje kvartal', 12: 'en gång om året' };

// ---------- Save ----------
function save() {
  if (!store.set(CONFIG.storageKey, data)) status('Kunde inte spara – lagringen är full eller blockerad.', true);
  render();
}

// ---------- Status line + snackbar ----------
function status(text, isError = false) {
  $('status').textContent = text;
  $('status').classList.toggle('offline', isError);
}
let snackTimer = null;
function snackbar(text, actionText, action, ms = 5000) {
  $('snack-text').textContent = text;
  const btn = $('snack-action');
  btn.hidden = !actionText;
  btn.textContent = actionText || '';
  btn.onclick = () => { hideSnack(); action && action(); };
  $('snackbar').hidden = false;
  clearTimeout(snackTimer);
  if (ms) snackTimer = setTimeout(hideSnack, ms);
}
function hideSnack() { $('snackbar').hidden = true; }

// Remove with undo: snapshot the data, apply, offer "Ångra".
function withUndo(label, change) {
  const before = JSON.stringify(data);
  change();
  save();
  snackbar(label, 'Ångra', () => { data = loadData(JSON.parse(before)); save(); });
}

// ---------- Navigation ----------
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.id !== `tab-${name}`; });
  document.querySelectorAll('#nav button').forEach((b) => {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  store.set(CONFIG.tabKey, name);
}
$('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) showTab(b.dataset.tab);
});

// ---------- Month view ----------
function markers(r) {
  return el('span', { class: 'markers', 'aria-hidden': 'true' },
    r.kind === 'rec' ? '↻' : '★', r.adjusted ? '✎' : null);
}
function rowLabel(r) {
  const bits = [r.kind === 'rec' ? 'återkommande' : 'avvikelse'];
  if (r.adjusted) bits.push('justerad denna månad');
  return bits.join(', ');
}

function monthRow(r) {
  const li = el('li', { class: 'row' });
  li.append(el('button', { type: 'button', class: 'row-main', 'aria-label': `${r.name}, ${kr(r.amount)}, ${rowLabel(r)}. Ändra`,
    on: { click: () => openRowDialog(r) } },
    el('span', { class: 'row-name' }, el('span', { text: r.name }), el('span', { class: 'row-sub', text: subLine(r) })),
    el('span', { class: 'amount', text: kr(r.amount) }), markers(r)));
  return li;
}

function renderMonth() {
  $('month-title').textContent = monthLabel(month);
  const rows = rowsForMonth(data, month);
  const t = totals(rows);
  const bal = balanceAfter(data, month);

  const income = rows.filter((r) => r.type === 'income');
  const expense = rows.filter((r) => r.type === 'expense');

  // Nothing at all this month: one welcoming card instead of three empty ones.
  const blank = !rows.length;
  $('income-card').hidden = $('expense-card').hidden = blank;
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
      el('div', { class: 'actions' },
        any ? el('button', { type: 'button', class: 'btn tonal', text: 'Till innevarande månad', on: { click: () => setMonth(currentMonth()) } })
          : el('button', { type: 'button', class: 'btn filled', text: 'Lägg till inkomst', on: { click: () => focusAdd('income') } })));
    return;
  }

  const pct = t.income ? Math.min(100, Math.round((t.expense / t.income) * 100)) : (t.expense ? 100 : 0);
  const barFill = el('div', { class: 'bar-fill' + (t.left < 0 ? ' over' : '') });
  barFill.style.width = pct + '%'; // CSSOM, allowed by CSP
  fill($('summary'),
    el('h2', { text: 'Kvar' }),
    el('p', { class: 'big ' + (t.left < 0 ? 'neg' : 'pos'), text: kr(t.left, true) }),
    el('p', { class: 'muted', text: `In ${kr(t.income)} · Ut ${kr(t.expense)}` }),
    t.savings ? el('p', { class: 'muted small', text: `Varav sparande ${kr(t.savings)} 🐷` }) : null,
    el('div', { class: 'bar', role: 'img', 'aria-label': `${pct} procent av inkomsterna går till kostnader` }, barFill),
    bal == null ? null : el('p', { class: 'muted small', text: `Saldo efter månaden: ${kr(bal)}` }),
    perPerson(rows),
  );

  // Empty card: one quiet line with a text link to Poster (like follow-diet-tracker), not a big button.
  const emptyMsg = (text, label, type) => el('p', { class: 'empty-line muted' }, text + ' ',
    el('button', { type: 'button', class: 'link', text: label, on: { click: () => focusAdd(type) } }));

  fill($('income-card'),
    el('h2', { class: 'split' }, el('span', { text: 'Inkomster' }), el('span', { text: kr(t.income) })),
    income.length ? el('ul', { class: 'list' }, income.map(monthRow))
      : emptyMsg('Inga inkomster den här månaden.', 'Lägg till', 'income'));
  fill($('expense-card'),
    el('h2', { class: 'split' }, el('span', { text: 'Kostnader' }),
      el('span', { text: kr(t.expense) })),
    expense.length ? el('ul', { class: 'list' }, expense.map(monthRow))
      : emptyMsg('Inga kostnader den här månaden.', 'Lägg till', 'expense'));
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
      el('th', { scope: 'col', text: 'Ut' }), el('th', { scope: 'col', text: 'Kvar' }))),
    el('tbody', {}, lines.map((g) => el('tr', {}, el('th', { scope: 'row', text: g.name }),
      el('td', { text: kr(g.income) }), el('td', { text: kr(g.expense) }),
      el('td', { class: g.left < 0 ? 'neg' : '', text: kr(g.left, true) })))));
}


function changeMonth(n) { setMonth(addMonths(month, n)); }
function setMonth(m) { month = m; renderMonth(); renderOverviewInto($('month-overview'), true); renderStats(); }
$('prev-month').addEventListener('click', () => changeMonth(-1));
$('next-month').addEventListener('click', () => changeMonth(1));
$('month-title').addEventListener('click', () => setMonth(currentMonth()));
$('stats-prev').addEventListener('click', () => changeMonth(-1));
$('stats-next').addEventListener('click', () => changeMonth(1));
$('stats-title').addEventListener('click', () => setMonth(currentMonth()));

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
  if (tab === 'month' || tab === 'stats') changeMonth(dir);
  else if (tab === 'overview') { overviewStart = addMonths(overviewStart, 12 * dir); renderOverview(); }
});

// ---------- Row dialog (adjust a recurring item for one month / edit a one-off) ----------
// Category select: only categories of the given type (income/expense).
function fillCategorySelect(sel, value, type = 'expense') {
  const cats = data.settings.categories.filter((c) => c.type === type);
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

function openRowDialog(r) {
  dialogRow = r || null;
  const isNew = !r, isOne = isNew || r.kind === 'one';
  $('rd-title').textContent = isNew ? 'Ny avvikelse' : r.name;
  $('rd-sub').textContent = isNew ? `Gäller bara ${monthLabel(month).toLowerCase()}.`
    : r.kind === 'rec' ? `Belopp för ${monthLabel(month).toLowerCase()}. Ordinarie ${kr(r.base)}.` : `Avvikelse i ${monthLabel(month).toLowerCase()}.`;
  $('rd-oneoff-fields').hidden = !isOne;
  $('rd-name').value = isOne && !isNew ? r.name : '';
  $('rd-type').value = isOne && !isNew ? r.type : 'expense';
  fillCategorySelect($('rd-cat'), isOne && !isNew ? r.category : null, $('rd-type').value);
  fillPersonSelect($('rd-person'), isOne && !isNew ? r.person : null);
  $('rd-amount').value = isNew ? '' : krInput(r.amount);
  $('rd-delete').hidden = isNew || r.kind !== 'one';
  $('rd-reset').hidden = isNew || r.kind !== 'rec' || !r.adjusted;
  $('rd-skip').hidden = isNew || r.kind !== 'rec' || (r.adjusted && r.amount === 0);
  $('rd-error').textContent = '';
  $('row-dialog').showModal();
  (isOne ? $('rd-name') : $('rd-amount')).focus();
}

$('add-oneoff').addEventListener('click', () => openRowDialog(null));
$('rd-type').addEventListener('change', () => fillCategorySelect($('rd-cat'), null, $('rd-type').value));
$('rd-cancel').addEventListener('click', () => $('row-dialog').close());

$('rd-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseKr($('rd-amount').value);
  if (amount == null) { $('rd-error').textContent = 'Skriv ett belopp, t.ex. 1 250 eller 99,50.'; return; }
  const r = dialogRow;
  if (!r || r.kind === 'one') {
    const name = cleanName($('rd-name').value);
    if (!name) { $('rd-error').textContent = 'Skriv ett namn.'; return; }
    const o = { id: r ? r.id : newId(), month, name, type: $('rd-type').value === 'income' ? 'income' : 'expense',
      amount, category: $('rd-cat').value, person: personValue($('rd-person')) };
    if (r) data.oneOffs = data.oneOffs.map((x) => (x.id === r.id ? o : x)); else data.oneOffs.push(o);
  } else if (amount === r.base) {
    clearAdjustment(r.id);
  } else {
    (data.adjustments[month] ||= {})[r.id] = amount;
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
  withUndo(`${r.name} togs bort`, () => { data.oneOffs = data.oneOffs.filter((o) => o.id !== r.id); data = loadData(data); });
});

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

// ---------- Statistik (for the month chosen in Månad) ----------
// SVG helper: createElementNS + setAttribute only (no markup strings).
function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
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

// ---------- Sparkonton (balances entered by hand, separate from Kvar) ----------
let dialogAcc = null;
function renderAccounts() {
  const accs = data.accounts;
  const total = (m) => accs.reduce((s, a) => s + (balanceAt(a, m)?.amount || 0), 0);
  $('acc-total').textContent = accs.length ? kr(total(month)) : '';
  fill($('acc-list'), accs.length ? accs.map((a) => {
    const cur = balanceAt(a, month), prev = prevBalance(a, month);
    const diff = cur && prev ? cur.amount - prev.amount : null;
    const sub = !cur ? 'Inget saldo än – tryck för att fylla i'
      : cur.month === month ? 'Ifyllt den här månaden' : `Senast ifyllt ${monthLabel(cur.month).toLowerCase()}`;
    return el('li', { class: 'row' }, el('button', { type: 'button', class: 'row-main',
      'aria-label': `${a.name}, ${cur ? kr(cur.amount) : 'inget saldo'}. Fyll i saldo`, on: { click: () => openAccDialog(a) } },
    el('span', { class: 'row-name' }, el('span', { text: a.name }), el('span', { class: 'row-sub', text: sub })),
    el('span', { class: 'acc-amt amount' }, el('span', { text: cur ? kr(cur.amount) : '–' }),
      diff != null ? el('span', { class: 'row-sub ' + (diff < 0 ? 'neg' : 'pos'), text: kr(diff, true) }) : null)));
  }) : el('li', { class: 'muted empty-row', text: 'Inga sparkonton än – lägg till det första nedan.' }));

  // Total savings balance, the 12 months up to the chosen month
  const ms = Array.from({ length: 12 }, (_, i) => addMonths(month, i - 11)), vals = ms.map(total);
  if (!vals.some((v) => v > 0)) { fill($('acc-chart')); return; }
  const W = 340, H = 140, P = { l: 40, r: 6, t: 8, b: 20 };
  const top = Math.max(1, ...vals);
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / top);
  const cw = (W - P.l - P.r) / 12, bw = Math.max(4, cw * 0.6);
  const short = (ore) => nf0.format(Math.round(ore / 100000)) + 'k';
  const kids = [0, 0.5, 1].map((f) => [
    svg('line', { class: 'grid', x1: P.l, x2: W - P.r, y1: y(top * f), y2: y(top * f) }),
    svg('text', { class: 'ax', x: P.l - 4, y: y(top * f) + 3, 'text-anchor': 'end' }, short(top * f))]);
  vals.forEach((v, i) => {
    const cx = P.l + cw * i + cw / 2;
    kids.push(svg('rect', { class: 'b-in' + (ms[i] === month ? ' b-cur' : ''), x: cx - bw / 2, y: y(v), width: bw, height: y(0) - y(v), rx: 1 }));
    if (i % 2 === 1 || i === 11) kids.push(svg('text', { class: 'ax', x: cx, y: H - 6, 'text-anchor': 'middle' }, monthShortLabel(ms[i])));
  });
  fill($('acc-chart'), svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Totalt sparsaldo per månad, ${monthLabel(ms[0])} till ${monthLabel(month)}` }, kids),
  el('div', { class: 'legend' }, el('span', { class: 'lg lg-in' }), 'Totalt sparsaldo', el('span', { class: 'muted', text: '(tusental kr)' })));
}

function openAccDialog(a) {
  dialogAcc = a;
  const cur = balanceAt(a, month);
  $('ad-title').textContent = a.name;
  $('ad-sub').textContent = `Saldo i ${monthLabel(month).toLowerCase()}.` + (cur && cur.month !== month ? ` Senast: ${kr(cur.amount)} (${monthLabel(cur.month).toLowerCase()}).` : '');
  $('ad-amount').value = Object.hasOwn(a.balances, month) ? krInput(a.balances[month]) : '';
  $('ad-error').textContent = '';
  $('acc-dialog').showModal();
  $('ad-amount').focus();
}
$('ad-cancel').addEventListener('click', () => $('acc-dialog').close());
$('ad-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseKr($('ad-amount').value);
  if (amount == null || !isAmount(amount)) { $('ad-error').textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; return; }
  const a = data.accounts.find((x) => x.id === dialogAcc.id);
  if (a) a.balances[month] = amount;
  data = loadData(data);
  $('acc-dialog').close();
  save();
});
$('ad-delete').addEventListener('click', () => {
  const a = dialogAcc;
  $('acc-dialog').close();
  withUndo(`${a.name} togs bort`, () => { data.accounts = data.accounts.filter((x) => x.id !== a.id); });
});
$('acc-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName($('acc-name').value, 30);
  if (!n) return;
  if (data.accounts.length >= MAX_ACCOUNTS) { snackbar(`Max ${MAX_ACCOUNTS} sparkonton.`, null, null, 3000); return; }
  const a = { id: 'a' + newId().slice(-10), name: n, balances: {} };
  data.accounts.push(a);
  data = loadData(data);
  $('acc-name').value = '';
  save();
  openAccDialog(data.accounts.find((x) => x.id === a.id));
});

// ---------- Items (recurring): separate cards for income and expenses ----------
const EVERY_OPTIONS = [[1, 'Varje månad'], [2, 'Varannan månad'], [3, 'Varje kvartal'], [12, 'En gång om året']];
function fillEverySelect(sel, value = 1) {
  sel.replaceChildren(...EVERY_OPTIONS.map(([v, t]) => el('option', { value: v, text: t })));
  sel.value = String(value);
}

function itemRow(r, now) {
  const ended = r.end && r.end < now;
  const sub = subLine(r, r.type === 'expense' ? everyLabel[r.every] : null,
    r.start > now ? `från ${monthShortLabel(r.start).toLowerCase()} ${r.start.slice(0, 4)}` : null,
    r.end ? `till ${monthShortLabel(r.end).toLowerCase()} ${r.end.slice(0, 4)}` : null);
  return el('li', { class: 'row' + (ended ? ' ended' : '') }, el('button', { type: 'button', class: 'row-main',
    'aria-label': `${r.name}, ${kr(r.amount)}. Ändra`, on: { click: () => openItemDialog(r) } },
  el('span', { class: 'row-name' }, el('span', { text: r.name + (ended ? ' (avslutad)' : '') }), el('span', { class: 'row-sub', text: sub })),
  el('span', { class: 'amount', text: kr(r.amount) })));
}

function renderItems() {
  const now = currentMonth();
  for (const [type, list, sum, empty] of [
    ['income', 'inc-list', 'inc-sum', 'Inga inkomster än – lägg till din nettolön (efter skatt) nedan.'],
    ['expense', 'exp-list', 'exp-sum', 'Inga kostnader än – lägg till hyra, el och andra räkningar nedan.'],
  ]) {
    const items = data.recurring.filter((r) => r.type === type).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'sv'));
    const monthly = items.filter((r) => r.every === 1 && (!r.end || r.end >= now)).reduce((s, r) => s + r.amount, 0);
    $(sum).textContent = items.length ? `${kr(monthly)}/mån` : '';
    fill($(list), items.length ? items.map((r) => itemRow(r, now)) : el('li', { class: 'muted empty-row', text: empty }));
  }
  for (const f of [$('inc-form'), $('exp-form')]) {
    fillCategorySelect(f.elements.category, f.elements.category.value, f.dataset.type);
    fillPersonSelect(f.elements.person, f.elements.person.value);
  }
}

// Quick add: name + amount (+ category) + how often. Starts the month being viewed.
function setupAddForm(form) {
  const type = form.dataset.type;
  if (form.elements.every) fillEverySelect(form.elements.every);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements, err = form.querySelector('.error');
    // Income has no name field: the category is the name ("Lön", "Barnbidrag" …).
    const name = f.name ? cleanName(f.name.value) : catName(f.category.value);
    const amount = parseKr(f.amount.value);
    if (!name) { err.textContent = 'Skriv ett namn.'; (f.name || f.category).focus(); return; }
    if (amount == null) { err.textContent = 'Skriv ett belopp, t.ex. 1 250 eller 99,50.'; f.amount.focus(); return; }
    if (data.recurring.length >= MAX_RECURRING) { err.textContent = `Max ${MAX_RECURRING} poster.`; return; }
    err.textContent = '';
    data.recurring.push({ id: newId(), name, amount, type, category: f.category.value, person: personValue(f.person),
      every: type === 'income' ? 1 : Number(f.every.value), start: month, end: null });
    data = loadData(data);
    save();
    if (f.name) f.name.value = ''; f.amount.value = '';
    (f.name || f.category).focus();
    snackbar(`${name} lades till`, null, null, 3000);
  });
}
setupAddForm($('inc-form'));
setupAddForm($('exp-form'));

// Jump from an empty state to the right add form.
function focusAdd(type) {
  showTab('items');
  const els = $(type === 'income' ? 'inc-form' : 'exp-form').elements;
  const input = els.name || els.category;
  input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  input.focus({ preventScroll: true });
}

// Edit dialog: all details incl. period.
function openItemDialog(r) {
  editingId = r.id;
  $('id-title').textContent = r.type === 'income' ? 'Ändra inkomst' : 'Ändra kostnad';
  $('f-name').value = r.name;
  $('f-amount').value = krInput(r.amount);
  fillEverySelect($('f-every'), r.every);
  $('f-every-wrap').hidden = r.type === 'income'; // income is always monthly
  fillPersonSelect($('f-person'), r.person);
  fillCategorySelect($('f-cat'), r.category, r.type);
  $('f-start').value = r.start;
  $('f-end').value = r.end || '';
  $('f-error').textContent = '';
  $('item-dialog').showModal();
  $('f-amount').focus();
}
$('f-cancel').addEventListener('click', () => $('item-dialog').close());
$('f-delete').addEventListener('click', () => {
  const r = data.recurring.find((x) => x.id === editingId);
  $('item-dialog').close();
  if (!r) return;
  withUndo(`${r.name} togs bort`, () => { data.recurring = data.recurring.filter((x) => x.id !== r.id); data = loadData(data); });
});
$('id-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = data.recurring.find((x) => x.id === editingId);
  if (!r) { $('item-dialog').close(); return; }
  const name = cleanName($('f-name').value);
  const amount = parseKr($('f-amount').value);
  const start = $('f-start').value, end = $('f-end').value || null;
  const err = !name ? 'Skriv ett namn.' : amount == null ? 'Skriv ett belopp, t.ex. 1 250 eller 99,50.'
    : !isMonth(start) ? 'Välj från vilken månad.' : end && (!isMonth(end) || end < start) ? 'Till-månaden måste vara efter från-månaden.' : '';
  if (err) { $('f-error').textContent = err; return; }
  const item = { ...r, name, amount, every: r.type === 'income' ? 1 : Number($('f-every').value), start, end,
    category: $('f-cat').value, person: personValue($('f-person')) };
  data.recurring = data.recurring.map((x) => (x.id === r.id ? item : x));
  data = loadData(data);
  $('item-dialog').close();
  save();
  snackbar('Posten är sparad', null, null, 3000);
});

// ---------- Settings ----------
// Editable name row (category or person) with a remove button.
function nameRow({ value, max, label, onRename, removable, onRemove, note }) {
  const input = el('input', { 'aria-label': label, maxlength: max, autocomplete: 'off' });
  input.value = value;
  input.addEventListener('change', () => {
    const n = cleanName(input.value, max);
    if (n) onRename(n); else input.value = value;
  });
  return el('li', { class: 'row cat' }, input, removable
    ? el('button', { type: 'button', class: 'icon-btn', 'aria-label': `Ta bort ${value}`, title: note, on: { click: onRemove } }, '✕')
    : el('span', { class: 'muted small', text: 'standard' }));
}

function renderSettings() {
  for (const type of ['income', 'expense']) {
    const fb = FALLBACK_CAT[type], fbName = catName(fb);
    fill($(`cat-list-${type}`), data.settings.categories.filter((c) => c.type === type).map((c) => nameRow({
      value: c.name, max: 40, label: `Namn på kategori ${c.name}`,
      onRename: (n) => { c.name = n; save(); },
      removable: c.id !== fb, note: `Poster flyttas till ${fbName}`,
      onRemove: () => withUndo(`Kategorin ${c.name} togs bort`, () => {
        data.settings.categories = data.settings.categories.filter((x) => x.id !== c.id);
        data = loadData(data); // items move to the fallback category
      }),
    })));
  }
  fill($('person-list'), data.settings.people.length ? data.settings.people.map((p) => nameRow({
    value: p.name, max: 30, label: `Namn på person ${p.name}`,
    onRename: (n) => { p.name = n; save(); },
    removable: true, note: 'Personens poster blir gemensamma',
    onRemove: () => withUndo(`${p.name} togs bort – posterna är nu gemensamma`, () => {
      data.settings.people = data.settings.people.filter((x) => x.id !== p.id);
      data = loadData(data); // items of this person become shared (person: null)
    }),
  })) : el('li', { class: 'muted empty-row', text: 'Inga personer – allt räknas som gemensamt.' }));
  $('s-balance').value = data.settings.startMonth ? krInput(Math.abs(data.settings.startBalance)) : '';
  if (data.settings.startBalance < 0) $('s-balance').value = '-' + $('s-balance').value;
  $('s-month').value = data.settings.startMonth || '';
}
document.querySelectorAll('.cat-form').forEach((form) => form.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName(form.elements.name.value, 40);
  if (!n) return;
  if (data.settings.categories.length >= 60) { snackbar('Max 60 kategorier.', null, null, 3000); return; }
  data.settings.categories.push({ id: 'c' + newId().slice(-10), name: n, type: form.dataset.type === 'income' ? 'income' : 'expense' });
  data = loadData(data);
  form.elements.name.value = '';
  save();
}));
$('person-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName($('person-name').value, 30);
  if (!n) return;
  if (data.settings.people.length >= MAX_PEOPLE) { snackbar(`Max ${MAX_PEOPLE} personer.`, null, null, 3000); return; }
  data.settings.people.push({ id: 'p' + newId().slice(-10), name: n });
  data = loadData(data);
  $('person-name').value = '';
  save();
  snackbar(`${n} lades till`, null, null, 3000);
});
$('s-save').addEventListener('click', () => {
  const raw = $('s-balance').value.trim(), m = $('s-month').value;
  if (!raw && !m) { data.settings.startBalance = 0; data.settings.startMonth = null; save(); snackbar('Startsaldo borttaget', null, null, 3000); return; }
  const neg = raw.startsWith('-') || raw.startsWith('−');
  const ore = parseKr(neg ? raw.slice(1) : raw || '0');
  if (ore == null || !isMonth(m)) { snackbar('Fyll i både saldo och månad.', null, null, 4000); return; }
  data.settings.startBalance = neg ? -ore : ore;
  data.settings.startMonth = m;
  save();
  snackbar('Startsaldo sparat', null, null, 3000);
});
$('reset').addEventListener('click', () => $('confirm-dialog').showModal());
$('confirm-dialog').addEventListener('close', () => {
  if ($('confirm-dialog').returnValue !== 'ok') return;
  data = emptyData();
  save();
  snackbar('All data är rensad', null, null, 3000);
});

// ---------- Install (beforeinstallprompt) ----------
let installEvent = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('install').hidden = false; });
addEventListener('appinstalled', () => { installEvent = null; $('install').hidden = true; });
$('install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice.catch(() => null);
  installEvent = null;
  $('install').hidden = true;
});

// ---------- Offline status ----------
function updateOnline() { if (navigator.onLine) status(''); else status('Offline – allt fungerar ändå, data finns på enheten.', false); }
addEventListener('online', updateOnline);
addEventListener('offline', updateOnline);

// ---------- Render all ----------
function render() {
  renderMonth();
  renderOverview();
  renderOverviewInto($('month-overview'), true);
  renderStats();
  renderItems();
  renderSettings();
}


// ---------- Start ----------
$('version').textContent = 'v' + self.APP_VERSION;
const savedTab = store.get(CONFIG.tabKey);
showTab(TABS.includes(savedTab) ? savedTab : 'month');
updateOnline();
render();

// Service worker + update snackbar ("Ny version finns – Ladda om")
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => null);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}
