// Budget buddy - app logic and rendering. See CLAUDE.md and docs/SPEC.md.
// Plain script (not a module): loaded after version.js and store.js.
// Rendering: DOM + textContent only (CSP has Trusted Types) – never innerHTML.
'use strict';

const CONFIG = { storageKey: 'bb.data', tabKey: 'bb.tab', longPressMs: 450 };
const TABS = ['month', 'stats', 'overview', 'items', 'settings'];
const $ = (id) => document.getElementById(id);

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
  return (neg ? '−' : sign && ore > 0 ? '+' : '') + s + ' ' + unit();
}
// Hemvaluta (2026-11-15): alla belopp utom sparkonton är i data.settings.home. Talen skrivs alltid på svenskt sätt (1 250,50),
// bara enheten byts, så att inmatning och tolkning (parseKr) fungerar likadant på båda språken.
const UNITS = { SEK: 'kr', EUR: '€', USD: '$', GBP: '£', NOK: 'NOK', DKK: 'DKK' };
const home = () => data.settings.home || 'SEK';
const unit = (c = home()) => UNITS[c] || c;
const CUR_NAMES = { SEK: 'Kronor (SEK)', EUR: 'Euro (EUR)', USD: 'Dollar (USD)', GBP: 'Pund (GBP)', NOK: 'Norska kronor (NOK)', DKK: 'Danska kronor (DKK)' };
// Amount in a savings account's currency (minor units). SEK → "1 250 kr", others → "1 250 USD".
const curFmt = {};
function money(v, cur, sign = false) {
  if (cur === home()) return kr(v, sign);
  if (cur === 'SEK') { const a = Math.abs(v); return (v < 0 ? '−' : sign && v > 0 ? '+' : '') + (a % 100 === 0 ? nf0 : nf2).format(a / 100) + ' kr (SEK)'; }
  const neg = v < 0, a = Math.abs(v), d = a % 100 ? 2 : 0;
  const key = cur + d;
  curFmt[key] ||= new Intl.NumberFormat('sv-SE', { style: 'currency', currency: cur, currencyDisplay: 'code', minimumFractionDigits: d, maximumFractionDigits: d });
  return (neg ? '−' : sign && v > 0 ? '+' : '') + curFmt[key].format(a / 100);
}
const toSek = (v, cur) => convert(data, v, cur, home());   // namnet kvar: räknar nu om till hemvalutan
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
// Bakåt (som fns v0.16.8 och sn v0.14): flikbyte = pushState, popstate visar fliken ur hashen. Första fliken vid start
// ersätter steget (replaceState), så appen stängs när man backar förbi den.
function showTab(name, push = true) {
  if (!TABS.includes(name)) name = 'month';
  // Leaving Inställningar folds its sections again (as in the other apps).
  if (!$('tab-settings').hidden && name !== 'settings') for (const d of $('tab-settings').querySelectorAll('details[open]')) d.open = false;
  if (location.hash.slice(1) !== name) {
    if (push) history.pushState({ tab: 1 }, '', '#' + name); else history.replaceState(history.state, '', '#' + name);
  }
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.id !== `tab-${name}`; });
  const navName = name === 'items' ? 'month' : name;   // Poster är en undersida till Månad (2026-11-17)
  document.querySelectorAll('#nav button').forEach((b) => {
    if (b.dataset.tab === navName) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  store.set(CONFIG.tabKey, name);
}
$('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) showTab(b.dataset.tab);
});
// Lager (nav.js): varje öppen ruta och markeringsläget är ett steg. Bakåt stänger det översta; Spara/Avbryt/✕ går
// tillbaka ett steg själva. Välkomstrutan är inget lager – den går inte att stänga utan lösenord.
const nav = Nav.create(), layerClose = {};
function layerOpened(id, close) { layerClose[id] = close; if (Nav.opened(nav, id)) history.pushState({ tab: 1, layer: 1 }, '', location.hash); }
function layerClosed(id) { if (Nav.closed(nav, id) && nav.back === 1) queueMicrotask(() => { const k = Nav.flush(nav); if (k) history.go(-k); }); }
new MutationObserver((list) => {
  for (const m of list) {
    const d = m.target;
    if (d.tagName !== 'DIALOG' || !d.id || d.classList.contains('welcome')) continue;
    if (d.open) layerOpened(d.id, () => d.close()); else layerClosed(d.id);
  }
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
addEventListener('popstate', () => {
  const l = Nav.popped(nav);
  if (l === 'ignore') return;
  if (l) { layerClose[l]?.(); return; }
  showTab(location.hash.slice(1), false);
});
$('nav').addEventListener('click', () => Nav.reset(nav), true);
