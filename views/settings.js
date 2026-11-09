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
  $('s-month').value = data.settings.startMonth || '';
  for (const c of Object.keys(DEFAULT_RATES)) $('rate-' + c).value = nf2.format(data.settings.rates[c] / 100);
  $('rates-note').textContent = ratesNote() + '.';
  $('rates-reset').hidden = !data.settings.ratesOwn;
}
// Exchange rates: typed in by the user (kr per 1 unit) – the app never fetches rates.
$('rates-save').addEventListener('click', () => {
  const rates = {};
  for (const c of Object.keys(DEFAULT_RATES)) {
    const ore = parseKr($('rate-' + c).value);
    if (ore == null || ore <= 0 || ore > MAX_RATE) { snackbar(`Skriv en kurs för ${c}, t.ex. 9,88.`, null, null, 4000); return; }
    rates[c] = ore;
  }
  const t = new Date();
  data.settings.rates = rates;
  data.settings.ratesDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  data.settings.ratesOwn = true;
  save();
  snackbar('Kurserna sparade', null, null, 3000);
});
$('rates-reset').addEventListener('click', () => {
  data.settings.rates = { ...DEFAULT_RATES };
  data.settings.ratesDate = RATES_DATE;
  data.settings.ratesOwn = false;
  save();
  snackbar('Appens kurser används igen', null, null, 3000);
});
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
