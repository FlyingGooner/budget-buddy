// Kör unit.test.js (T.test, T.eq, T.ok) i Node. store.js och testfilen är vanliga skript: de körs i samma globala
// scope, som i webbläsaren. Exit-kod 1 vid fel. Användning: node tools/node-unit.mjs tools/tests/unit.test.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const queue = [];
globalThis.T = {
  test: (name, fn) => queue.push([name, fn]),
  eq: (a, b, msg) => assert.deepStrictEqual(a, b, msg),
  ok: (v, msg) => assert.ok(v, msg),
  wait: () => Promise.resolve(),
};
const file = process.argv[2];
if (!file) { console.error('Ange en testfil, t.ex. tools/tests/unit.test.js'); process.exit(2); }
for (const f of [resolve(root, 'store.js'), resolve(file)]) vm.runInThisContext(readFileSync(f, 'utf8'), { filename: f });
let pass = 0, fail = 0;
for (const [name, fn] of queue) {
  try { await fn(); pass++; } catch (e) { fail++; console.log(`FAIL ${name}\n  ${e.message.split('\n').join('\n  ')}`); }
}
console.log(`${file}: ${pass} ok, ${fail} fel`);
process.exit(fail ? 1 : 0);
