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
T.test('export → import via kortet Data, med ångra', async () => {
  $id('export-btn').click();
  const txt = $id('export-text').value;
  T.ok(txt.startsWith('{'), 'exporttext');
  const before = stored();
  $id('import-text').value = txt.replace('"Buffert"', '"Buffert 2"');
  $id('import-btn').click();
  T.ok($id('import-dialog').open, 'bekräftelsedialog');
  T.ok($id('imp-sum').textContent.includes('sparkonton'), 'sammanfattning');
  $id('imp-ok').click();
  await T.until(() => stored().accounts.some((a) => a.name === 'Buffert 2'), 'importen sparades inte');
  $id('snack-action').click();
  await T.until(() => JSON.stringify(stored()) === JSON.stringify(before), 'ångra återställde inte');
});
T.test('backup-fil: Spara laddar ner budget-buddy-datum.txt (reserv utan värd)', async () => {
  let saved = null;
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { saved = { href: this.href, name: this.download }; };
  try { $id('backup-save').click(); await T.until(() => saved, 'ingen nedladdning'); }
  finally { HTMLAnchorElement.prototype.click = realClick; }
  T.ok(/^budget-buddy-\d{4}-\d{2}-\d{2}\.txt$/.test(saved.name), 'filnamn ' + saved.name);
  T.ok(saved.href.startsWith('blob:'), 'blob-länk');
});
T.test('backup-fil: läs in fil → bekräftelse → ersätter, med ångra', async () => {
  $id('export-btn').click();
  const before = stored();
  const txt = $id('export-text').value.replace('"Buffert"', '"Buffert fil"');
  const input = $id('import-file');
  const dt = new DataTransfer(); dt.items.add(new File([txt], 'vad-som-helst.bin', { type: 'image/png' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await T.until(() => $id('import-dialog').open, 'ingen bekräftelsedialog');
  T.eq(input.value, '', 'filväljaren nollställdes inte');
  $id('imp-ok').click();
  await T.until(() => stored().accounts.some((a) => a.name === 'Buffert fil'), 'importen sparades inte');
  $id('snack-action').click();
  await T.until(() => JSON.stringify(stored()) === JSON.stringify(before), 'ångra återställde inte');
});
T.test('backup-fil: binärfil och fel app avvisas, inget ändras', async () => {
  const before = localStorage.getItem('bb.data');
  const input = $id('import-file');
  for (const [parts, re] of [[[new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff])], /teckenkodning/], [['{"app":"follow-diet-tracker","format":1,"data":{}}'], /./]]) {
    $id('import-error').textContent = '';
    const dt = new DataTransfer(); dt.items.add(new File(parts, 'x.txt'));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await T.until(() => re.test($id('import-error').textContent), 'fel saknas: ' + re);
    T.ok(!$id('import-dialog').open, 'dialog öppnades');
  }
  T.eq(localStorage.getItem('bb.data'), before);
});T.test('import med fel text visar fel och ändrar inget', () => {
  const before = localStorage.getItem('bb.data');
  $id('import-text').value = 'inte json';
  $id('import-btn').click();
  T.ok($id('import-error').textContent.length > 0, 'felmeddelande');
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