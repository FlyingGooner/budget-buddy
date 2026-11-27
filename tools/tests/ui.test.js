// UI flow tests in dist/budget-buddy.html with tools/tests/ui-seed.json. Run: tools\test.ps1 budget-buddy
const $id = (i) => document.getElementById(i);
const stored = () => JSON.parse(localStorage.getItem('bb.data'));

T.test('appen startar och visar version', () => { T.ok(/^v\d+\.\d+\.\d+$/.test($id('version').textContent), 'versionsetikett'); });
T.test('sparkonto i USD räknas om till kronor', () => {
  T.ok($id('acc-total').textContent.includes('≈'), 'summan ska ha ≈');
  T.ok($id('acc-rates').textContent.includes('referenskurser'), 'kursrad');
});
T.test('sparpost med konto: Kontot › öppnar kontots ruta (2026-11-18)', async () => {
  const a = data.accounts.find((x) => (x.feeds || []).length);
  if (!a) return;
  openRowDialog(rowsForMonth(data, month).find((r) => r.id === a.feeds[0]));
  T.ok(!$id('rd-account').hidden, 'knappen Kontot › syns');
  $id('rd-account').click();
  await T.until(() => $id('acc-dialog').open, 'kontots ruta öppnades inte');
  T.eq($id('ad-title').textContent, a.name);
  $id('ad-cancel').click();
  await T.until(() => !$id('acc-dialog').open);
});
// Imported data is saved normalised (loadData), the seed in localStorage is raw until the first save: compare normalised.
const norm = (d) => JSON.stringify(loadData(d));
T.test('ingen okrypterad export, inklistrad text importeras, med ångra', async () => {
  T.ok(!$id('export-text') && !$id('export-btn'), 'textexporten finns kvar');
  const txt = exportText(data, isoToday());   // an old unencrypted backup
  const before = stored();
  $id('import-text').value = txt.replace('"Buffert"', '"Buffert 2"');
  $id('import-btn').click();
  await T.until(() => $id('import-dialog').open, 'bekräftelsedialog');
  T.ok($id('imp-sum').textContent.includes('sparkonton'), 'sammanfattning');
  $id('imp-ok').click();
  await T.until(() => stored().accounts.some((a) => a.name === 'Buffert 2'), 'importen sparades inte');
  $id('snack-action').click();
  await T.until(() => norm(stored()) === norm(before), 'ångra återställde inte');
});
// Backup file (U5). Since 2026-11-15 the app makes the code itself (bb.pwd): saving is one tap without a dialog,
// a file locked with the saved code opens without a question, another code → the password dialog.
// Downloads are caught at <a download> (no host in the test file).
const PW = 'Bollen-Hoppar-2026!';
const savedPwd = () => localStorage.getItem('bb.pwd');
const catchDownload = async (fn) => {
  let saved = null, blob = null;
  const realClick = HTMLAnchorElement.prototype.click, realUrl = URL.createObjectURL;
  HTMLAnchorElement.prototype.click = function () { saved = { href: this.href, name: this.download }; };
  URL.createObjectURL = (b) => { blob = b; return realUrl.call(URL, b); };   // read the Blob itself: fetch(blob:) is blocked by connect-src
  try { await fn(); await T.real(T.until(() => saved, 'ingen nedladdning')); }
  finally { HTMLAnchorElement.prototype.click = realClick; URL.createObjectURL = realUrl; }
  saved.text = blob ? await blob.text() : null;
  return saved;
};
const pickFile = (parts, name = 'x.txt', type = 'text/plain') => {
  const input = $id('import-file');
  const dt = new DataTransfer(); dt.items.add(new File(parts, name, { type }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return input;
};
let encFile = null, otherFile = null;
const closeImport = async () => { $id('import-dialog').querySelector('button[value="cancel"]').click(); await T.until(() => !$id('import-dialog').open, 'importdialogen stängdes inte'); await T.wait(50); };
T.test('backup-fil: ett tryck, krypterad med den sparade koden, budget-buddy-datum.txt', async () => {
  T.ok(savedPwd(), 'koden skapades vid start');
  const saved = await catchDownload(async () => {
    $id('backup-save').click();
    T.ok(!$id('pw-dialog').open, 'ingen lösenordsdialog');
  });
  T.ok(/^budget-buddy-\d{4}-\d{2}-\d{2}\.txt$/.test(saved.name), 'filnamn ' + saved.name);
  T.ok(saved.href.startsWith('blob:'), 'blob-länk');
  T.ok(saved.text && Backup.isEncrypted(saved.text) && !saved.text.includes('Buffert'), 'filen är krypterad');
  const t = await T.real(Backup.decrypt(saved.text, savedPwd(), 'budget-buddy', MAX_IMPORT_CHARS));
  T.ok(t && t.text.includes('Buffert'), 'öppnas med den sparade koden');
  encFile = saved.text;
  otherFile = await T.real(Backup.encrypt(exportText(data, isoToday()), PW, 'budget-buddy'));
});
T.test('Välj egen kod: svagt eller olika lösenord sparar inget, Avbryt ändrar inget', async () => {
  const before = savedPwd();
  $id('pwd-own').click();
  await T.until(() => $id('newcode-dialog').open, 'frågan om att byta kod');
  $id('nk-ok').click();
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  T.eq($id('pw-ok').textContent, 'Spara kod');
  for (const [a, b] of [['bollen-hoppar-2026!', 'bollen-hoppar-2026!'], [PW, PW + 'x']]) {
    $id('pw-1').value = a; $id('pw-2').value = b; $id('pw-ok').click();
    T.ok($id('pw-dialog').open && $id('pw-error').textContent, 'fel visas, dialogen öppen');
  }
  $id('pw-cancel').click(); await T.wait(50);
  T.ok(!$id('pw-dialog').open, 'dialogen stängdes');
  T.eq(savedPwd(), before, 'koden ändrades');
});
T.test('backup-fil: sparade koden → bekräftelse direkt → ersätter, med ångra', async () => {
  T.ok(encFile, 'krypterad fil från tidigare test');
  const before = stored();
  const input = pickFile([encFile], 'vad-som-helst.bin', 'image/png');
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  T.ok(!$id('pw-dialog').open, 'frågade efter lösenord');
  T.eq(input.value, '', 'filväljaren nollställdes inte');
  T.ok($id('imp-sum').textContent.includes('sparade lösenordet'), 'upplåst med sparade koden');
  $id('imp-ok').click();
  await T.until(() => norm(stored()) === norm(before), 'importen ändrade datan');
  T.ok(document.querySelector('#snackbar:not([hidden])'), 'ångra-snackbar');
});
T.test('backup-fil: annan kod → lösenord, fel lösenord ändrar inget, Avbryt ändrar inget', async () => {
  const before = localStorage.getItem('bb.data'), pwd = savedPwd();
  $id('import-error').textContent = '';
  pickFile([otherFile]);
  await T.real(T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog'));
  T.ok($id('pw-2-row').hidden && !$id('pw-show-row').hidden, 'bara ett fält vid import, Visa lösenord finns');
  T.ok(/sparade lösenordet passade inte/.test($id('pw-text').textContent), 'säger att sparade koden inte passade');
  $id('pw-1').value = 'Fel2026!x'; $id('pw-ok').click();
  await T.real(T.until(() => /Fel lösenord eller skadad fil/.test($id('pw-error').textContent), 'felmeddelande saknas i dialogen'));
  T.ok($id('pw-dialog').open && !$id('import-dialog').open, 'dialogen står kvar för nytt försök');
  $id('pw-cancel').click();
  await T.wait(50);
  pickFile([otherFile]);
  await T.real(T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog'));
  $id('pw-cancel').click();
  await T.wait(50);
  T.ok(!$id('import-dialog').open, 'dialog öppnades efter Avbryt');
  T.eq(localStorage.getItem('bb.data'), before);
  T.eq(savedPwd(), pwd, 'koden ändrades');
});
T.test('import: klistrad text med annan kod frågar efter lösenord, koden används sedan', async () => {
  const pwd = savedPwd();
  $id('import-text').value = otherFile;
  $id('import-btn').click();
  await T.real(T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog'));
  $id('pw-1').value = PW; $id('pw-ok').click();
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  await closeImport();
  $id('import-text').value = '';
  T.eq(savedPwd(), PW, 'koden från filen sparas');
  localStorage.setItem('bb.pwd', pwd); renderPwd();
});
T.test('backup-fil: okrypterad gammal fil läses in som förut', async () => {
  pickFile([exportText(data, isoToday())]);
  await T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog');
  T.ok(!$id('pw-dialog').open, 'lösenord krävdes för okrypterad fil');
  await closeImport();
});
T.test('backup-fil: binärfil och fel app avvisas, inget ändras', async () => {
  const before = localStorage.getItem('bb.data');
  for (const [parts, re] of [[[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff])], /teckenkodning/], [['{"app":"follow-diet-tracker","format":1,"data":{}}'], /./]]) {
    $id('import-error').textContent = '';
    pickFile(parts);
    await T.until(() => re.test($id('import-error').textContent), 'fel saknas: ' + re).catch((e) => { throw new Error(e.message + ' text=' + $id('import-error').textContent + ' dlg=' + [...document.querySelectorAll('dialog[open]')].map((d) => d.id)); });
    T.ok(!$id('import-dialog').open, 'dialog öppnades ' + re + ' text=' + $id('import-error').textContent + ' sum=' + $id('imp-sum').textContent);
  }
  T.eq(localStorage.getItem('bb.data'), before);
});
T.test('import med fel text visar fel och ändrar inget', async () => {
  const before = localStorage.getItem('bb.data');
  $id('import-error').textContent = '';
  $id('import-text').value = 'inte json';
  $id('import-btn').click();
  await T.until(() => $id('import-error').textContent.length > 0, 'felmeddelande');
  T.ok(!$id('import-dialog').open, 'ingen dialog');
  T.eq(localStorage.getItem('bb.data'), before);
});
T.test('elak text visas som text, inga img i sidan', () => { T.eq(document.querySelectorAll('main img:not(.shot)').length, 0); });
T.test('Hjälp: 13 avsnitt (som rubrikerna i docs/MANUAL.md), alla bilder laddas', async () => {
  const help = document.querySelector('#tab-settings .help');
  T.eq(help.querySelectorAll('details').length, 13);
  const imgs = [...help.querySelectorAll('img.shot')];
  T.eq(imgs.length, 2);   // installationsbilderna (Android, iPhone)
  showTab('settings', false);   // loading="lazy": the pictures load only when the tab is shown
  for (let d = help.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;   // Hjälp ligger i hopfällda kort
  help.querySelectorAll('details').forEach((d) => { d.open = true; });
  imgs.forEach((i) => i.scrollIntoView());
  try { await T.until(() => imgs.every((i) => i.complete && i.naturalWidth > 0), 'en bild laddades inte'); } finally { showTab('month', false); }
});

T.test('Radera all data: ligger sist i Data, Avbryt ändrar inget, Radera tömmer', async () => {
  const btn = $id('reset');
  T.ok(btn.closest('#data-card'), 'knappen ligger i kortet Data');
  const before = localStorage.getItem('bb.data');
  const dlg = $id('confirm-dialog');
  btn.click(); T.ok(dlg.open, 'bekräftelsedialog');
  dlg.querySelector('[value="cancel"]').click(); await T.wait();
  T.ok(!dlg.open, 'Avbryt stängde inte');
  T.eq(localStorage.getItem('bb.data'), before, 'Avbryt ändrade data');
  btn.click(); $id('cd-ok').click();
  await T.until(() => !stored().accounts.length, 'datan raderades inte');
});
T.test('Lösenordsgenerator: fyller båda fälten, Kopiera bara för genererat lösenord (U5)', async () => {
  const $id = (id) => document.getElementById(id);
  const done = Backup.askPassword('export');
  T.ok($id('pw-copy').disabled && $id('pw-user').autocomplete === 'username', 'Kopiera avstängd före generering');
  $id('pw-gen').click();
  const pwd = $id('pw-1').value;
  T.ok(/^([A-Za-z2-9]{4}-){3}[A-Za-z2-9]{4}$/.test(pwd) && pwd === $id('pw-2').value && $id('pw-show').checked, 'båda fälten ifyllda och synliga');
  T.ok(!$id('pw-preview').hidden && !$id('pw-copy').hidden && !$id('pw-copy').disabled, 'förhandsvisning och Kopiera');
  $id('pw-1').value += 'x'; $id('pw-1').dispatchEvent(new Event('input'));
  T.ok($id('pw-copy').disabled, 'Kopiera av när lösenordet ändras för hand');
  $id('pw-cancel').click();
  T.eq(await done, null);
  T.eq([$id('pw-1').value, $id('pw-preview').children.length], ['', 0], 'fält och förhandsvisning töms');
});
T.test('bakåt går tillbaka genom besökta flikar (v0.13)', async () => {
  const nav = (t) => document.querySelector(`#nav button[data-tab="${t}"]`).click();
  const shown = () => document.querySelector('.tab:not([hidden])')?.id;
  nav('month'); nav('stats'); nav('settings');
  T.eq([shown(), location.hash], ['tab-settings', '#settings']);
  history.back();
  await T.until(() => shown() === 'tab-stats', 'bakåt visar Översikt');
  history.back();
  await T.until(() => shown() === 'tab-month', 'bakåt igen visar Månad');
});
