// Budget buddy – Export/import, installation, render och start – laddas sist. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Export/import as text (U5) – nothing is saved before the user confirms ----------
const isoToday = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
let pendingImport = null;
$('import-btn').addEventListener('click', () => openImport($('import-text').value));
// Encrypted backup (U5, 2026-11-11): an envelope asks for the password, then the same checks as plain text.
// ---------- Remembered backup password (U5) ----------
// On by default: the password typed in the backup dialog (save or read) is kept under bb.pwd, so the next backup is one
// tap. Only on this device – never in the app data, so never inside a backup file; the file is as encrypted as before.
// Unticked (bb.pwdoff = 1): forgotten, and the app asks every time. Radera all data removes both keys.
const PWD_KEY = 'bb.pwd', OFF_KEY = 'bb.pwdoff';
let showPwd = false, pwdBusy = false;
// 2026-11-15: koden skapas av appen (generatePassword: 16 tecken, kryptografisk slump) och sparas på enheten. Egen kod går att välja (ownPassword), med samma krav.
function savedPassword() {
  try { let p = localStorage.getItem(PWD_KEY); if (!p) { p = Backup.generatePassword(); localStorage.setItem(PWD_KEY, p); } return p; } catch { return ''; }
}
function rememberOn() { return true; }   // koden sparas alltid (2026-11-15)
function setRemember(on) {
  showPwd = false;
  try { if (on) localStorage.removeItem(OFF_KEY); else { localStorage.setItem(OFF_KEY, '1'); localStorage.removeItem(PWD_KEY); } } catch { /* blocked */ }
  renderPwd();
}
// En backup som lästs in med en annan kod: den koden används sedan (en kod att hålla reda på, t.ex. på en ny telefon).
function keep(pwd) {
  if (!pwd || pwd === savedPassword()) return;
  try { localStorage.setItem(PWD_KEY, pwd); } catch { return; }
  renderPwd(); snackbar('Koden från filen används nu för nya backuper.', null, null, 4000);
}
function forgetPassword() { showPwd = false; try { localStorage.removeItem(PWD_KEY); localStorage.removeItem(OFF_KEY); } catch { /* blocked */ } renderPwd(); }
// Byta kod (2026-11-15): fråga först – gamla backup-filer öppnas bara med den gamla koden. Efteråt: spara en ny backup.
function sureNewCode() {
  const d = document.getElementById('newcode-dialog');
  if (!d || typeof d.showModal !== 'function') return Promise.resolve('ok');
  return new Promise((res) => { d.addEventListener('close', () => res(d.returnValue === 'ok' || d.returnValue === 'save' ? d.returnValue : ''), { once: true }); d.returnValue = ''; d.showModal(); });
}
const afterNewCode = (msg, how) => how === 'save' ? document.getElementById('backup-save').click() : snackbar(msg + ' Spara en ny backup nu.', 'Spara backup', () => document.getElementById('backup-save').click(), 10000);
async function rememberPassword() {
  const how = await sureNewCode(); if (!how) return;
  const p = Backup.generatePassword();
  try { localStorage.setItem(PWD_KEY, p); } catch { snackbar('Kunde inte spara koden', null, null, 3000); return; }
  showPwd = true; renderPwd();
  afterNewCode('Ny kod skapad.', how);
}
// Egen kod (2026-11-15): samma krav som den skapade (checkPassword: 16+ tecken, stor och liten bokstav, siffra, specialtecken).
async function ownPassword() {
  const how = await sureNewCode(); if (!how) return;
  const wait = Backup.askPassword('export');   // sets the dialog texts synchronously; ours replace them
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set('pw-title', 'Välj egen kod'); set('pw-text', 'Koden låser dina backup-filer och sparas på den här enheten.'); set('pw-ok', 'Spara kod');
  const a = await wait; if (!a) return;
  try { localStorage.setItem(PWD_KEY, a.pwd); } catch { snackbar('Kunde inte spara koden', null, null, 3000); return; }
  showPwd = false; renderPwd();
  afterNewCode('Din egen kod är sparad.', how);
}
function copyPassword() {
  const p = savedPassword();
  if (!p || !navigator.clipboard) { snackbar('Kunde inte kopiera – tryck Visa och skriv av koden', null, null, 4000); return; }
  navigator.clipboard.writeText(p).then(() => snackbar('Koden är kopierad', null, null, 3000), () => snackbar('Kunde inte kopiera – tryck Visa och skriv av koden', null, null, 4000));
}
// Returns the Backup.save result ('saved', 'fallback', 'cancelled', …); null on a double tap.
async function saveBackupFile(slug, today, getText) {
  const pwd = savedPassword();
  if (!pwd && !rememberOn()) return Backup.saveWithPassword({ slug, today, text: getText() });
  if (pwdBusy) return null;
  pwdBusy = true;
  try {
    if (pwd) {   // one tap: encrypt with the remembered password, no dialog
      snackbar('Krypterar backup…', null, null, 2000);
      return await Backup.save({ slug, today, text: await Backup.encrypt(getText(), pwd, slug) });
    }
    // First time: the usual dialog, then the password is kept.
    const a = await Backup.askPassword('export', async (p) => ({ env: await Backup.encrypt(getText(), p, slug) }));
    if (!a) return 'cancelled';
    keep(a.pwd); renderPwd();
    const r = await Backup.save({ slug, today, text: a.value.env });
    if (r === 'saved' || r === 'fallback') { snackbar('Backup sparad. Lösenordet är sparat på enheten – nästa gång räcker ett tryck.', null, null, 5000); return 'first'; }
    return r;
  } catch (e) { if (!Backup.lastError) Backup.note(e); return 'error'; } finally { pwdBusy = false; }
}
// The remembered password first; another password → the usual question. Returns { text } | { error } | { cancelled }.
async function openBackupText(text, slug) {
  const pwd = savedPassword();
  if (pwd && Backup.isEncrypted(text)) {
    let t; try { t = await Backup.decrypt(text, pwd, slug, MAX_IMPORT_CHARS); } catch { t = null; }
    if (t && typeof t.text === 'string') return { text: t.text, unlocked: true };
  }
  if (rememberOn() && Backup.isEncrypted(text)) {   // ask, and keep the password that opened the file (a new phone)
    const wait = Backup.askPassword('import', (p) => Backup.decrypt(text, p, slug, MAX_IMPORT_CHARS));
    if (pwd) noteWrongSaved();
    const a = await wait;
    if (!a) return { cancelled: true };
    if (a.value?.error) return { error: a.value.error };
    keep(a.pwd); renderPwd(); return { text: a.value.text };
  }
  return Backup.openText(text, slug, MAX_IMPORT_CHARS);
}
// 2026-11-15: lösenordet skapas och sparas automatiskt vid start (och efter Radera all data) – användaren behöver aldrig
// välja ett. Visa/Byt under Inställningar. Ingen välkomstruta: svenska och lösenordet är förvalda.
function autoPassword() {
  if (savedPassword() || !rememberOn()) return;
  try { localStorage.setItem(PWD_KEY, Backup.generatePassword()); } catch { /* blocked: asks at the first backup */ }
}
// Point 2: the user is told when the remembered password opened the file, and when it did not fit.
function noteUnlocked() { const s = document.getElementById('imp-sum'); if (s && document.getElementById('import-dialog')?.open) s.textContent += ' Backupen låstes upp med det sparade lösenordet.'; }
function noteWrongSaved() { const n = document.getElementById('pw-text'); if (n) n.textContent = 'Det sparade lösenordet passade inte till den här filen. Skriv lösenordet du valde när du sparade den.'; }
// Visa lösenord: ett fält räcker (som i KeePass) – Upprepa döljs och följer det första. Görs här, backup.js är delad.
function oneFieldWhenShown() {
  const $id = (id) => document.getElementById(id);
  const dlg = $id('pw-dialog'), show = $id('pw-show'), p1 = $id('pw-1'), p2 = $id('pw-2'), row = $id('pw-2-row'), gen = $id('pw-gen');
  if (!dlg || !show || !p1 || !p2 || !row) return;
  let one = false;   // true while Upprepa is hidden by us (only when saving – reading never shows it)
  const apply = () => {
    if (show.checked && !row.hidden) { one = true; row.hidden = true; p2.value = p1.value; }
    else if (!show.checked && one) { one = false; row.hidden = false; }
  };
  // Sparas lösenordet (Kom ihåg på): påminn om att inte återanvända ett lösenord – det ligger i klartext på enheten.
  const warn = () => { const w = $id('pw-warn'); if (w && !row.hidden && rememberOn() && !w.textContent.includes('annanstans')) w.textContent += (w.textContent ? ' ' : '') + 'Använd ett nytt lösenord som du inte har någon annanstans – det sparas på den här enheten.'; };
  new MutationObserver(() => { if (dlg.open) { one = false; warn(); } }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  show.addEventListener('change', apply);
  gen?.addEventListener('click', () => setTimeout(apply, 0));   // the generator ticks Visa itself
  p1.addEventListener('input', () => { if (one) p2.value = p1.value; });
}
oneFieldWhenShown();
// Din kod (2026-11-15): skapas alltid av appen. Visa, Kopiera, Ny kod.
function renderPwd() {
  const box = $('pwd-box'); if (!box) return;
  const p = savedPassword();
  const toggle = el('button', { type: 'button', class: 'btn text', 'aria-pressed': showPwd ? 'true' : 'false', on: { click: () => { showPwd = !showPwd; renderPwd(); } } }, showPwd ? 'Dölj' : 'Visa');
  const copy = el('button', { type: 'button', class: 'btn text', on: { click: copyPassword } }, 'Kopiera');
  const change = el('button', { type: 'button', class: 'btn text', on: { click: rememberPassword } }, 'Ny kod');
  fill(box, el('div', { class: 'pwd-card' },
    el('div', { class: 'pwd-head' }, el('span', { text: '🔑 Din kod' }), toggle, copy, change),
    showPwd && p ? el('p', { class: 'pwd-show', text: p }) : null,
    el('p', { class: 'muted small pwd-note', text: 'Backupen låses med koden. Spara den i din lösenordshanterare.' })));
}
async function openImport(text) {
  const r = await openBackupText(text, 'budget-buddy');
  if (r.cancelled) return;
  if (r.error) { $('import-error').textContent = r.error; return; }
  startImport(r.text);
  if (r.unlocked) noteUnlocked();
}
// Backup file (U5): the file holds exactly the export text; reading it goes through the same checks as pasted text.
const BACKUP_MSG = {
  saved: 'Backup-filen sparades',
  busy: 'Ett sparfönster är redan öppet',
  fallback: 'Backup-filen laddas ner',
  error: 'Kunde inte spara filen',
  nocrypto: 'Den här webbläsaren kan inte kryptera – ingen fil sparades',
};
$('backup-save').addEventListener('click', async () => {
  const r = await saveBackupFile('budget-buddy', isoToday(), () => exportText(data, isoToday()));
  if (r !== 'first' && BACKUP_MSG[r]) snackbar(BACKUP_MSG[r] + (r === 'error' && Backup.lastError ? ` (${Backup.lastError})` : ''), null, null, r === 'error' ? 8000 : 4000);
});
$('import-file').addEventListener('change', async (e) => {
  const input = e.target;
  const file = input.files && input.files[0];
  input.value = '';   // the same file can be chosen again
  if (!file) return;
  const r = await Backup.read(file, MAX_IMPORT_CHARS);
  if (r.error) { $('import-error').textContent = r.error; return; }
  openImport(r.text);
});
function startImport(text) {
  const r = importText(text);
  $('import-error').textContent = r.error || '';
  if (r.error) return;
  pendingImport = r.data;
  const c = r.counts, d = r.data;
  const months = [...d.recurring.map((x) => x.start), ...d.oneOffs.map((x) => x.month), ...Object.keys(d.adjustments)].sort();
  const parts = [`${c.recurring} återkommande poster`, `${c.oneOffs} engångsposter`, `${c.accounts} sparkonton`];
  $('imp-sum').textContent = parts.join(', ') + (months.length ? `, ${monthLabel(months[0]).toLowerCase()}–${monthLabel(months[months.length - 1]).toLowerCase()}` : '')
    + (r.exported ? `. Exporterad ${r.exported}.` : '.') + (r.skipped ? ` ${r.skipped} ogiltiga hoppas över.` : '');
  $('import-dialog').showModal();
}
// Runs on the "Ersätt" click itself (the form then closes the dialog), so it does not depend on the close event.
$('imp-ok').addEventListener('click', () => {
  const next = pendingImport;
  pendingImport = null;
  if (!next) return;
  const before = data;
  if (!store.set(CONFIG.storageKey, next)) { status('Kunde inte spara – lagringen är full eller blockerad. Inget ändrades.', true); return; }
  data = next;
  $('import-text').value = '';
  render();
  snackbar('Data importerad', 'Ångra', () => { data = before; save(); });
});

$('pwd-own').addEventListener('click', ownPassword);   // Välj egen kod (knappen saknade lyssnare)
$('reset').addEventListener('click', () => $('confirm-dialog').showModal());
// Runs on the "Radera" click itself (not on the close event), like import.
$('cd-ok').addEventListener('click', () => {
  data = emptyData();
  forgetPassword();
  save();
  snackbar('All data är raderad', null, null, 3000);
  setTimeout(autoPassword, 0);
});

// Lösenordet ligger aldrig framme efter flikbyte.
$('nav').addEventListener('click', () => { if (showPwd) { showPwd = false; renderPwd(); } });
addEventListener('popstate', () => { if (showPwd) { showPwd = false; renderPwd(); } });

// ---------- Install (beforeinstallprompt) ----------
let installEvent = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; $('install').hidden = false; });
addEventListener('appinstalled', () => { installEvent = null; $('install').hidden = true; });
$('install').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice.catch(() => null);
  installEvent = null;
  $('install').hidden = true;
});

// ---------- Offline status ----------
function updateOnline() { if (navigator.onLine) status(''); else status('Offline – allt fungerar ändå, data finns på enheten.', false); }
addEventListener('online', updateOnline);
addEventListener('offline', updateOnline);

// ---------- Render all ----------
function render() {
  document.querySelectorAll('.cur-unit').forEach((n) => { n.textContent = unit(); });   // hemvalutan i fältens etiketter
  renderMonth();
  renderOverview();
  renderStats();
  renderItems();
  renderSettings();
  renderPwd();
}


// ---------- Visas igen (som de andra apparna) ----------
// Ny månad sedan sist: Månad och Översikt följer med om de visade den gamla "nu"-månaden. Papperskorgen rensas.
// Tryck på ett filfält öppnar filväljaren, som döljer appen en stund: då ritas inget om (Android kan annars byta ut fältet).
let shownMonth = activeMonth(), filePick = false;
document.addEventListener('click', (e) => { if (e.target.matches?.('input[type=file]')) filePick = true; }, true);
function purge() { if (purgeTrash(data, isoToday())) store.set(CONFIG.storageKey, data); }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (filePick) { filePick = false; return; }
  const now = activeMonth();
  if (now !== shownMonth) {
    if (month === shownMonth) month = now;
    if (overviewStart === shownMonth) overviewStart = now;
    shownMonth = now;
  }
  purge();
  if (!document.activeElement?.matches?.('input, textarea, select') && !document.querySelector('dialog[open]')) render();
});

// ---------- Start ----------
$('version').textContent = 'v' + self.APP_VERSION;
const savedTab = store.get(CONFIG.tabKey);
showTab(location.hash.slice(1) || savedTab || 'month', false);   // okänd flik → Månad, gamla 'overview' → Översikt
updateOnline();
purge();
render();
autoPassword();

// Service worker + update snackbar ("Ny version finns – Ladda om")
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => null);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}

// CSV (2026-11-15): en rad per post och månad – från första månaden med data till ett år framåt (högst 20 år). Inte krypterad.
$('pwd-own').addEventListener('click', ownPassword);
$('csv-export').addEventListener('click', () => {
  const tr = Csv.tr, cur = currentMonth();
  const months = [...data.recurring.map((r) => r.start), ...data.oneOffs.map((o) => o.month), cur].sort();
  const last = [addMonths(cur, 11), ...data.oneOffs.map((o) => o.month)].sort().pop();
  const rows = [];
  for (let m = months[0], i = 0; m <= last && i < 240; m = addMonths(m, 1), i++) {
    for (const r of rowsForMonth(data, m)) rows.push([m, r.name, tr(r.type === 'income' ? 'Inkomst' : 'Kostnad'), catName(r.category),
      hasPeople() ? personName(r.person) : '', r.amount / 100, home(), tr(r.kind === 'rec' || r.kind === 'acc' ? 'Ja' : 'Nej'), r.adjusted ? tr('Ja') : '']);   // acc = kontots månadssparande
  }
  // 2026-11-21: utfall för stängda månader och sparkontonas ifyllda värden – för analys i t.ex. Excel.
  for (const m of Object.keys(data.closed).sort()) {
    const t = monthTotals(data, m);
    rows.push([m, tr('Kvar på kontot'), tr('Stängd'), '', '', t.left / 100, home(), '', '']);
    rows.push([m, tr('Rörligt'), tr('Stängd'), '', '', (t.planned - t.left) / 100, home(), '', '']);
  }
  for (const a of data.accounts) for (const m of Object.keys(a.balances).sort())
    rows.push([m, a.name, tr('Sparkonto'), tr('Värde'), '', a.balances[m] / 100, a.currency, '', '']);
  const text = Csv.build(['Månad', 'Namn', 'Typ', 'Kategori', 'Person', 'Belopp', 'Valuta', 'Återkommande', 'Ändrad denna månad'], rows);
  snackbar(Csv.download(`budget-buddy-${isoToday()}.csv`, text) ? 'CSV-filen laddas ner' : 'Kunde inte skapa filen', null, null, 3000);
});

// Swipe sideways on the bottom menu → the next/previous view (2026-11-17, same in all apps).
(function navSwipe(nav, item, on) {
  if (!nav) return;
  let t0 = null;
  nav.addEventListener('touchstart', (e) => { const t = e.touches[0]; t0 = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
  nav.addEventListener('touchend', (e) => {
    if (!t0) return;
    const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y;
    t0 = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    const items = [...nav.querySelectorAll(item)].filter((x) => !x.hidden && x.offsetParent);
    // 2026-11-18: svep i menyn dit du vill gå – åt höger = fliken till höger (som att dra markeringen).
    const next = items[items.findIndex((x) => x.matches(on)) + (dx > 0 ? 1 : -1)];
    if (next) next.click();
  }, { passive: true });
})(document.getElementById('nav'), 'button', '[aria-current="page"]');
