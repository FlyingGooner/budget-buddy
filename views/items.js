// Budget buddy – Nya poster (2026-11-18: sidan Poster borttagen, formulären i rutan Ny post). Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Items (recurring): separate cards for income and expenses ----------
const EVERY_OPTIONS = [[1, 'Varje månad'], [2, 'Varannan månad'], [3, 'Varje kvartal'], [12, 'En gång om året']];
function fillEverySelect(sel, value = 1) {
  sel.replaceChildren(...EVERY_OPTIONS.map(([v, t]) => el('option', { value: v, text: t })));
  sel.value = String(value);
}

// Fyller formulärens val (kategori, person, valuta); anropas vid varje render.
function renderItems() {
  for (const f of [$('inc-form'), $('exp-form')]) {
    fillCategorySelect(f.elements.category, f.elements.category.value, f.dataset.type);
    fillPersonSelect(f.elements.person, f.elements.person.value);
  }
  fillPersonSelect($('sav-form').elements.person, $('sav-form').elements.person.value);
  { const c = $('sav-form').elements.currency, v = c.value || home();   // kontots valuta, förval hemvalutan
    c.replaceChildren(...CURRENCIES.map((x) => el('option', { value: x, text: CUR_NAMES[x] }))); c.value = v; }
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
    const bal = f.balance && f.balance.value.trim() ? parseKr(f.balance.value) : null;
    if (f.balance && f.balance.value.trim() && (bal == null || !isAmount(bal))) { err.textContent = 'Skriv ett saldo, t.ex. 45 000 eller 1250,50.'; f.balance.focus(); return; }
    const id = newId();
    data.recurring.push({ id, name, amount, type, category: f.category.value, person: personValue(f.person),
      every: type === 'income' ? 1 : Number(f.every.value), start: month, end: null, ...(f.pre && f.pre.checked ? { pre: true } : {}) });
    if (bal != null && data.accounts.length < MAX_ACCOUNTS)   // sparande med saldo = eget sparkonto som räknas upp
      data.accounts.push({ id: 'a' + newId().slice(-10), name: cleanName(name, 30), currency: f.currency && CURRENCIES.includes(f.currency.value) ? f.currency.value : home(), balances: { [month]: bal }, feeds: [id] });
    if (f.balance) f.balance.value = ''; if (f.pre) f.pre.checked = false;
    data = loadData(data);
    save();
    if (f.name) f.name.value = ''; f.amount.value = '';
    $('new-dialog').close();
    snackbar(`${name} lades till`, null, null, 3000);
  });
}
setupAddForm($('inc-form'));
setupAddForm($('exp-form'));
setupAddForm($('sav-form'));

// Öppnar rutan Ny post med rätt formulär.
const NEW_TITLES = { income: 'Ny inkomst', expense: 'Ny kostnad', savings: 'Nytt sparande' };
function focusAdd(type) {
  const id = { income: 'inc-form', expense: 'exp-form', savings: 'sav-form' }[type];
  for (const f of ['inc-form', 'exp-form', 'sav-form']) $(f).hidden = f !== id;
  $(id).querySelector('.error').textContent = '';
  $('nd-title').textContent = NEW_TITLES[type];
  if (!$('new-dialog').open) $('new-dialog').showModal();
  const els = $(id).elements;
  (els.name || els.category).focus();
}
$('nd-cancel').addEventListener('click', () => $('new-dialog').close());

// Alla poster (2026-11-18): en lista över alla återkommande poster, även avslutade och kommande. Tryck = öppna posten
// i en månad där den gäller (den du tittar på, annars dess första eller sista månad).
function openAllItems() {
  const now = month, groups = [['income', 'Inkomster'], ['expense', 'Kostnader'], ['savings', '🐷 Sparande']];
  const kind = (r) => (r.type === 'income' ? 'income' : r.category === SAVINGS_CAT ? 'savings' : 'expense');
  const period = (r) => r.end && r.end < now ? `avslutad ${monthShortLabel(r.end).toLowerCase()} ${monthLabel(r.end).slice(-4)}`
    : r.start > now ? `från ${monthShortLabel(r.start).toLowerCase()} ${monthLabel(r.start).slice(-4)}` : null;
  const open = (r) => {
    const m = r.start > now ? r.start : r.end && r.end < now ? r.end : now;
    $('all-dialog').close();
    setTimeout(() => { if (m !== month) setMonth(m); const row = rowsForMonth(data, m).find((x) => x.id === r.id); if (row) openRowDialog(row); }, 0);
  };
  fill($('all-list'), ...(data.recurring.length ? groups.map(([k, title]) => {
    const rs = data.recurring.filter((r) => kind(r) === k).sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    return rs.length ? [el('h3', { class: 'all-h', text: title }), el('ul', { class: 'list' }, rs.map((r) => el('li', { class: 'row' + (period(r)?.startsWith('avslutad') ? ' ended' : '') },
      el('button', { type: 'button', class: 'row-main', 'aria-label': `${r.name}, ${kr(r.amount)}. Ändra`, on: { click: () => open(r) } },
        el('span', { class: 'row-name' }, el('span', { text: r.name }), el('span', { class: 'row-sub', text: [k === 'expense' ? catName(r.category) : null, r.type === 'expense' ? everyLabel[r.every] : null, period(r)].filter(Boolean).join(' · ') })),
        el('span', { class: 'amount', text: kr(r.amount) })))))] : null;
  }).flat().filter(Boolean) : [el('p', { class: 'muted', text: 'Inga poster än.' })]));
  $('all-dialog').showModal();
}
$('all-items').addEventListener('click', openAllItems);
$('all-close').addEventListener('click', () => $('all-dialog').close());
