// update-rates.mjs – uppdaterar appens inbyggda valutakurser (DEFAULT_RATES och RATES_DATE i store.js).
// Samma regler som update-rates.ps1: ECB:s referenskurser via Frankfurter (api.frankfurter.dev, gratis, ingen nyckel).
// Körs av GitHub Action rates.yml varje vardag (2026-11-17, datorn används inte längre). APPEN gör aldrig några anrop –
// kurserna blir konstanter i koden. Ändras kurserna höjs patchversionen i version.js. Skriver "changed" eller "same" sist.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NOK', 'DKK'];

const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=SEK&symbols=${CURRENCIES.join(',')}`, { signal: AbortSignal.timeout(15000) });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const r = await res.json();
const date = String(r.date);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Oväntat datum i svaret: ${date}`);
const ore = {};
for (const c of CURRENCIES) {
  const v = Number(r.rates?.[c]);
  if (!(v > 0)) throw new Error(`Kurs saknas för ${c}`);
  const o = Math.round(100 / v); // öre per 1 enhet
  if (o < 1 || o > 100000) throw new Error(`Orimlig kurs för ${c}: ${o} öre`);
  ore[c] = o;
}

const storePath = join(dir, 'store.js');
const store = readFileSync(storePath, 'utf8');
const line = 'const DEFAULT_RATES = { ' + CURRENCIES.map((c) => `${c}: ${ore[c]}`).join(', ') + ' };';
const next = store.replace(/const DEFAULT_RATES = \{[^}]*\};/, line).replace(/const RATES_DATE = '[^']*';/, `const RATES_DATE = '${date}';`);
if (next === store) { console.log(`Kurserna är redan aktuella (${date}).`); console.log('same'); process.exit(0); }
writeFileSync(storePath, next, 'utf8');

const verPath = join(dir, 'version.js');
const raw = readFileSync(verPath, 'utf8');
const m = raw.match(/APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);
if (!m) throw new Error('Hittar inte APP_VERSION i version.js');
const ver = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
writeFileSync(verPath, raw.replace(m[0], `APP_VERSION = '${ver}'`), 'utf8');

console.log(`Kurser från ${date} (ECB via Frankfurter), kr per enhet: ` + CURRENCIES.map((c) => `${c} ${(ore[c] / 100).toFixed(2)}`).join(', ') + ` – version ${ver}.`);
console.log('changed');
