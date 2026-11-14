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
function savedPassword() { try { const p = localStorage.getItem(PWD_KEY); return p && !Backup.checkPassword(p) ? p : ''; } catch { return ''; } }
function rememberOn() { try { return localStorage.getItem(OFF_KEY) !== '1'; } catch { return false; } }
function setRemember(on) {
  showPwd = false;
  try { if (on) localStorage.removeItem(OFF_KEY); else { localStorage.setItem(OFF_KEY, '1'); localStorage.removeItem(PWD_KEY); } } catch { /* blocked */ }
  renderPwd();
}
function keep(pwd) {
  if (!rememberOn() || Backup.checkPassword(pwd) || savedPassword()) return;   // a password from another file never replaces the saved one
  try { localStorage.setItem(PWD_KEY, pwd); } catch { /* no room: asks next time */ }
  closeWelcome();
}
function forgetPassword() { showPwd = false; try { localStorage.removeItem(PWD_KEY); localStorage.removeItem(OFF_KEY); } catch { /* blocked */ } renderPwd(); }
async function rememberPassword() {
  const a = await Backup.askPassword('export'); if (!a) return;
  try { localStorage.setItem(PWD_KEY, a.pwd); } catch { snackbar('Kunde inte spara lösenordet', null, null, 3000); return; }
  renderPwd(); snackbar('Lösenordet sparas på den här enheten. Ha det kvar i din lösenordshanterare också.', null, null, 6000);
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
  } catch { return 'error'; } finally { pwdBusy = false; }
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
/* ---------- Välkommen: välj lösenord först (2026-11-14) ----------
   Utan sparat lösenord är appen låst bakom en ruta tills ett lösenord är valt (eller en krypterad backup är inläst,
   vars lösenord sparas), som att registrera sig. Lösenordet är bara nyckeln till backup-filerna – det sparas på enheten (bb.pwd), aldrig i
   datan eller i filen. Bockar man ur Kom ihåg visas rutan inte (man har valt att få frågan varje gång). */
let welcomeDlg = null, importBtn = null;
const welcomeHasData = () => data.recurring.length || data.oneOffs.length || data.accounts.length;
const needsWelcome = () => !savedPassword() && rememberOn();   // låst tills ett lösenord är valt, även med data
function closeWelcome() { if (welcomeDlg?.open && !needsWelcome()) welcomeDlg.close(); }
function welcomeCheck() {
  if (!needsWelcome() || welcomeDlg?.open || typeof HTMLDialogElement !== 'function') return;
  const other = document.querySelector('dialog[open]');   // t.ex. backup-påminnelsen: fråga när den stängs
  if (other) { other.addEventListener('close', () => setTimeout(welcomeCheck, 0), { once: true }); return; }
  if (!welcomeDlg) {
    const err = el('p', { class: 'error', role: 'alert' });
    const file = el('input', { type: 'file', accept: '.txt,.json' });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; if (!f) return;
      let r; try { r = await Backup.read(f, MAX_IMPORT_CHARS); } catch { r = { error: 'Kunde inte läsa filen.' }; }
      file.value = '';
      err.textContent = r.error || '';
      if (!r.error) openImport(r.text);
    });
    const pick = el('button', { type: 'button', class: 'btn filled', text: 'Välj lösenord' });
    pick.addEventListener('click', choosePassword);
    welcomeDlg = el('dialog', { class: 'welcome', 'aria-labelledby': 'wl-title' },
      el('h2', { id: 'wl-title', text: 'Välkommen!' }),
      el('p', { text: 'Välj ett lösenord för att komma igång och skriv ner det på en säker plats, till exempel i din lösenordshanterare. Dina backup-filer skyddas med lösenordet, och det behövs för att läsa in en backup.' }),
      el('p', { class: 'muted small', text: 'Vi samlar ingen data. Allt stannar på din enhet – lösenordet är bara en nyckel som skyddar dina backuper.' }),
      el('div', { class: 'welcome-actions' }, pick, importBtn = el('label', { class: 'btn tonal btn-file' }, 'Jag har en backup-fil att importera', file)),
      err);
    welcomeDlg.addEventListener('cancel', (e) => e.preventDefault());   // inte Esc/Bakåt: ett lösenord först
    document.body.append(welcomeDlg);
  }
  importBtn.hidden = !!welcomeHasData();   // har man redan data behövs bara lösenordet
  welcomeDlg.showModal();
}
async function choosePassword() {
  const wait = Backup.askPassword('export');   // sets the dialog texts synchronously; ours replace them
  const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
  set('pw-title', 'Välj lösenord'); set('pw-text', 'Lösenordet krypterar dina backup-filer och sparas på den här enheten.'); set('pw-ok', 'Spara lösenord');
  const a = await wait; if (!a) return;
  keep(a.pwd); renderPwd();
  snackbar('Lösenordet är sparat. Backup sparas med ett tryck.', null, null, 4000);
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
  new MutationObserver(() => { if (dlg.open) one = false; }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  show.addEventListener('change', apply);
  gen?.addEventListener('click', () => setTimeout(apply, 0));   // the generator ticks Visa itself
  p1.addEventListener('input', () => { if (one) p2.value = p1.value; });
}
oneFieldWhenShown();
function renderPwd() {
  const box = $('pwd-box'); if (!box) return;
  const p = savedPassword(), on = rememberOn();
  const cb = el('input', { type: 'checkbox', checked: on, on: { change: (e) => setRemember(e.target.checked) } });
  const toggle = el('button', { type: 'button', class: 'btn text', 'aria-pressed': showPwd ? 'true' : 'false', on: { click: () => { showPwd = !showPwd; renderPwd(); } } }, showPwd ? 'Dölj' : 'Visa');
  const change = el('button', { type: 'button', class: 'btn text', on: { click: rememberPassword } }, 'Byt');
  fill(box,
    el('label', { class: 'check' }, cb, el('span', { text: 'Kom ihåg backup-lösenordet på den här enheten' })),
    !on ? el('p', { class: 'muted small', text: 'Appen frågar efter lösenordet varje gång.' })
      : !p ? el('p', { class: 'muted small', text: 'Lösenordet du skriver vid nästa backup sparas – sedan räcker ett tryck. Filen är lika skyddad som förut.' })
      : el('div', { class: 'pwd-card' },
        el('div', { class: 'pwd-head' }, el('span', { text: '🔑 Lösenordet är sparat' }), toggle, change),
        showPwd ? el('p', { class: 'pwd-show', text: p }) : null,
        el('p', { class: 'muted small pwd-note', text: 'Backup sparas med ett tryck. Ha lösenordet kvar i din lösenordshanterare – utan det går backupen inte att öppna på en ny telefon.' })));
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
  if (r !== 'first' && BACKUP_MSG[r]) snackbar(BACKUP_MSG[r], null, null, 4000);
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
  closeWelcome();
  snackbar('Data importerad', 'Ångra', () => { data = before; save(); });
});

$('reset').addEventListener('click', () => $('confirm-dialog').showModal());
// Runs on the "Radera" click itself (not on the close event), like import.
$('cd-ok').addEventListener('click', () => {
  data = emptyData();
  forgetPassword();
  save();
  snackbar('All data är raderad', null, null, 3000);
  setTimeout(welcomeCheck, 0);
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
  renderMonth();
  renderOverview();
  renderStats();
  renderItems();
  renderSettings();
  renderPwd();
}


// ---------- Start ----------
$('version').textContent = 'v' + self.APP_VERSION;
const savedTab = store.get(CONFIG.tabKey);
showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : TABS.includes(savedTab) ? savedTab : 'month', false);
updateOnline();
render();
welcomeCheck();

// Service worker + update snackbar ("Ny version finns – Ladda om")
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => null);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}
