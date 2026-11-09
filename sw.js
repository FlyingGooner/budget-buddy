// Service worker: cache-first for the app's own files (offline + install). Cross-origin requests pass straight through.
// Deletes only its own 'bb-' caches: the apps share an origin on GitHub Pages.
importScripts('version.js');
const CACHE_VERSION = 'bb-' + self.APP_VERSION;
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'views/month.js', 'views/overview.js', 'views/stats.js', 'views/accounts.js', 'views/items.js',
  'views/settings.js', 'main.js', 'store.js', 'version.js', 'backup.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'docs/manual/manad.png', 'docs/manual/poster.png', 'docs/manual/oversikt.png', 'docs/manual/sparkonton.png', 'docs/manual/data.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('bb-') && k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
