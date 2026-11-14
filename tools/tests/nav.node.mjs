// Node-tester (node:test) för nav.js – den rena Bakåt-logiken. Körs av tools/test.ps1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const Nav = createRequire(import.meta.url)('../../nav.js');

test('bakåt: en öppen ruta stängs, sedan flikbyte', () => {
  const n = Nav.create();
  assert.equal(Nav.opened(n, 'item-dialog'), true);
  assert.equal(Nav.opened(n, 'item-dialog'), false, 'samma ruta två gånger: ett steg');
  assert.equal(Nav.popped(n), 'item-dialog');
  assert.equal(Nav.closed(n, 'item-dialog'), false, 'stängd av Bakåt: inget eget steg tillbaka');
  assert.equal(Nav.flush(n), 0);
  assert.equal(Nav.popped(n), null);
});
test('bakåt: Spara/Avbryt går tillbaka själv och nästa popstate ignoreras', () => {
  const n = Nav.create();
  Nav.opened(n, 'row-dialog');
  assert.equal(Nav.closed(n, 'row-dialog'), true);
  assert.equal(Nav.flush(n), 1);
  assert.equal(Nav.popped(n), 'ignore');
  assert.equal(Nav.popped(n), null);
});
test('bakåt: markeringsläge med ruta ovanpå – översta först, båda på en gång tar två steg', () => {
  const n = Nav.create();
  Nav.opened(n, 'sel'); Nav.opened(n, 'end-dialog');
  assert.equal(Nav.depth(n), 2);
  assert.equal(Nav.popped(n), 'end-dialog'); Nav.closed(n, 'end-dialog');
  assert.equal(Nav.popped(n), 'sel'); Nav.closed(n, 'sel');
  assert.equal(Nav.depth(n), 0);
  Nav.opened(n, 'sel'); Nav.opened(n, 'end-dialog');
  Nav.closed(n, 'sel'); Nav.closed(n, 'end-dialog');   // Avsluta: rutan och läget stängs i samma tryck
  assert.equal(Nav.flush(n), 2);
  assert.equal(Nav.popped(n), 'ignore', 'history.go(-2) ger en popstate');
  assert.equal(Nav.popped(n), null);
});
test('bakåt: flikbyte släpper lagren', () => {
  const n = Nav.create();
  Nav.opened(n, 'sel'); Nav.reset(n);
  assert.equal(Nav.depth(n), 0); assert.equal(Nav.closed(n, 'sel'), false);
});
