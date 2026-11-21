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
  T.eq(t, { income: 3200000, expense: 250000 + 400000 + 95000, savings: 400000, pre: 0, left: 3200000 - 745000 });
  { const d = loadData({ recurring: [{ id: 'p1', name: 'Aktier', type: 'expense', amount: 100000, category: 'savings', every: 1, start: '2026-01', pre: true }] });
    T.eq(totals(rowsForMonth(d, '2026-03')).left, 0); }
  { const d = loadData({ oneOffs: [{ id: 'p2', month: '2026-03', name: 'Aktier', type: 'expense', amount: 50000, category: 'savings', pre: true }] });
    T.eq(totals(rowsForMonth(d, '2026-03')).left, 0); }
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

// ---- Papperskorg ----
T.test('papperskorg: post med avvikelser tas bort och återställs med dem', () => {
  const d = loadData(rich());
  trashItems(d, 'rec', ['r2'], '2026-11-14');
  T.eq(d.recurring.map((r) => r.id), ['r1', 'r3']);
  T.eq(d.adjustments, {});
  T.eq(d.trash.length, 1); T.eq(d.trash[0].adj, { '2026-11': 250000 });
  const back = loadData(JSON.parse(JSON.stringify(d)));
  T.eq(back.trash, d.trash, 'papperskorgen sparas och läses in igen');
  const r = restoreItem(back, 0);
  T.eq(r.id, 'r2'); T.eq(back.trash, []); T.eq(back.adjustments, { '2026-11': { r2: 250000 } });
});
T.test('papperskorg: engångspost och sparkonto', () => {
  const d = loadData(rich());
  trashItems(d, 'one', ['o1'], '2026-11-14'); trashItems(d, 'acc', ['a1'], '2026-11-14');
  T.eq(d.oneOffs, []); T.eq(d.accounts.map((a) => a.id), ['a2']);
  T.eq(restoreItem(d, 1).id, 'a1'); T.eq(restoreItem(d, 0).id, 'o1'); T.eq(d.trash, []);
});
T.test('papperskorg: upptaget id får ett nytt, fullt ger fel', () => {
  const d = loadData(rich());
  trashItems(d, 'rec', ['r1'], '2026-11-14');
  d.recurring.push({ ...d.trash[0].rec });
  const r = restoreItem(d, 0);
  T.ok(r.id !== 'r1'); T.eq(d.recurring.filter((x) => x.name === 'Lön').length, 2);
  const f = loadData(rich());
  trashItems(f, 'acc', ['a1'], '2026-11-14');
  for (let i = 0; f.accounts.length < MAX_ACCOUNTS; i++) f.accounts.push({ id: 'x' + i, name: 'x', currency: 'SEK', balances: {} });
  T.ok(restoreItem(f, 0).error); T.eq(f.trash.length, 1);
});
T.test('papperskorg: rensas efter 30 dagar, skräp släpps', () => {
  const d = loadData(rich());
  trashItems(d, 'one', ['o1'], '2026-10-14'); trashItems(d, 'acc', ['a1'], '2026-10-16');
  T.eq(purgeTrash(d, '2026-11-14'), 1); T.eq(d.trash.length, 1);
  const bad = loadData({ ...rich(), trash: [null, { d: 'x', one: {} }, { d: '2026-11-01', rec: { id: 'bad id!' } }, { d: '2026-11-01' }] });
  T.eq(bad.trash, []);
});
T.test('papperskorg: följer inte med i exporten', () => {
  const d = loadData(rich()); trashItems(d, 'one', ['o1'], '2026-11-14');
  T.eq(importText(exportText(d, '2026-11-14')).data.trash, []);
});

T.test('sortering: poster, riktning och validering', () => {
  T.eq(loadData({ settings: { sort: 'n+' } }).settings.sort, 'n+');
  T.eq(loadData({ settings: { sort: 'z+' } }).settings.sort, 'a-');
  const d = loadData(rich()), name = (id) => catName2(d, id);
  function catName2(dd, id) { return dd.settings.categories.find((c) => c.id === id).name; }
  T.eq(sortItems(d.recurring, 'a-', name).map((r) => r.id), ['r1', 'r3', 'r2']);
  T.eq(sortItems(d.recurring, 'n+', name).map((r) => r.id), ['r2', 'r1', 'r3']);
  T.eq(sortItems(d.recurring, 's+', name).map((r) => r.id), ['r1', 'r3', 'r2']);
  T.eq(nextSort('a-', 'a'), 'a+'); T.eq(nextSort('a-', 'n'), 'n+'); T.eq(nextSort('n+', 'a'), 'a-');
  T.eq(importText(exportText(loadData({ ...rich(), settings: { ...rich().settings, sort: 'n+' } }), '2026-11-14')).data.settings.sort, 'a-', 'inte i exporten');
});
T.test('hemvaluta: changeHome räknar om budgetbelopp, inte sparkonton; följer med i exporten', () => {
  const d = loadData(rich());
  T.eq(d.settings.home, 'SEK');
  const e = changeHome(d, 'EUR');
  T.eq(e.settings.home, 'EUR');
  T.eq(e.settings.startBalance, Math.round(1500000 * 100 / 1100));
  d.recurring.forEach((r, i) => T.eq(e.recurring[i].amount, Math.round(r.amount * 100 / 1100)));
  T.eq(JSON.stringify(e.accounts), JSON.stringify(d.accounts), 'sparkonton oförändrade');
  T.eq(changeHome(e, 'SEK').settings.home, 'SEK');
  T.eq(importText(exportText(e, '2026-11-15')).data.settings.home, 'EUR');
  T.eq(loadData({ settings: { home: 'XYZ' } }).settings.home, 'SEK', 'okänd valuta → SEK');
});
T.test('sparkonto: kopplad sparpost räknar upp saldot varje månad och följer med i exporten', () => {
  const d = loadData({ recurring: [{ id: 's1', name: 'ISK', type: 'expense', amount: 300000, category: 'savings', start: '2026-01' }],
    accounts: [{ id: 'a1', name: 'Buffert', balances: { '2026-09': 1000000 }, feeds: ['s1', 'nope'] }] });
  T.eq(d.accounts[0].feeds, ['s1'], 'okända id tas bort');
  T.eq(estBalance(d, d.accounts[0], '2026-09').amount, 1000000);
  T.eq(estBalance(d, d.accounts[0], '2026-11').amount, 1600000);
  T.eq(estBalance(d, d.accounts[0], '2026-11').estimated, true);
  T.eq(estBalance(d, d.accounts[0], '2026-08'), null);
  T.eq(importText(exportText(d, '2026-11-17')).data.accounts[0].feeds, ['s1']);
});
T.test('lönedag: valideras och följer med i exporten', () => {
  T.eq(loadData({}).settings.payday, 1);
  T.eq(loadData({ settings: { payday: 25 } }).settings.payday, 25);
  T.eq(loadData({ settings: { payday: 31 } }).settings.payday, 1, 'över 28 → 1');
  T.eq(importText(exportText(loadData({ settings: { payday: 25 } }), '2026-11-17')).data.settings.payday, 25);
});
T.test('stängd månad: faktiskt kvar ersätter planerat, valideras och följer med', () => {
  const d = loadData({ settings: { startBalance: 0, startMonth: '2026-10' },
    recurring: [{ id: 'i1', name: 'Lön', type: 'income', amount: 3000000, category: 'salary', start: '2026-01' },
      { id: 'e1', name: 'Hyra', type: 'expense', amount: 1000000, category: 'home', start: '2026-01' }],
    closed: { '2026-10': 500000, 'bad': 1, '2026-09': 'x' } });
  T.eq(Object.keys(d.closed), ['2026-10']);
  const t = monthTotals(d, '2026-10');
  T.eq([t.left, t.planned, t.closed], [500000, 2000000, true]);
  T.eq(monthTotals(d, '2026-11').left, 2000000);
  T.eq(balanceAfter(d, '2026-11'), 2500000);
  T.eq(importText(exportText(d, '2026-11-17')).data.closed, { '2026-10': 500000 });
});
T.test('sparkonto i annan valuta räknas upp med omräknat sparande', () => {
  const d = loadData({ recurring: [{ id: 's1', name: 'ISK', type: 'expense', amount: 111100, category: 'savings', start: '2026-01' }],
    accounts: [{ id: 'a1', name: 'Euro', currency: 'EUR', balances: { '2026-10': 100000 }, feeds: ['s1'] }] });
  const e = estBalance(d, d.accounts[0], '2026-11');
  T.eq(e.amount, 100000 + Math.round(111100 * 100 / d.settings.rates.EUR));
});
T.test('sparkonto: dold i Månad följer med i exporten', () => {
  const d = loadData({ accounts: [{ id: 'a1', name: 'Barnen', balances: {}, hidden: true }, { id: 'a2', name: 'B', balances: {}, hidden: 'ja' }] });
  T.eq(d.accounts.map((a) => a.hidden), [true, false]);
  T.eq(importText(exportText(d, '2026-11-17')).data.accounts.map((a) => a.hidden), [true, false]);
});

T.test('shiftMonths: lönedag på flyttar alla månader ett steg bakåt (2026-11-18)', () => {
  const d = loadData({ recurring: [{ id: 'r1abcdef', name: 'Hyra', type: 'expense', amount: 100, category: 'housing', every: 1, start: '2026-11', end: '2027-02' }],
    oneOffs: [{ id: 'o1abcdef', month: '2026-12', name: 'Resa', type: 'expense', amount: 5, category: 'other' }],
    adjustments: { '2026-12': { r1abcdef: 50 } }, closed: { '2026-11': 7 } });
  shiftMonths(d, -1);
  T.eq([d.recurring[0].start, d.recurring[0].end, d.oneOffs[0].month, Object.keys(d.adjustments)[0], Object.keys(d.closed)[0]], ['2026-10', '2027-01', '2026-11', '2026-11', '2026-10']);
});

T.test('forecast: rullande snitt och säsong i procent', () => {
  const d = loadData(rich());   // planerat kvar 2026: 3 200 000 − 400 000 − (240 000 vissa månader)
  T.eq(forecast(d, '2026-03'), null);                         // inga stängda månader
  d.closed = { '2026-01': 2500000, '2026-03': 2400000 };      // rörligt 300 000 resp. 400 000
  T.eq(forecast(d, '2026-03'), null);                         // stängd själv
  const f = forecast(d, '2026-04');
  T.eq([f.base, f.factor, f.variable, f.left], [350000, 1, 350000, 2800000 - 350000]);
  // samma månad året efter: april 2026 rörligt 700 000 mot snitt 350 000 → ×2
  d.closed['2026-04'] = 2800000 - 700000;
  const g = forecast(d, '2027-04');
  T.eq([g.base, g.factor], [Math.round((300000 + 400000 + 700000) / 3), 2]);
  d.closed['2026-04'] = 2800000 - 3000000;                    // ×8,6 → taket 3
  T.eq(forecast(d, '2027-04').factor, 3);
  d.closed = { '2026-03': 3200000, '2026-04': 2800000 - 500000 };   // snitt före april = −400 000 < 1 000 kr → ingen säsong
  T.eq(forecast(d, '2027-04').factor, 1);
});

T.test('sparmål: valfritt, valideras och följer med i exporten', () => {
  const d = rich();
  T.eq('goal' in loadData(d).accounts[0], false);                       // inget mål → inget fält
  d.accounts[0].goal = { amount: 6000000, month: '2027-02' }; d.accounts[1].goal = { amount: -5 };
  const x = loadData(d);
  T.eq(x.accounts[0].goal, { amount: 6000000, month: '2027-02' }); T.eq('goal' in x.accounts[1], false);
  T.eq(loadData(unpackData(packData(x))).accounts[0].goal, x.accounts[0].goal);
  x.accounts[0].goal = { amount: 6000000, month: 'nej' };
  T.eq(loadData(x).accounts[0].goal, { amount: 6000000 });
});
T.test('sparmål: andel, takt och behov', () => {
  const d = loadData(rich());
  d.accounts[0].feeds = ['r3']; d.accounts[0].goal = { amount: 6000000, month: '2027-01' };   // 50 000 kr i nov, +4 000/mån
  const g = goalStatus(d, d.accounts[0], '2026-11');
  T.eq([g.pct, g.reached, g.eta, g.need], [83, false, '2027-02', 500000]);   // 10 000 kvar: 3 mån i takt, 2 mån till jan
  d.accounts[0].goal = { amount: 5000000 };
  T.eq(goalStatus(d, d.accounts[0], '2026-11').reached, true);
  T.eq(goalStatus(d, d.accounts[1], '2026-11'), null);
});

T.test('kvar följer med: rad i nästa månad, exporteras, saldot räknas inte dubbelt', () => {
  const d = loadData({ ...rich(), closed: { '2026-10': 300000, '2026-11': 400000 }, carry: ['2026-10', '2026-09', 'x'] });
  T.eq(d.carry, ['2026-10']);
  const c = rowsForMonth(d, '2026-11').find((r) => r.kind === 'carry');
  T.eq([c.type, c.amount, c.name], ['income', 300000, 'Kvar från förra månaden']);
  T.ok(!rowsForMonth(d, '2026-12').some((r) => r.kind === 'carry'), 'november följer inte med');
  T.eq(importText(exportText(d, '2026-11-21')).data.carry, ['2026-10']);
  const without = loadData({ ...d, carry: [] });
  T.eq(balanceAfter(without, '2026-11') - balanceAfter(d, '2026-11'), 300000);   // oktobers kvar finns redan i novembers stängda saldo
  const neg = loadData({ ...rich(), closed: { '2026-10': -50000 }, carry: ['2026-10'] });
  const n = rowsForMonth(neg, '2026-11').find((r) => r.kind === 'carry');
  T.eq([n.type, n.amount], ['expense', 50000]);
  T.eq(loadData({ ...d, closed: {} }).carry, []);
});

T.test('kvar ifyllt för hand går före det som följer med', () => {
  const d = loadData({ ...rich(), closed: { '2026-10': 300000 }, carry: ['2026-10'],
    oneOffs: [{ id: 'oc', month: '2026-11', name: 'Kvar från förra månaden', type: 'income', amount: 120000, category: 'income-other', person: null }] });
  const rs = rowsForMonth(d, '2026-11').filter((r) => r.name === 'Kvar från förra månaden');
  T.eq(rs.map((r) => [r.kind, r.amount]), [['one', 120000]]);
});
