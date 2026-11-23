// Budget buddy – Inställningar. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
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
  { // 2026-11-17: månadsväljare med appens månadsnamn (lönedag ger t.ex. "December 2026") – 3 år bakåt, 1 år framåt
    const now = currentMonth(), sm = data.settings.startMonth;
    const ms = Array.from({ length: 49 }, (_, i) => addMonths(now, 12 - i));
    if (sm && !ms.includes(sm)) ms.push(sm);
    $('s-month').replaceChildren(el('option', { value: '', text: '–' }), ...ms.sort().reverse().map((m) => el('option', { value: m, text: monthLabel(m) })));
    $('s-month').value = sm || '';
  }
  $('s-lang').value = I18N.lang();
  $('s-home').value = home();
  for (const c of Object.keys(DEFAULT_RATES)) $('rate-' + c).value = nf2.format(data.settings.rates[c] / 100);
  $('rates-note').textContent = ratesNote() + '.';
  $('rates-reset').hidden = !data.settings.ratesOwn;
  renderTrash();
  // Sammanfattning på varje hopfälld rad
  const n = (t) => data.settings.categories.filter((c) => c.type === t).length;
  $('sum-income').textContent = `${n('income')} st`;
  $('sum-expense').textContent = `${n('expense')} st`;
  $('sum-people').textContent = data.settings.people.length ? data.settings.people.map((p) => p.name).join(', ') : 'Inga';
  $('sum-start').textContent = data.settings.startMonth ? `${kr(data.settings.startBalance)} från ${data.settings.startMonth}` : 'Inget';
  $('set-foot').textContent = `Budget buddy v${self.APP_VERSION} · inga externa anrop · data bara på enheten`;
  // Grupprader visar läget, som i Fitness buddy.
  const nCat = data.settings.categories.length, ppl = data.settings.people.length;
  $('g-household').textContent = `${ppl ? (ppl === 1 ? '1 person' : `${ppl} personer`) : 'Inga personer'} · ${nCat} kategorier`;
  $('g-currency').textContent = `${home()} · ${data.settings.ratesOwn ? 'egna kurser' : 'appens kurser'}`;
  $('g-general').textContent = 'Språk, data, hjälp';
  $('s-payday').value = String(data.settings.payday);
  $('sum-payday').textContent = data.settings.payday > 1 ? `Den ${data.settings.payday}:e` : 'Den 1:a (kalendermånad)';
  $('sum-lang').textContent = I18N.LANGS[I18N.lang()] || '';
  $('sum-home').textContent = home();
  $('sum-rates').textContent = data.settings.ratesOwn ? 'Egna' : 'Appens';
}
// Papperskorg: newest first. Återställ puts the item back (with its month adjustments); Töm has Ångra.
function renderTrash() {
  const list = data.trash.map((e, i) => [e, i]).reverse();
  $('trash-empty').hidden = !list.length;
  $('sum-trash').textContent = list.length ? `${list.length} st` : 'Tom';
  fill($('trash-list'), list.length ? list.map(([e, i]) => {
    const x = e.rec || e.one || e.acc;
    const what = e.rec ? (e.rec.type === 'income' ? 'Inkomst' : 'Kostnad') : e.one ? `Avvikelse ${monthShortLabel(e.one.month).toLowerCase()} ${e.one.month.slice(0, 4)}` : 'Sparkonto';
    return el('li', { class: 'row' },
      el('span', { class: 'row-name' }, el('span', { text: x.name }), el('span', { class: 'row-sub', text: `${what} · borttagen ${dayLabel(e.d)}` })),
      el('button', { type: 'button', class: 'btn text', 'aria-label': `Återställ ${x.name}`, text: 'Återställ', on: { click: () => restoreTrash(i) } }));
  }) : el('li', { class: 'muted empty-row', text: 'Papperskorgen är tom.' }));
}
function restoreTrash(i) {
  const r = restoreItem(data, i);
  if (r.error) { snackbar(r.error, null, null, 4000); return; }
  data = loadData(data);
  save();
  snackbar(`${r.name} är återställd`, null, null, 3000);
}
$('trash-empty').addEventListener('click', () => {
  const n = data.trash.length;
  withUndo(`${n === 1 ? '1 sak' : `${n} saker`} raderades för gott`, () => { data.trash = []; });
});
// Språk och hemvaluta (2026-11-15). Språk laddar om sidan; valuta räknar om alla belopp (changeHome i store.js), med Ångra.
$('s-lang').replaceChildren(...Object.entries(I18N.LANGS).map(([v, l]) => el('option', { value: v, text: l, 'data-no-tr': '' })));
$('s-lang').addEventListener('change', (e) => I18N.setLang(e.target.value));
$('s-home').replaceChildren(...CURRENCIES.map((c) => el('option', { value: c, text: CUR_NAMES[c] })));
$('s-home').addEventListener('change', (e) => {
  const to = e.target.value, from = home();
  if (to === from) return;
  withUndo(`Valutan är nu ${CUR_NAMES[to]} – beloppen är omräknade`, () => { data = changeHome(data, to); });
  render();
});

// Exchange rates: typed in by the user (kr per 1 unit) – the app never fetches rates.
$('rates-save').addEventListener('click', () => {
  const rates = {};
  for (const c of Object.keys(DEFAULT_RATES)) {
    const ore = parseKr($('rate-' + c).value);
    if (ore == null || ore <= 0 || ore > MAX_RATE) { snackbar(`Skriv en kurs för ${c}, t.ex. 9,88.`, null, null, 4000); return; }
    rates[c] = ore;
  }
  const t = new Date();
  withUndo('Kurserna sparade', () => {   // 2026-11-23: Ångra – tidigare kurser skrivs över
    data.settings.rates = rates;
    data.settings.ratesDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    data.settings.ratesOwn = true;
  });
});
$('rates-reset').addEventListener('click', () => withUndo('Appens kurser används igen', () => {   // 2026-11-23: Ångra – egna kurser skrivs över
  data.settings.rates = { ...DEFAULT_RATES };
  data.settings.ratesDate = RATES_DATE;
  data.settings.ratesOwn = false;
}));
document.querySelectorAll('.cat-form').forEach((form) => form.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = cleanName(form.elements.name.value, 40);
  if (!n) return;
  if (data.settings.categories.length >= 60) { snackbar('Max 60 kategorier.', null, null, 3000); return; }
  const type = form.dataset.type === 'income' ? 'income' : 'expense';   // 2026-11-23: inga dubbletter
  if (data.settings.categories.some((c) => c.type === type && c.name.toLocaleLowerCase('sv') === n.toLocaleLowerCase('sv'))) { snackbar(`${n} finns redan`, null, null, 3000); return; }
  data.settings.categories.push({ id: 'c' + newId().slice(-10), name: n, type: form.dataset.type === 'income' ? 'income' : 'expense' });
  data = loadData(data);
  form.elements.name.value = '';
  save();
  snackbar(`${n} lades till`, null, null, 3000);
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
  if (!raw && !m) { withUndo('Startsaldo borttaget', () => { data.settings.startBalance = 0; data.settings.startMonth = null; }); return; }   // 2026-11-23: Ångra
  const neg = raw.startsWith('-') || raw.startsWith('−');
  const ore = parseKr(neg ? raw.slice(1) : raw || '0');
  if (ore == null || !isMonth(m)) { snackbar('Fyll i både saldo och månad.', null, null, 4000); return; }
  data.settings.startBalance = neg ? -ore : ore;
  data.settings.startMonth = m;
  save();
  snackbar('Startsaldo sparat', null, null, 3000);
});

// Lönedag (2026-11-17): budgetmånad från lönedag till dagen före nästa. Byter bara namn och vilken månad som är "nu".
$('s-payday').replaceChildren(...Array.from({ length: 28 }, (_, i) => el('option', { value: String(i + 1), text: i ? `Den ${i + 1}:e (lönedag)` : 'Den 1:a (kalendermånad)' })));
$('s-payday').addEventListener('change', (e) => {
  const was = currentMonth(), split = data.settings.payday > 1, to = Number(e.target.value);
  const msg = to > 1 ? `Budgetmånaden börjar den ${to}:e` : 'Budgetmånaden följer kalendern';
  // 2026-11-18: lönedag på/av – flytta posterna en månad så att "November" fortfarande är november (Ångra finns).
  if (split !== to > 1 && (data.recurring.length || data.oneOffs.length)) {
    withUndo(msg, () => { shiftMonths(data, to > 1 ? -1 : 1); data.settings.payday = to; data = loadData(data); });
  } else { data.settings.payday = to; save(); snackbar(msg, null, null, 3000); }
  if (month === was) month = currentMonth();
  overviewStart = currentMonth();
  render();
});
