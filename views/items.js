// Budget buddy – Poster (återkommande). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
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
