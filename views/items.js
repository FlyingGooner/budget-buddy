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
  const on = sel && sel.has(r.id);
  return el('li', { class: 'row' + (ended ? ' ended' : '') + (on ? ' marked' : '') }, el('button', { type: 'button', class: 'row-main', 'data-id': r.id,
    'aria-label': sel ? `${r.name}, ${kr(r.amount)}` : `${r.name}, ${kr(r.amount)}. Ändra`, ...(sel ? { 'aria-pressed': String(on) } : {}),
    on: { click: () => (sel ? toggleSel(r.id) : openItemDialog(r)) } },
  sel ? el('span', { class: 'sel-box', 'aria-hidden': 'true', text: on ? '✓' : '' }) : null,
  el('span', { class: 'row-name' }, el('span', { text: r.name + (ended ? ' (avslutad)' : '') }), el('span', { class: 'row-sub', text: sub })),
  el('span', { class: 'amount', text: kr(r.amount) })));
}

function renderItems() {
  const now = currentMonth();
  if (sel) for (const id of sel) if (!data.recurring.some((r) => r.id === id)) sel.delete(id);
  if (sel && !sel.size) { sel = null; layerClosed('sel'); }
  renderSelBar();
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
  withUndo(`${r.name} ligger i papperskorgen`, () => trashItems(data, 'rec', [r.id], isoToday()));
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

// ---------- Markera flera (håll in en post): Avsluta eller Ta bort på en gång ----------
// sel = Set of marked ids, or null. The mode is a layer (nav.js): Bakåt ends it; ✕ and actions go back one step.
let sel = null, pressTimer = 0, pressAt = null, pressFired = false;
function startSel(id) {
  sel = new Set([id]); navigator.vibrate?.(20);
  layerOpened('sel', () => { sel = null; renderItems(); });
  renderItems();
}
function endSel() {
  if (!sel) return;
  sel = null; renderItems();
  layerClosed('sel');
}
function toggleSel(id) {
  if (sel.has(id)) sel.delete(id); else sel.add(id);
  if (!sel.size) endSel(); else renderItems();
}
$('nav').addEventListener('click', () => { if (sel) { sel = null; renderItems(); } });
function renderSelBar() {
  let bar = $('sel-bar');
  if (!sel) { bar?.remove(); return; }
  const n = sel.size, ids = data.recurring.map((r) => r.id), all = ids.every((id) => sel.has(id));
  const btn = (text, click, cls = '') => el('button', { type: 'button', class: 'btn text ' + cls, text, on: { click } });
  const next = el('div', { id: 'sel-bar', class: 'sel-bar', role: 'toolbar', 'aria-label': 'Markerade poster' },
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Avsluta markering', text: '✕', on: { click: endSel } }),
    el('span', { class: 'sel-n', 'aria-live': 'polite', text: `${n} ${n === 1 ? 'vald' : 'valda'}` }),
    btn(all ? 'Ingen' : 'Alla', () => { if (all) endSel(); else { sel = new Set(ids); renderItems(); } }),
    btn('Avsluta', openEndDialog),
    btn('Ta bort', removeSelected, 'danger'));
  if (bar) bar.replaceWith(next); else $('inc-card').before(next);
}
function removeSelected() {
  const list = data.recurring.filter((r) => sel.has(r.id)), n = list.length;
  endSel();
  withUndo(`${n === 1 ? list[0].name : `${n} poster`} ligger i papperskorgen`, () => trashItems(data, 'rec', list.map((r) => r.id), isoToday()));
}
function openEndDialog() {
  const n = sel.size;
  $('ed-text').textContent = `${n === 1 ? 'Posten' : `De ${n} posterna`} räknas till och med den månad du väljer och syns sedan som avslutade. Historiken bakåt finns kvar.`;
  $('ed-month').value = currentMonth();
  $('ed-error').textContent = '';
  $('end-dialog').showModal();
}
$('ed-cancel').addEventListener('click', () => $('end-dialog').close());
$('ed-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const m = $('ed-month').value;
  if (!isMonth(m)) { $('ed-error').textContent = 'Välj en månad.'; return; }
  const list = data.recurring.filter((r) => sel?.has(r.id)), late = list.filter((r) => r.start > m);
  if (late.length) { $('ed-error').textContent = `${late[0].name} börjar efter den månaden – välj en senare månad eller avmarkera den.`; return; }
  $('end-dialog').close();
  endSel();
  withUndo(list.length === 1 ? `${list[0].name} avslutas efter ${monthLabel(m).toLowerCase()}` : `${list.length} poster avslutas efter ${monthLabel(m).toLowerCase()}`, () => {
    for (const r of list) r.end = m; data = loadData(data);
  });
});
// Long press on a row in Poster starts the mode; moving the finger (scroll) cancels. The click after it is swallowed.
const tabItems = $('tab-items');
const endPress = () => { clearTimeout(pressTimer); pressAt = null; };
tabItems.addEventListener('pointerdown', (e) => {
  endPress(); pressFired = false;
  const b = e.target.closest('#inc-list .row-main, #exp-list .row-main');
  if (!b || sel || e.button > 0) return;
  pressAt = { x: e.clientX, y: e.clientY };
  pressTimer = setTimeout(() => { pressAt = null; pressFired = true; getSelection()?.removeAllRanges(); startSel(b.dataset.id); }, CONFIG.longPressMs);
});
tabItems.addEventListener('pointermove', (e) => { if (pressAt && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 10) endPress(); });
for (const t of ['pointerup', 'pointercancel', 'scroll']) addEventListener(t, endPress, { passive: true, capture: true });
tabItems.addEventListener('click', (e) => { if (pressFired) { pressFired = false; e.stopPropagation(); e.preventDefault(); } }, true);
tabItems.addEventListener('contextmenu', (e) => { if (e.target.closest('.row-main')) e.preventDefault(); });

// Android starts its own text selection on a long press (on the text next to the row too): clear it while marking.
document.addEventListener('selectionchange', () => { if ((pressAt || sel) && !document.activeElement?.matches?.('input, textarea')) getSelection()?.removeAllRanges(); });
