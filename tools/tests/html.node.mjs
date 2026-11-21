// index.html: varje id får bara finnas en gång (2026-11-21, två dialoger delade "cd-title"). Kör: node --test tools/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('index.html har unika id:n', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dup, []);
});
