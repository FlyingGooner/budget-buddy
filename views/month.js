// Budget buddy – Månad + raddialogen. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
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
function setMonth(m) { month = m; renderMonth(); renderStats(); }
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
