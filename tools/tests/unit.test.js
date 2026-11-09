// Unit tests for store.js (loaded as a classic script before this file). Run: tools\test.ps1 budget-buddy
const rich = () => ({
  version: 1,
  settings: { categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), people: [{ id: 'p1', name: 'Anna' }], startBalance: 1500000, startMonth: '2026-01',
    catsV: CATS_V, rates: { USD: 1000, EUR: 1100, GBP: 1300, NOK: 100, DKK: 150 }, ratesDate: '2026-11-01', ratesOwn: true },
  recurring: [
    { id: 'r1', name: 'Lön', type: 'income', amount: 3200000, category: 'salary', person: 'p1', every: 1, start: '2026-01', end: null },
    { id: 'r2', name: 'Försäkring', type: 'expense', amount: 240000, category: 'other', person: null, every: 3, start: '2026-02', end: '2026-12' },
    { id: 'r3', name: 'Spar', type: 'expense', amount: 400000, category: 'savings', person: null, every: 1, start: '2026-01', end: null },
  ],
  oneOffs: [{ id: 'o1', month: '2026-11', name: 'Tandläkare', type: 'expense', amount: 95000, category: 'other', person: null }],
  adjustments: { '2026-11': { r2: 250000 } },
  accounts: [{ id: 'a1', name: 'Buffert', currency: 'SEK', balances: { '2026-10': 4500000, '2026-11': 5000000 } },
    { id: 'a2', name: 'Aktier', currency: 'USD', balances: {} }],
});

// ---- loadData: saved data is untrusted ----
T.test('loadData: skräp ger tom standarddata', () => {
  for (const bad of [null, 42, 'x', [], { settings: 'x', recurring: 'x' }]) T.eq(loadData(bad), emptyData());
});
T.test('loadData: giltig data behålls oförändrad', () => { const d = loadData(rich()); T.eq(loadData(JSON.parse(JSON.stringify(d))), d); });
T.test('loadData: ogiltiga poster släpps (belopp, id, typ, månad)', () => {
  const d = rich();
  d.recurring.push({ id: 'bad id!', name: 'x', type: 'expense', amount: 1, category: 'other', every: 1, start: '2026-01' },
    { id: 'neg', name: 'x', type: 'expense', amount: -5, category: 'other', every: 1, start: '2026-01' },
    { id: 'typ', name: 'x', type: 'hack', amount: 5, category: 'other', every: 1, start: '2026-01' },
    { id: 'mon', name: 'x', type: 'expense', amount: 5, category: 'other', every: 1, start: '2026-13' },
    { id: '__proto__', name: 'x', type: 'expense', amount: 5, category: 'other', every: 1, start: '2026-01' });
  T.eq(loadData(d).recurring.map((r) => r.id), ['r1', 'r2', 'r3']);
});
T.test('loadData: okänd valuta blir SEK, egna kurser bara med ratesOwn', () => {
  const d = rich(); d.accounts[0].currency = 'BTC'; d.settings.ratesOwn = false;
  const l = loadData(d);
  T.eq(l.accounts[0].currency, 'SEK');
  T.eq(l.settings.rates, DEFAULT_RATES);
  T.eq(loadData(rich()).settings.rates.USD, 1000);
});
T.test('loadData: max antal sparkonton', () => {
  const d = rich(); d.accounts = Array.from({ length: 30 }, (_, i) => ({ id: 'a' + i, name: 'K' + i, balances: {} }));
  T.eq(loadData(d).accounts.length, MAX_ACCOUNTS);
});

// ---- Month maths ----
T.test('addMonths över årsskifte', () => { T.eq(addMonths('2026-12', 1), '2027-01'); T.eq(addMonths('2026-01', -1), '2025-12'); });
T.test('applies: varje kvartal och slutmånad', () => {
  const r = loadData(rich()).recurring[1];
  T.eq(['2026-02', '2026-03', '2026-05', '2026-11', '2027-02'].map((m) => applies(r, m)), [true, false, true, true, false]);
});
T.test('rowsForMonth + totals: avvikelse, engångspost och sparande', () => {
  const t = totals(rowsForMonth(loadData(rich()), '2026-11'));
  T.eq(t, { income: 3200000, expense: 250000 + 400000 + 95000, savings: 400000, left: 3200000 - 745000 });
});
T.test('balanceAfter: startsaldo + kvar per månad', () => {
  const d = loadData(rich());
  T.eq(balanceAfter(d, '2025-12'), null);
  T.eq(balanceAfter(d, '2026-01'), 1500000 + 3200000 - 400000);
});
T.test('balanceAt/prevBalance för sparkonto', () => {
  const a = loadData(rich()).accounts[0];
  T.eq(balanceAt(a, '2026-12'), { month: '2026-11', amount: 5000000 });
  T.eq(prevBalance(a, '2026-11'), { month: '2026-10', amount: 4500000 });
  T.eq(balanceAt(a, '2026-09'), null);
});

// ---- Export/import (U5) ----
T.test('export → import ger identisk data', () => {
  const d = loadData(rich());
  const r = importText(exportText(d, '2026-11-09'));
  T.eq(r.data, d);
  T.eq(r.counts, { recurring: 3, oneOffs: 1, accounts: 2 });
  T.eq(r.skipped, 0);
});
T.test('export är smal (nivå 1)', () => {
  const txt = exportText(loadData(rich()), '2026-11-09');
  T.ok(!/"every":\s*1,|"person":\s*null|"currency":\s*"SEK"|"catsV"|"end":\s*null/.test(txt), 'standardvärden i exporten');
  T.ok(/"type":\s*"i"/.test(txt), 'typ ska vara kodad');
  T.eq(JSON.parse(txt).app, 'budget-buddy');
});
T.test('export av tom data går att importera', () => { T.eq(importText(exportText(emptyData(), '2026-11-09')).data, emptyData()); });
T.test('import avvisar fel app, trasig JSON, tom text, för stor text, okänt format', () => {
  T.ok(importText(JSON.stringify({ app: 'follow-diet-tracker', format: 1, data: {} })).error);
  T.ok(importText('{"app":"budget-buddy"').error);
  T.ok(importText('   ').error);
  T.ok(/för lång/.test(importText('{"app":"budget-buddy","format":1,"data":{}}' + ' '.repeat(2000001)).error), 'storleksgränsen');
  T.ok(importText(JSON.stringify({ app: 'budget-buddy', format: 2, data: {} })).error);
  T.ok(importText(JSON.stringify({ app: 'budget-buddy', format: 1 })).error);
});
T.test('import av konstruerad text: bara giltiga poster, ingen förorening', () => {
  const r = importText(JSON.stringify({ app: 'budget-buddy', format: 1, data: {
    recurring: [{ id: '__proto__', name: 'x', type: 'e', amount: 1, category: 'other', start: '2026-01' },
      { id: 'ok', name: '<img src=x onerror=alert(1)>', type: 'e', amount: 100, category: 'other', start: '2026-01' },
      { id: 'neg', name: 'x', type: 'e', amount: -1, category: 'other', start: '2026-01' }],
    adjustments: { '__proto__': { ok: 5 } }, accounts: [{ id: 'a', name: 'x', currency: 'XXX' }] } }));
  T.eq(r.data.recurring.map((x) => x.id), ['ok']);
  T.eq(r.data.recurring[0].name, '<img src=x onerror=alert(1)>');
  T.eq(r.skipped, 2);
  T.eq(r.data.accounts[0].currency, 'SEK');
  T.eq(({}).ok, undefined);
});
T.test('styr- och riktningstecken tas bort ur namn', () => {
  const d = loadData({ settings: { people: [{ id: 'p1', name: 'A‮na\u0007' }] }, accounts: [] });
  T.eq(d.settings.people[0].name, 'Ana');
});
T.test('export är kompakt (en rad) och gammal indragen export går att importera', () => {
  const txt = exportText(emptyData(), '2026-11-09');
  T.ok(!txt.includes('\n'), 'exporten har radbrytningar');
  T.eq(importText(JSON.stringify(JSON.parse(txt), null, 1)).data, emptyData());
});
T.test('exportdatum visas bara om det är ett datum', () => {
  const env = (e) => JSON.stringify({ app: 'budget-buddy', format: 1, exported: e, data: {} });
  T.eq(importText(env('2026-11-09')).exported, '2026-11-09');
  T.eq(importText(env('2026‮-11-0')).exported, '');
});
