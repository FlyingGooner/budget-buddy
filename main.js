// Budget buddy – Export/import, installation, render och start – laddas sist. Vanligt skript (delar globalt scope med app.js), laddas i ordningen i index.html.
// ---------- Export/import as text (U5) – nothing is saved before the user confirms ----------
const isoToday = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
$('export-btn').addEventListener('click', () => {
  $('export-text').value = exportText(data, isoToday());
  $('export-text').focus();
  $('export-text').select();
  snackbar('Markerat – kopiera texten och spara den', null, null, 4000);
});
let pendingImport = null;
$('import-btn').addEventListener('click', () => startImport($('import-text').value));
// Backup file (U5): the file holds exactly the export text; reading it goes through the same checks as pasted text.
const BACKUP_MSG = {
  saved: 'Backup-filen sparades',
  busy: 'Ett sparfönster är redan öppet',
  fallback: 'Backup-filen laddas ner – syns den inte, använd Visa som text',
  error: 'Kunde inte spara filen – använd Visa som text',
};
$('backup-save').addEventListener('click', async () => {
  const r = await Backup.save({ slug: 'budget-buddy', today: isoToday(), text: exportText(data, isoToday()) });
  if (BACKUP_MSG[r]) snackbar(BACKUP_MSG[r], null, null, 4000);
});
$('import-file').addEventListener('change', async (e) => {
  const input = e.target;
  const file = input.files && input.files[0];
  input.value = '';   // the same file can be chosen again
  if (!file) return;
  const r = await Backup.read(file, MAX_IMPORT_CHARS);
  if (r.error) { $('import-error').textContent = r.error; return; }
  startImport(r.text);
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

$('reset').addEventListener('click', () => $('confirm-dialog').showModal());
// Runs on the "Radera" click itself (not on the close event), like import.
$('cd-ok').addEventListener('click', () => {
  data = emptyData();
  save();
  snackbar('All data är raderad', null, null, 3000);
});

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
  renderOverviewInto($('month-overview'), true);
  renderStats();
  renderItems();
  renderSettings();
}


// ---------- Start ----------
$('version').textContent = 'v' + self.APP_VERSION;
const savedTab = store.get(CONFIG.tabKey);
showTab(TABS.includes(savedTab) ? savedTab : 'month');
updateOnline();
render();

// Service worker + update snackbar ("Ny version finns – Ladda om")
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => null);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) snackbar('Ny version finns', 'Ladda om', () => location.reload(), 0);
  });
}
