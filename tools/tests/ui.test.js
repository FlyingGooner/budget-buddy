// UI flow tests in dist/budget-buddy.html with tools/tests/ui-seed.json. Run: tools\test.ps1 budget-buddy
const $id = (i) => document.getElementById(i);
const stored = () => JSON.parse(localStorage.getItem('bb.data'));

T.test('appen startar och visar version', () => { T.ok(/^v\d+\.\d+\.\d+$/.test($id('version').textContent), 'versionsetikett'); });
T.test('sparkonto i USD räknas om till kronor', () => {
  T.ok($id('acc-total').textContent.includes('≈'), 'summan ska ha ≈');
  T.ok($id('acc-rates').textContent.includes('referenskurser'), 'kursrad');
});
T.test('nytt sparkonto via formuläret öppnar saldodialogen', async () => {
  $id('acc-name').value = 'Test <b>konto</b>';
  $id('acc-form').requestSubmit();
  await T.until(() => $id('acc-dialog').open, 'dialogen öppnades inte');
  T.eq($id('ad-title').textContent, 'Test <b>konto</b>');
  $id('ad-amount').value = '1 250,50';
  $id('ad-form').requestSubmit();
  await T.until(() => !$id('acc-dialog').open);
  const a = stored().accounts.find((x) => x.name === 'Test <b>konto</b>');
  T.ok(a, 'kontot sparades');
  T.eq(Object.values(a.balances)[0], 125050);
});
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
  await T.until(() => JSON.stringify(stored()) === JSON.stringify(before), 'ångra återställde inte');
});
// Backup file with password (U5, 2026-11-11). Downloads are caught at <a download> (no host in the test file).
const PW = 'Bollen2026!';
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
let encFile = null;
const closeImport = async () => { $id('import-dialog').querySelector('button[value="cancel"]').click(); await T.until(() => !$id('import-dialog').open, 'importdialogen stängdes inte'); await T.wait(50); };
T.test('backup-fil: krypterad som standard, budget-buddy-datum.txt', async () => {
  const saved = await catchDownload(async () => {
    $id('backup-save').click();
    T.ok($id('pw-dialog').open && !$id('pw-enc') && /krypterad/.test($id('pw-ok').textContent), 'lösenordsdialog utan val att spara okrypterat');
    $id('pw-show').click();
    T.eq([$id('pw-1').type, $id('pw-2').type], ['text', 'text'], 'Visa lösenord');
    $id('pw-1').value = PW; $id('pw-2').value = PW; $id('pw-ok').click();
  });
  T.ok(/^budget-buddy-\d{4}-\d{2}-\d{2}\.txt$/.test(saved.name), 'filnamn ' + saved.name);
  T.ok(saved.href.startsWith('blob:'), 'blob-länk');
  T.ok(saved.text && Backup.isEncrypted(saved.text) && !saved.text.includes('Buffert'), 'filen är krypterad');
  T.eq([$id('pw-1').value, $id('pw-2').value], ['', ''], 'lösenordsfälten töms');
  T.ok($id('pw-1').type === 'password' && !$id('pw-show').checked, 'dolt igen efter stängning');
  encFile = saved.text;
});
T.test('backup-fil: svagt eller olika lösenord sparar inget, Avbryt sparar inget', async () => {
  $id('backup-save').click();
  for (const [a, b] of [['bollen2026!', 'bollen2026!'], [PW, PW + 'x']]) {
    $id('pw-1').value = a; $id('pw-2').value = b; $id('pw-ok').click();
    T.ok($id('pw-dialog').open && $id('pw-error').textContent, 'fel visas, dialogen öppen');
  }
  let clicked = false;
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { clicked = true; };
  try { $id('pw-cancel').click(); await T.wait(50); } finally { HTMLAnchorElement.prototype.click = realClick; }
  T.ok(!$id('pw-dialog').open && !clicked, 'avbrutet utan fil');
});
T.test('backup-fil: krypterad fil → lösenord → bekräftelse → ersätter, med ångra', async () => {
  T.ok(encFile, 'krypterad fil från tidigare test');
  const before = stored();
  const input = pickFile([encFile], 'vad-som-helst.bin', 'image/png');
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  T.eq(input.value, '', 'filväljaren nollställdes inte');
  T.ok($id('pw-2-row').hidden && !$id('pw-show-row').hidden, 'bara ett fält vid import, Visa lösenord finns');
  $id('pw-1').value = PW; $id('pw-ok').click();
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  $id('imp-ok').click();
  await T.until(() => JSON.stringify(stored()) === JSON.stringify(before), 'importen ändrade datan');
  T.ok(document.querySelector('#snackbar:not([hidden])'), 'ångra-snackbar');
});
T.test('backup-fil: fel lösenord ändrar inget, Avbryt ändrar inget', async () => {
  const before = localStorage.getItem('bb.data');
  $id('import-error').textContent = '';
  pickFile([encFile]);
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-1').value = 'Fel2026!x'; $id('pw-ok').click();
  await T.real(T.until(() => /Fel lösenord eller skadad fil/.test($id('import-error').textContent), 'felmeddelande saknas'));
  T.ok(!$id('import-dialog').open, 'dialog öppnades');
  pickFile([encFile]);
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-cancel').click();
  await T.wait(50);
  T.ok(!$id('import-dialog').open, 'dialog öppnades efter Avbryt');
  T.eq(localStorage.getItem('bb.data'), before);
});
T.test('import: klistrad krypterad text frågar efter lösenord', async () => {
  $id('import-text').value = encFile;
  $id('import-btn').click();
  await T.until(() => $id('pw-dialog').open, 'ingen lösenordsdialog');
  $id('pw-1').value = PW; $id('pw-ok').click();
  await T.real(T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog'));
  await closeImport();
  $id('import-text').value = '';
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
T.test('Hjälp: 9 avsnitt, alla bilder laddas', async () => {
  const help = document.querySelector('#tab-settings .help');
  T.eq(help.querySelectorAll('details').length, 9);
  const imgs = [...help.querySelectorAll('img.shot')];
  T.eq(imgs.length, 5);
  help.querySelectorAll('details').forEach((d) => { d.open = true; });
  await T.until(() => imgs.every((i) => i.complete && i.naturalWidth > 0), 'en bild laddades inte');
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