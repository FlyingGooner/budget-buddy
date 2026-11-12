// Budget buddy - storage: localStorage access, validation of saved data and month maths. See CLAUDE.md.
// Plain script (not a module): loaded before app.js, which uses these names.
// Amounts are integers in öre. Months are 'YYYY-MM'.
'use strict';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  },
};

// ---------- Limits ----------
const MAX_AMOUNT = 10000000000; // 100 000 000 kr in öre
const MAX_RECURRING = 500;
const MAX_ONEOFFS = 5000;
const MAX_PEOPLE = 10;
const MAX_ACCOUNTS = 20;
const MAX_BALANCES = 600;
const EVERY = [1, 2, 3, 12];
// Currencies for savings accounts (v0.8.0). Rates = öre per 1 unit. Built-in defaults are ECB reference rates
// on RATES_DATE, written here by tools/update-rates.ps1 (run by hand) – the app itself never fetches rates.
// The user can change them in Inställningar.
const CURRENCIES = ['SEK', 'USD', 'EUR', 'GBP', 'NOK', 'DKK'];
const DEFAULT_RATES = { USD: 998, EUR: 1106, GBP: 1323, NOK: 105, DKK: 148 };
const RATES_DATE = '2026-11-12';
const MAX_RATE = 100000; // 1 000 kr per unit
const DATE_RE = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TYPES = ['income', 'expense'];

// ---------- Validators (saved data may be old, odd or tampered with) ----------
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const MONTH_RE = /^(19|20)\d{2}-(0[1-9]|1[0-2])$/; // 1900–2099: keeps string comparison of months valid
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const isMonth = (v) => typeof v === 'string' && MONTH_RE.test(v);
const isId = (v) => typeof v === 'string' && ID_RE.test(v) && v !== '__proto__';
const isAmount = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_AMOUNT;
// Control and text-direction characters are dropped from names (misleading display, U5).
const CTRL_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g;
const cleanName = (v, max = 60) => (typeof v === 'string' ? v.replace(CTRL_RE, '').trim().slice(0, max) : '');

// Categories are typed: income categories for income, expense categories for costs.
// 'other' (expense) and 'income-other' (income) always exist – fallbacks when a category is missing.
const FALLBACK_CAT = { expense: 'other', income: 'income-other' };
const DEFAULT_INCOME_CATEGORIES = [
  { id: 'salary', name: 'Lön', type: 'income' },
  { id: 'fk', name: 'Försäkringskassan', type: 'income' },
  { id: 'child', name: 'Barnbidrag', type: 'income' },
  { id: 'pension', name: 'Pension', type: 'income' },
  { id: 'income-other', name: 'Övrig inkomst', type: 'income' },
];
const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'home', name: 'Boende', type: 'expense' },
  { id: 'transport', name: 'Transport', type: 'expense' },
  { id: 'insurance', name: 'Försäkring', type: 'expense' },
  { id: 'subs', name: 'Abonnemang', type: 'expense' },
  { id: 'loan', name: 'Lån', type: 'expense' },
  { id: 'household', name: 'Hushåll', type: 'expense' },
  { id: 'savings', name: 'Sparande', type: 'expense' }, // SAVINGS_CAT: shown separately ("varav sparande")
  { id: 'other', name: 'Övrigt', type: 'expense' },
];
const DEFAULT_CATEGORIES = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];
const SAVINGS_CAT = 'savings';
const CATS_V = 2; // settings.catsV: one-time additions to older saved category lists (v2: "Sparande")

function emptyData() {
  return {
    version: 1,
    settings: { categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), people: [], startBalance: 0, startMonth: null, catsV: CATS_V,
      rates: { ...DEFAULT_RATES }, ratesDate: RATES_DATE, ratesOwn: false },
    recurring: [],
    oneOffs: [],
    adjustments: {},
    accounts: [],
  };
}

function loadData(d) {
  const out = emptyData();
  if (!isObj(d)) return out;

  // Settings
  const s = isObj(d.settings) ? d.settings : {};
  if (Array.isArray(s.categories)) {
    const seen = new Set();
    const cats = s.categories.filter(isObj)
      .map((c) => ({ id: isId(c.id) ? c.id : '', name: cleanName(c.name, 40), type: c.type === 'income' ? 'income' : 'expense' }))
      .filter((c) => c.id && c.name && !seen.has(c.id) && seen.add(c.id));
    if (cats.length) {
      // Older data had only expense categories: add the default income categories.
      if (!cats.some((c) => c.type === 'income')) cats.unshift(...DEFAULT_INCOME_CATEGORIES.filter((c) => !seen.has(c.id)).map((c) => ({ ...c })));
      // v2: add "Sparande" once (before "Övrigt"); not re-added if the user removes it later.
      if (s.catsV !== CATS_V && !seen.has(SAVINGS_CAT)) {
        const i = cats.findIndex((c) => c.id === 'other');
        cats.splice(i < 0 ? cats.length : i, 0, { id: SAVINGS_CAT, name: 'Sparande', type: 'expense' });
      }
      out.settings.categories = cats.slice(0, 60);
    }
  }
  for (const [type, id] of Object.entries(FALLBACK_CAT)) {
    const fb = out.settings.categories.find((c) => c.id === id);
    if (fb) fb.type = type;
    else out.settings.categories.push({ ...DEFAULT_CATEGORIES.find((c) => c.id === id) });
  }
  const catType = new Map(out.settings.categories.map((c) => [c.id, c.type]));
  const cat = (v, type) => (catType.get(v) === type ? v : FALLBACK_CAT[type]);
  if (Number.isInteger(s.startBalance) && Math.abs(s.startBalance) <= MAX_AMOUNT) out.settings.startBalance = s.startBalance;
  if (isMonth(s.startMonth)) out.settings.startMonth = s.startMonth;
  // Exchange rates: only own (user-saved) rates are kept; otherwise the built-in ones apply (newer after an update).
  if (s.ratesOwn === true && isObj(s.rates) && typeof s.ratesDate === 'string' && DATE_RE.test(s.ratesDate)) {
    for (const c of Object.keys(DEFAULT_RATES)) {
      const r = s.rates[c];
      if (Number.isInteger(r) && r > 0 && r <= MAX_RATE) out.settings.rates[c] = r;
    }
    out.settings.ratesDate = s.ratesDate;
    out.settings.ratesOwn = true;
  }
  // People (optional): who an item belongs to. null = gemensamt.
  if (Array.isArray(s.people)) {
    const seenP = new Set();
    out.settings.people = s.people.filter(isObj)
      .map((p) => ({ id: isId(p.id) ? p.id : '', name: cleanName(p.name, 30) }))
      .filter((p) => p.id && p.name && !seenP.has(p.id) && seenP.add(p.id)).slice(0, MAX_PEOPLE);
  }
  const personIds = new Set(out.settings.people.map((p) => p.id));
  const person = (v) => (personIds.has(v) ? v : null);

  // Recurring items
  const ids = new Set();
  if (Array.isArray(d.recurring)) {
    for (const r of d.recurring.slice(0, MAX_RECURRING)) {
      if (!isObj(r) || !isId(r.id) || ids.has(r.id) || !TYPES.includes(r.type) || !isAmount(r.amount) || !isMonth(r.start)) continue;
      const name = cleanName(r.name);
      if (!name) continue;
      const end = isMonth(r.end) && r.end >= r.start ? r.end : null;
      ids.add(r.id);
      out.recurring.push({ id: r.id, name, type: r.type, amount: r.amount, category: cat(r.category, r.type), person: person(r.person),
        every: r.type === 'income' ? 1 : EVERY.includes(r.every) ? r.every : 1, start: r.start, end }); // income: always monthly
    }
  }
  const recIds = new Set(out.recurring.map((r) => r.id));

  // One-off deviations
  if (Array.isArray(d.oneOffs)) {
    for (const o of d.oneOffs.slice(0, MAX_ONEOFFS)) {
      if (!isObj(o) || !isId(o.id) || ids.has(o.id) || !isMonth(o.month) || !TYPES.includes(o.type) || !isAmount(o.amount)) continue;
      const name = cleanName(o.name);
      if (!name) continue;
      ids.add(o.id);
      out.oneOffs.push({ id: o.id, month: o.month, name, type: o.type, amount: o.amount, category: cat(o.category, o.type), person: person(o.person) });
    }
  }

  // Adjustments: { month: { recurringId: amount } }
  if (isObj(d.adjustments)) {
    for (const [m, map] of Object.entries(d.adjustments)) {
      if (!isMonth(m) || !isObj(map)) continue;
      const clean = {};
      for (const [id, a] of Object.entries(map)) if (recIds.has(id) && isAmount(a)) clean[id] = a;
      if (Object.keys(clean).length) out.adjustments[m] = clean;
    }
  }
  // Savings accounts (v0.7.0): { id, name, balances: { 'YYYY-MM': öre } }. New objects with only month keys
  // that pass MONTH_RE – never copies untrusted keys such as __proto__.
  if (Array.isArray(d.accounts)) {
    const seenA = new Set();
    for (const a of d.accounts) {
      if (out.accounts.length >= MAX_ACCOUNTS) break;
      if (!isObj(a) || !isId(a.id) || seenA.has(a.id)) continue;
      const name = cleanName(a.name, 30);
      if (!name) continue;
      const balances = {};
      if (isObj(a.balances)) {
        const keys = Object.keys(a.balances).filter((m) => isMonth(m) && isAmount(a.balances[m])).sort().slice(-MAX_BALANCES);
        for (const m of keys) balances[m] = a.balances[m];
      }
      seenA.add(a.id);
      const currency = CURRENCIES.includes(a.currency) ? a.currency : 'SEK'; // v0.8.0; balances in minor units of it
      out.accounts.push({ id: a.id, name, currency, balances });
    }
  }
  // v0.6.0: "paid" (bocka av betalt) removed – old d.paid is dropped here and disappears on the next save.
  return out;
}

// ---------- Export/import as text (U5, shared standard: format level 1 = slim JSON in an envelope) ----------
const EXPORT_APP = 'budget-buddy';
const EXPORT_FORMAT = 1;
const MAX_IMPORT_CHARS = 2000000;

// Full data → slim: no default values or empty fields, type as "i"/"e". Input is always validated data.
function packData(d) {
  const s = d.settings, out = {}, set = {};
  const t = (type) => (type === 'income' ? 'i' : 'e');
  if (JSON.stringify(s.categories) !== JSON.stringify(DEFAULT_CATEGORIES)) set.categories = s.categories.map((c) => ({ id: c.id, name: c.name, type: t(c.type) }));
  if (s.people.length) set.people = s.people.map((p) => ({ id: p.id, name: p.name }));
  if (s.startMonth) { set.startBalance = s.startBalance; set.startMonth = s.startMonth; }
  if (s.ratesOwn) { set.rates = { ...s.rates }; set.ratesDate = s.ratesDate; }
  if (Object.keys(set).length) out.settings = set;
  const item = (r) => {
    const o = { id: r.id, name: r.name, type: t(r.type), amount: r.amount, category: r.category };
    if (r.person) o.person = r.person;
    return o;
  };
  if (d.recurring.length) out.recurring = d.recurring.map((r) => Object.assign(item(r),
    r.every !== 1 ? { every: r.every } : {}, { start: r.start }, r.end ? { end: r.end } : {}));
  if (d.oneOffs.length) out.oneOffs = d.oneOffs.map((o) => ({ month: o.month, ...item(o) }));
  if (Object.keys(d.adjustments).length) out.adjustments = d.adjustments;
  if (d.accounts.length) out.accounts = d.accounts.map((a) => Object.assign({ id: a.id, name: a.name },
    a.currency !== 'SEK' ? { currency: a.currency } : {}, Object.keys(a.balances).length ? { balances: a.balances } : {}));
  return out;
}

// Slim → full shape. Builds new objects from known keys only; loadData() then validates everything.
function unpackData(p) {
  if (!isObj(p)) return null;
  const type = (v) => (v === 'i' ? 'income' : v === 'e' ? 'expense' : null);
  const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);
  const s = isObj(p.settings) ? p.settings : {};
  const settings = { catsV: CATS_V, startBalance: s.startBalance, startMonth: s.startMonth };
  if (Array.isArray(s.categories)) settings.categories = list(s.categories).map((c) => ({ id: c.id, name: c.name, type: type(c.type) }));
  if (Array.isArray(s.people)) settings.people = list(s.people).map((x) => ({ id: x.id, name: x.name }));
  if (isObj(s.rates)) { settings.rates = { ...s.rates }; settings.ratesDate = s.ratesDate; settings.ratesOwn = true; }
  const item = (r) => ({ id: r.id, name: r.name, type: type(r.type), amount: r.amount, category: r.category, person: r.person ?? null });
  return {
    version: 1,
    settings,
    recurring: list(p.recurring).map((r) => ({ ...item(r), every: r.every ?? 1, start: r.start, end: r.end ?? null })),
    oneOffs: list(p.oneOffs).map((o) => ({ ...item(o), month: o.month })),
    adjustments: isObj(p.adjustments) ? p.adjustments : {},
    accounts: list(p.accounts).map((a) => ({ id: a.id, name: a.name, currency: a.currency ?? 'SEK', balances: isObj(a.balances) ? a.balances : {} })),
  };
}

function exportText(d, today) {
  return JSON.stringify({ app: EXPORT_APP, format: EXPORT_FORMAT, exported: today, data: packData(d) });   // compact: the file and the text box hold the same text
}

// Text → { data, counts, skipped } or { error }. Nothing is saved here; the caller confirms first.
function importText(text) {
  if (typeof text !== 'string' || !text.trim()) return { error: 'Klistra in en exporterad text först.' };
  if (text.length > MAX_IMPORT_CHARS) return { error: 'Texten är för lång (max 2 MB).' };
  let env;
  try { env = JSON.parse(text); } catch { return { error: 'Texten är inte en giltig export (trasig JSON). Kopiera hela texten igen.' }; }
  if (!isObj(env) || env.app !== EXPORT_APP) return { error: 'Texten kommer inte från Budget buddy.' };
  if (env.format !== EXPORT_FORMAT) return { error: 'Okänt exportformat – uppdatera appen och försök igen.' };
  const raw = unpackData(env.data);
  if (!raw) return { error: 'Exporten saknar data.' };
  const data = loadData(raw);
  const n = (k) => data[k].length;
  const inCount = raw.recurring.length + raw.oneOffs.length + raw.accounts.length;
  return { data, counts: { recurring: n('recurring'), oneOffs: n('oneOffs'), accounts: n('accounts') },
    skipped: Math.max(0, inCount - n('recurring') - n('oneOffs') - n('accounts')), exported: typeof env.exported === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(env.exported) ? env.exported : '' };
}

// ---------- Month maths ----------
function monthIndex(m) { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1); }
function addMonths(m, n) {
  const i = monthIndex(m) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Does a recurring item apply in month m?
function applies(r, m) {
  if (m < r.start || (r.end && m > r.end)) return false;
  return (monthIndex(m) - monthIndex(r.start)) % r.every === 0;
}

// All rows for a month: recurring (with any adjustment) + one-offs.
function rowsForMonth(data, m) {
  const adj = data.adjustments[m] || {};
  const rows = [];
  for (const r of data.recurring) {
    if (!applies(r, m)) continue;
    const adjusted = Object.hasOwn(adj, r.id);
    rows.push({ id: r.id, kind: 'rec', name: r.name, type: r.type, category: r.category, person: r.person,
      amount: adjusted ? adj[r.id] : r.amount, base: r.amount, adjusted });
  }
  for (const o of data.oneOffs) {
    if (o.month !== m) continue;
    rows.push({ id: o.id, kind: 'one', name: o.name, type: o.type, category: o.category, person: o.person,
      amount: o.amount, base: o.amount, adjusted: false });
  }
  return rows;
}

// savings = the part of expense in the "Sparande" category (still counted as expense: it leaves the account).
function totals(rows) {
  let income = 0, expense = 0, savings = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount;
    else { expense += r.amount; if (r.category === SAVINGS_CAT) savings += r.amount; }
  }
  return { income, expense, savings, left: income - expense };
}

// Running balance at the end of month m (null when no start month is set or m is before it).
function balanceAfter(data, m) {
  const start = data.settings.startMonth;
  if (!start || m < start) return null;
  let bal = data.settings.startBalance;
  for (let x = start; x <= m; x = addMonths(x, 1)) bal += totals(rowsForMonth(data, x)).left;
  return bal;
}

// Savings account balance at month m: the latest entered balance up to and including m.
// Returns { amount, month } or null; prevBalance gives the one before that.
function balanceAt(acc, m) {
  const ms = Object.keys(acc.balances).filter((x) => x <= m).sort();
  return ms.length ? { month: ms[ms.length - 1], amount: acc.balances[ms[ms.length - 1]] } : null;
}
function prevBalance(acc, m) {
  const cur = balanceAt(acc, m);
  return cur ? balanceAt(acc, addMonths(cur.month, -1)) : null;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
