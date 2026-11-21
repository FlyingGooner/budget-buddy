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
const MAX_TRASH = 200;
const TRASH_DAYS = 30; // Papperskorg: removed items are kept this many days, then deleted for good
const EVERY = [1, 2, 3, 12];
// Currencies for savings accounts (v0.8.0). Rates = öre per 1 unit. Built-in defaults are ECB reference rates
// on RATES_DATE, written here by tools/update-rates.mjs (GitHub Action rates.yml, weekdays) – the app itself never fetches rates.
// The user can change them in Inställningar.
const CURRENCIES = ['SEK', 'USD', 'EUR', 'GBP', 'NOK', 'DKK'];
const DEFAULT_RATES = { USD: 1020, EUR: 1121, GBP: 1339, NOK: 105, DKK: 150 };
const RATES_DATE = '2026-11-20';
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

// Dataversion (2026-11-21): loadData() kör MIGRATIONS i ordning från den sparade versionen och sparar alltid den senaste.
// Lägg en ny funktion här när fält byter betydelse; nya valfria fält behöver ingen (loadData fyller i standardvärden).
const DATA_VERSION = 3;
const MIGRATIONS = {
  // 1 → 2: sparkonton kan fyllas på av engångssparande (feeds kan peka på avvikelser), papperskorgen minns kontokopplingar.
  // Inga gamla fält ändrar betydelse, så inget behöver skrivas om.
  2: (d) => d,
  // 2 → 3: pre: true blir src: 'pre' (görs i srcOf, som också läser gamla backuper).
  3: (d) => d,
};
function migrate(d) {
  let v = Number.isInteger(d.version) && d.version >= 1 ? d.version : 1;
  if (v > DATA_VERSION) return d;   // nyare app har sparat – läs det vi känner igen
  while (v < DATA_VERSION) d = MIGRATIONS[++v](d);
  return d;
}

function emptyData() {
  return {
    version: DATA_VERSION,
    settings: { categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), people: [], startBalance: 0, startMonth: null, catsV: CATS_V,
      rates: { ...DEFAULT_RATES }, ratesDate: RATES_DATE, ratesOwn: false, sort: 'a-', home: 'SEK', payday: 1 },
    recurring: [],
    oneOffs: [],
    adjustments: {},
    accounts: [],
    trash: [],
    closed: {},
    carry: [],
  };
}

// Sparandets källa (v3, 2026-11-21): saknas = från lönen (en kostnad som lämnar kontot), 'pre' = dras före lönen
// (aldrig på kontot), 'extra' = utöver lönen, t.ex. en gåva direkt till sparkontot. Bara på kostnader i kategorin Sparande.
const SAVING_SRC = ['pre', 'extra'];
const srcOf = (r, category) => {
  if (r.type !== 'expense' || category !== SAVINGS_CAT) return {};
  const src = SAVING_SRC.includes(r.src) ? r.src : r.pre === true ? 'pre' : null;   // pre: true = äldre data (v1–v2)
  return src ? { src } : {};
};

function loadData(d) {
  const out = emptyData();
  if (!isObj(d)) return out;
  d = migrate(d);

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
  if (isSort(s.sort)) out.settings.sort = s.sort;
  // Lönedag (2026-11-17): budgetmånaden börjar den dagen (1 = kalendermånad). Månaden heter efter den månad lönen kommer.
  out.settings.payday = Number.isInteger(s.payday) && s.payday >= 1 && s.payday <= 28 ? s.payday : 1;
  if (CURRENCIES.includes(s.home)) out.settings.home = s.home; // v0.13 (2026-11-15): hemvaluta, alla belopp utom sparkonton är i den
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
        every: r.type === 'income' ? 1 : EVERY.includes(r.every) ? r.every : 1, start: r.start, end,
        ...srcOf(r, cat(r.category, r.type)) }); // income: always monthly; src: varifrån sparandet kommer (se SAVING_SRC)
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
      out.oneOffs.push({ id: o.id, month: o.month, name, type: o.type, amount: o.amount, category: cat(o.category, o.type), person: person(o.person),
        ...srcOf(o, cat(o.category, o.type)) });
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
  // Stängda månader (2026-11-17): { 'YYYY-MM': öre } – vad som faktiskt var kvar dagen före nästa lön. Ersätter planerat kvar.
  if (isObj(d.closed)) {
    for (const m of Object.keys(d.closed).filter(isMonth).sort().slice(-600)) {
      const v = d.closed[m];
      if (Number.isInteger(v) && Math.abs(v) <= MAX_AMOUNT) out.closed[m] = v;
    }
  }
  // Kvar som följer med (2026-11-21): stängda månader vars kvar ligger kvar på kontot och blir en rad i nästa månad.
  if (Array.isArray(d.carry)) out.carry = [...new Set(d.carry.filter((m) => isMonth(m) && Object.hasOwn(out.closed, m)))].sort();
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
      // feeds (2026-11-17): återkommande sparposter som fyller på kontot varje månad (beräknat saldo, se estBalance).
      const feeds = Array.isArray(a.feeds) ? [...new Set(a.feeds.filter((x) => ids.has(x)))].slice(0, 40) : [];   // 2026-11-21: även engångssparande (avvikelser)
      // goal (2026-11-21, valfritt): { amount, month? } – sparmål i kontots valuta, ev. klart till en månad. Finns bara när det är satt.
      const goal = isObj(a.goal) && isAmount(a.goal.amount) && a.goal.amount > 0
        ? { amount: a.goal.amount, ...(isMonth(a.goal.month) ? { month: a.goal.month } : {}) } : null;
      out.accounts.push({ id: a.id, name, currency, balances, feeds, hidden: a.hidden === true, ...(goal ? { goal } : {}) });   // hidden: visas inte i Månad
    }
  }
  // Papperskorg (v0.13): [{ d: removed date, rec | one | acc: the item, adj?: { month: amount } for rec }]. Each entry is
  // validated like live data (same settings), so a restored item is always valid. Not in the export.
  if (Array.isArray(d.trash)) {
    for (const t of d.trash.slice(-MAX_TRASH)) {
      if (!isObj(t) || typeof t.d !== 'string' || !DATE_RE.test(t.d)) continue;
      const adj = {};
      if (isObj(t.rec) && isObj(t.adj)) for (const [m, a] of Object.entries(t.adj)) if (isMonth(m)) adj[m] = { [t.rec.id]: a };
      const sub = loadData({ settings: d.settings, recurring: isObj(t.rec) ? [t.rec] : [], oneOffs: isObj(t.one) ? [t.one] : [],
        accounts: isObj(t.acc) ? [t.acc] : [], adjustments: adj });
      const e = sub.recurring[0] ? { d: t.d, rec: sub.recurring[0] } : sub.oneOffs[0] ? { d: t.d, one: sub.oneOffs[0] } : sub.accounts[0] ? { d: t.d, acc: sub.accounts[0] } : null;
      if (!e) continue;
      if (e.rec) { const a = {}; for (const [m, map] of Object.entries(sub.adjustments)) a[m] = map[e.rec.id]; if (Object.keys(a).length) e.adj = a; }
      if (!e.acc && Array.isArray(t.accs)) { const accs = [...new Set(t.accs.filter(isId))].slice(0, MAX_ACCOUNTS); if (accs.length) e.accs = accs; }
      out.trash.push(e);
    }
  }
  // v0.6.0: "paid" (bocka av betalt) removed – old d.paid is dropped here and disappears on the next save.
  return out;
}

// ---------- Sortering (Poster) ----------
// settings.sort = kolumn + riktning ("a-" = belopp fallande). A new column starts in its natural direction
// (SORT_ASC: A–Ö and earliest first); the same column again flips it. A UI choice: not in the export.
const SORTS = { a: 'Belopp', n: 'Namn', c: 'Kategori', s: 'Start' };
const SORT_ASC = ['n', 'c', 's'];
const isSort = (v) => typeof v === 'string' && v.length === 2 && Object.hasOwn(SORTS, v[0]) && '+-'.includes(v[1]);
const nextSort = (cur, k) => k + (cur[0] === k ? (cur[1] === '+' ? '-' : '+') : SORT_ASC.includes(k) ? '+' : '-');
// A sorted copy of recurring items. catName gives a category's name. Ties: name A–Ö.
function sortItems(items, spec, catName) {
  const k = spec[0], dir = spec[1] === '+' ? 1 : -1, sv = (a, b) => a.localeCompare(b, 'sv');
  const cmp = { a: (x, y) => x.amount - y.amount, n: (x, y) => sv(x.name, y.name), c: (x, y) => sv(catName(x.category), catName(y.category)),
    s: (x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : 0) }[k];
  return [...items].sort((x, y) => dir * cmp(x, y) || sv(x.name, y.name));
}

// ---------- Papperskorg ----------
// Moves items to the trash (recurring with their month adjustments). kind: 'rec' | 'one' | 'acc'. Mutates d.
function trashItems(d, kind, ids, today) {
  const set = new Set(ids), key = { rec: 'recurring', one: 'oneOffs', acc: 'accounts' }[kind];
  for (const x of d[key].filter((x) => set.has(x.id))) {
    const e = { d: today, [kind]: x };
    if (kind !== 'acc') {   // 2026-11-21: kom ihåg vilka konton posten fyllde på, så kopplingen kommer tillbaka vid återställning
      const accs = d.accounts.filter((a) => (a.feeds || []).includes(x.id)).map((a) => a.id);
      if (accs.length) e.accs = accs;
    }
    if (kind === 'rec') {
      const adj = {};
      for (const [m, map] of Object.entries(d.adjustments)) if (Object.hasOwn(map, x.id)) { adj[m] = map[x.id]; delete map[x.id]; if (!Object.keys(map).length) delete d.adjustments[m]; }
      if (Object.keys(adj).length) e.adj = adj;
    }
    d.trash.push(e);
  }
  d[key] = d[key].filter((x) => !set.has(x.id));
  if (d.trash.length > MAX_TRASH) d.trash.splice(0, d.trash.length - MAX_TRASH);
}
// Puts trash entry i back. Returns the item, or { error } when a limit is reached. A taken id gets a new one.
function restoreItem(d, i) {
  const e = d.trash[i]; if (!e) return { error: 'Finns inte längre.' };
  const kind = e.rec ? 'rec' : e.one ? 'one' : 'acc', key = { rec: 'recurring', one: 'oneOffs', acc: 'accounts' }[kind];
  const max = { rec: MAX_RECURRING, one: MAX_ONEOFFS, acc: MAX_ACCOUNTS }[kind];
  if (d[key].length >= max) return { error: `Max ${max} – ta bort något först.` };
  const x = { ...e[kind] };
  const taken = new Set([...d.recurring, ...d.oneOffs, ...d.accounts].map((y) => y.id));
  if (taken.has(x.id)) x.id = (kind === 'acc' ? 'a' : '') + newId().slice(-10);
  d[key].push(x);
  if (e.adj) for (const [m, a] of Object.entries(e.adj)) (d.adjustments[m] ||= {})[x.id] = a;
  for (const a of d.accounts) if ((e.accs || []).includes(a.id) && !(a.feeds ||= []).includes(x.id)) a.feeds.push(x.id);
  d.trash.splice(i, 1);
  return x;
}
// Deletes entries older than TRASH_DAYS. Returns how many.
function purgeTrash(d, today) {
  const t = new Date(today + 'T00:00:00'); t.setDate(t.getDate() - TRASH_DAYS);
  const limit = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  const n = d.trash.length;
  d.trash = d.trash.filter((e) => e.d > limit);
  return n - d.trash.length;
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
  if (s.home !== 'SEK') set.home = s.home;
  if (s.payday > 1) set.payday = s.payday;
  if (Object.keys(set).length) out.settings = set;
  const item = (r) => {
    const o = { id: r.id, name: r.name, type: t(r.type), amount: r.amount, category: r.category };
    if (r.person) o.person = r.person;
    if (r.src) o.src = r.src;   // varifrån sparandet kommer följer med i backupen
    return o;
  };
  if (d.recurring.length) out.recurring = d.recurring.map((r) => Object.assign(item(r),
    r.every !== 1 ? { every: r.every } : {}, { start: r.start }, r.end ? { end: r.end } : {}));
  if (d.oneOffs.length) out.oneOffs = d.oneOffs.map((o) => ({ month: o.month, ...item(o) }));
  if (Object.keys(d.adjustments).length) out.adjustments = d.adjustments;
  if (Object.keys(d.closed || {}).length) out.closed = d.closed;
  if ((d.carry || []).length) out.carry = d.carry;
  if (d.accounts.length) out.accounts = d.accounts.map((a) => Object.assign({ id: a.id, name: a.name },
    a.currency !== 'SEK' ? { currency: a.currency } : {}, Object.keys(a.balances).length ? { balances: a.balances } : {},
    a.feeds && a.feeds.length ? { feeds: a.feeds } : {}, a.hidden ? { hidden: true } : {}, a.goal ? { goal: a.goal } : {}));
  return out;
}

// Slim → full shape. Builds new objects from known keys only; loadData() then validates everything.
function unpackData(p) {
  if (!isObj(p)) return null;
  const type = (v) => (v === 'i' ? 'income' : v === 'e' ? 'expense' : null);
  const list = (v) => (Array.isArray(v) ? v.filter(isObj) : []);
  const s = isObj(p.settings) ? p.settings : {};
  const settings = { catsV: CATS_V, startBalance: s.startBalance, startMonth: s.startMonth, home: s.home, payday: s.payday };
  if (Array.isArray(s.categories)) settings.categories = list(s.categories).map((c) => ({ id: c.id, name: c.name, type: type(c.type) }));
  if (Array.isArray(s.people)) settings.people = list(s.people).map((x) => ({ id: x.id, name: x.name }));
  if (isObj(s.rates)) { settings.rates = { ...s.rates }; settings.ratesDate = s.ratesDate; settings.ratesOwn = true; }
  const item = (r) => ({ id: r.id, name: r.name, type: type(r.type), amount: r.amount, category: r.category, person: r.person ?? null, src: r.src, pre: r.pre === true });
  return {
    version: DATA_VERSION,
    settings,
    recurring: list(p.recurring).map((r) => ({ ...item(r), every: r.every ?? 1, start: r.start, end: r.end ?? null })),
    oneOffs: list(p.oneOffs).map((o) => ({ ...item(o), month: o.month })),
    adjustments: isObj(p.adjustments) ? p.adjustments : {},
    closed: isObj(p.closed) ? p.closed : {},
    carry: Array.isArray(p.carry) ? p.carry : [],
    accounts: list(p.accounts).map((a) => ({ id: a.id, name: a.name, currency: a.currency ?? 'SEK', balances: isObj(a.balances) ? a.balances : {}, feeds: Array.isArray(a.feeds) ? a.feeds : [], hidden: a.hidden === true, goal: a.goal })),
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
// Hemvaluta (2026-11-15). Kurser är öre per enhet (SEK = 100). Belopp i hemvalutan; sparkonton har egen valuta.
const rateOf = (d, c) => (c === 'SEK' ? 100 : d.settings.rates[c]);
const convert = (d, v, from, to) => (from === to ? v : Math.round((v * rateOf(d, from)) / rateOf(d, to)));
// Byter hemvaluta och räknar om alla budgetbelopp (poster, avvikelser, justeringar, startsaldo, papperskorg) med kurserna.
// Belopp som blir för stora begränsas till MAX_AMOUNT. Sparkonton ändras inte. Returnerar ny, validerad data.
// Flytta alla månader n steg (2026-11-18): när lönedag slås på/av byter budgetmånaderna namn ("November" = 25 okt–24 nov
// har nyckeln 2026-10). Flyttas datan med behåller posterna sina månadsnamn. Muterar d.
function shiftMonths(d, n) {
  const sh = (m) => (isMonth(m) ? addMonths(m, n) : m);
  const keys = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [sh(k), v]));
  for (const r of d.recurring) { r.start = sh(r.start); if (r.end) r.end = sh(r.end); }
  for (const o of d.oneOffs) o.month = sh(o.month);
  d.adjustments = keys(d.adjustments);
  d.closed = keys(d.closed);
  d.carry = (d.carry || []).map(sh);
  for (const a of d.accounts) a.balances = keys(a.balances);
  if (d.settings.startMonth) d.settings.startMonth = sh(d.settings.startMonth);
}
function changeHome(d, to) {
  if (!CURRENCIES.includes(to) || d.settings.home === to) return d;
  const from = d.settings.home, c = (v) => Math.max(-MAX_AMOUNT, Math.min(MAX_AMOUNT, convert(d, v, from, to)));
  const x = JSON.parse(JSON.stringify(d));
  x.settings.home = to;
  x.settings.startBalance = c(x.settings.startBalance);
  for (const r of x.recurring) r.amount = c(r.amount);
  for (const o of x.oneOffs) o.amount = c(o.amount);
  for (const m of Object.values(x.adjustments)) for (const k of Object.keys(m)) m[k] = c(m[k]);
  for (const k of Object.keys(x.closed || {})) x.closed[k] = c(x.closed[k]);
  for (const t of x.trash) { if (t.rec) t.rec.amount = c(t.rec.amount); if (t.one) t.one.amount = c(t.one.amount); if (t.adj) for (const k of Object.keys(t.adj)) t.adj[k] = c(t.adj[k]); }
  return loadData(x);
}

function monthIndex(m) { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1); }
function addMonths(m, n) {
  const i = monthIndex(m) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
function currentMonth() {
  const d = new Date();
  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  let pay = 1;
  try { if (data?.settings?.payday > 1) pay = data.settings.payday; } catch { /* data finns inte än (start, tester) */ }
  if (pay === 1) return m;
  // 2026-11-18: lönedag på lördag/söndag → lönen kommer fredagen före, och då börjar också den nya månaden. Bara datumräkning, inget nät.
  const payDate = (k) => { const [y, mo] = k.split('-').map(Number), x = new Date(y, mo - 1, pay); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() - 1); return x; };
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day >= payDate(addMonths(m, 1))) return addMonths(m, 1);
  return day < payDate(m) ? addMonths(m, -1) : m;   // före lönedagen hör dagen till förra lönemånaden
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
    rows.push({ id: r.id, kind: 'rec', name: r.name, type: r.type, category: r.category, person: r.person, src: r.src || null,
      amount: adjusted ? adj[r.id] : r.amount, base: r.amount, adjusted });
  }
  for (const o of data.oneOffs) {
    if (o.month !== m) continue;
    rows.push({ id: o.id, kind: 'one', name: o.name, type: o.type, category: o.category, person: o.person, src: o.src || null,
      amount: o.amount, base: o.amount, adjusted: false });
  }
  const c = rows.some((r) => r.kind === 'one' && r.name === 'Kvar från förra månaden') ? 0 : carryIn(data, m);   // ifyllt för hand går före
  if (c) rows.push({ id: 'carry', kind: 'carry', name: 'Kvar från förra månaden', type: c > 0 ? 'income' : 'expense', category: c > 0 ? 'income-other' : 'other',
    person: null, src: null, amount: Math.abs(c), base: Math.abs(c), adjusted: false });
  return rows;
}
// Kvar från förra månaden (2026-11-21): stängt belopp i m−1 om det följer med (data.carry), annars 0. Negativt = underskott.
function carryIn(data, m) {
  const p = addMonths(m, -1);
  return (data.carry || []).includes(p) ? data.closed[p] || 0 : 0;
}

// savings = the part of expense in the "Sparande" category (still counted as expense: it leaves the account).
// pre = sparande före lönen, extra = sparande utöver lönen: båda räknas som sparat men lämnar aldrig lönekontot,
// så de minskar inte Kvar. Sparande från lönen är en vanlig kostnad.
function totals(rows) {
  let income = 0, expense = 0, savings = 0, pre = 0, extra = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount;
    else { expense += r.amount; if (r.category === SAVINGS_CAT) { savings += r.amount; if (r.src === 'pre') pre += r.amount; if (r.src === 'extra') extra += r.amount; } }
  }
  return { income, expense, savings, pre, extra, left: income - expense + pre + extra };
}

// Månadens summor; är månaden stängd ersätts planerat kvar av det faktiska (planned = det planerade, closed = true).
function monthTotals(d, m) {
  const t = totals(rowsForMonth(d, m));
  return d.closed && Object.hasOwn(d.closed, m) ? { ...t, planned: t.left, left: d.closed[m], closed: true } : t;
}

// Running balance at the end of month m (null when no start month is set or m is before it).
function balanceAfter(data, m) {
  const start = data.settings.startMonth;
  if (!start || m < start) return null;
  let bal = data.settings.startBalance;
  for (let x = start; x <= m; x = addMonths(x, 1)) bal += monthTotals(data, x).left - (x > start ? carryIn(data, x) : 0);   // det som följer med finns redan i saldot
  return bal;
}

// Prognos (2026-11-21): ungefär vad månaden stängs på. Rörligt = planerat kvar − faktiskt kvar i stängda månader.
// Bas = snittet av de 3 senaste stängda månaderna före m. Säsong: är samma månad förra året stängd, och snittet av de
// 3 stängda månaderna före den är minst 1 000 kr, multipliceras basen med kvoten (begränsad till 0,5–3).
// Ingen ny data – allt räknas ur data.closed. null när ingen månad före m är stängd eller m själv är stängd.
const FC_MONTHS = 3, FC_MIN_BASE = 100000, FC_MIN = 0.5, FC_MAX = 3;
function variableAt(d, m) { const t = monthTotals(d, m); return t.planned - t.left; }
function variableAvg(d, m) {   // snitt av upp till 3 stängda månader före m, eller null
  const ms = Object.keys(d.closed || {}).filter((x) => x < m).sort().slice(-FC_MONTHS);
  return ms.length ? Math.round(ms.reduce((a, x) => a + variableAt(d, x), 0) / ms.length) : null;
}
function forecast(d, m) {
  if (d.closed && Object.hasOwn(d.closed, m)) return null;
  const base = variableAvg(d, m);
  if (base == null) return null;
  let factor = 1;
  const ly = addMonths(m, -12), lyBase = Object.hasOwn(d.closed, ly) ? variableAvg(d, ly) : null;
  if (lyBase != null && lyBase >= FC_MIN_BASE) factor = Math.min(FC_MAX, Math.max(FC_MIN, variableAt(d, ly) / lyBase));
  const variable = Math.round(base * factor);
  return { left: Math.round((monthTotals(d, m).left - variable) / 100) * 100, variable: Math.round(variable / 100) * 100, base, factor };   // hela kronor – det är en uppskattning
}

// Savings account balance at month m: the latest entered balance up to and including m.
// Returns { amount, month } or null; prevBalance gives the one before that.
function balanceAt(acc, m) {
  const ms = Object.keys(acc.balances).filter((x) => x <= m).sort();
  return ms.length ? { month: ms[ms.length - 1], amount: acc.balances[ms[ms.length - 1]] } : null;
}
// Beräknat saldo (2026-11-17): senast ifyllda saldo + de kopplade sparposternas belopp för varje månad efter det
// (med månadens justeringar), omräknat till kontots valuta. estimated = inte ifyllt den månaden.
function estBalance(d, acc, m) {
  const cur = balanceAt(acc, m);
  if (!cur) return null;
  const feeds = acc.feeds || [];
  if (!feeds.length || cur.month === m) return { ...cur, estimated: false };
  // 2026-11-17: konto i annan valuta räknas också upp – sparandet (i hemvalutan) räknas om med kurserna.
  const homeCur = d.settings.home || 'SEK';
  let amount = cur.amount, n = 0;
  for (let x = addMonths(cur.month, 1); x <= m && n < 600; x = addMonths(x, 1), n++) {
    for (const r of rowsForMonth(d, x)) if (feeds.includes(r.id)) amount += convert(d, r.amount, homeCur, acc.currency);
  }
  return { month: m, amount, estimated: amount !== cur.amount, from: cur.month };
}
// Sparmål (2026-11-21): hur långt kontot har kommit i månad m. eta = månaden målet nås i nuvarande takt (kopplade
// sparposter i m), need = belopp per månad som behövs för att hinna till goal.month (bara med datum, månader kvar > 0).
function goalStatus(d, acc, m) {
  if (!acc.goal) return null;
  const goal = acc.goal.amount, cur = estBalance(d, acc, m)?.amount ?? 0, left = goal - cur;
  const pct = Math.max(0, Math.min(100, Math.floor((cur / goal) * 100)));
  if (left <= 0) return { goal, cur, pct: 100, reached: true };
  const homeCur = d.settings.home || 'SEK', feeds = acc.feeds || [];
  const rate = rowsForMonth(d, m).filter((r) => feeds.includes(r.id)).reduce((x, r) => x + convert(d, r.amount, homeCur, acc.currency), 0);
  const eta = rate > 0 ? addMonths(m, Math.ceil(left / rate)) : null;
  const target = acc.goal.month || null;
  let n = 0;
  if (target) for (let x = m; x < target && n < 600; x = addMonths(x, 1)) n++;
  const need = target && n > 0 ? Math.ceil(left / n / 100) * 100 : null;
  return { goal, cur, pct, reached: false, eta, target, need, rate };
}
function prevBalance(acc, m) {
  const cur = balanceAt(acc, m);
  return cur ? balanceAt(acc, addMonths(cur.month, -1)) : null;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
