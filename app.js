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
// Amount in a savings account's currency (minor units). SEK → "1 250 kr", others → "1 250 USD".
const curFmt = {};
function money(v, cur, sign = false) {
  if (cur === 'SEK') return kr(v, sign);
  const neg = v < 0, a = Math.abs(v), d = a % 100 ? 2 : 0;
  const key = cur + d;
  curFmt[key] ||= new Intl.NumberFormat('sv-SE', { style: 'currency', currency: cur, currencyDisplay: 'code', minimumFractionDigits: d, maximumFractionDigits: d });
  return (neg ? '−' : sign && v > 0 ? '+' : '') + curFmt[key].format(a / 100);
}
const toSek = (v, cur) => (cur === 'SEK' ? v : Math.round((v * data.settings.rates[cur]) / 100));
const dayFmt = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
const dayLabel = (d) => { const [y, m, dd] = d.split('-').map(Number); return dayFmt.format(new Date(y, m - 1, dd)).replace('.', ''); };
const ratesNote = () => (data.settings.ratesOwn ? `Egna kurser från ${dayLabel(data.settings.ratesDate)}`
  : `ECB:s referenskurser ${dayLabel(data.settings.ratesDate)}`);
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
