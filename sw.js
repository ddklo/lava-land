// ─── SERVICE WORKER ─────────────────────────────────────────────
// Cache-first strategy for fully offline play.
// Bump VERSION on every deploy to invalidate stale caches.
const VERSION = '1.7.4';
const CACHE_NAME = 'lava-land-v' + VERSION;
const ASSETS = [
  'index.html',
  'css/theme.css',
  'css/style.css',
  'images/background.svg',
  'images/background-ocean.svg',
  'images/background-forest.svg',
  'images/icon-192.png',
  'images/icon-512.png',
  'manifest.json',
  'js/config.js',
  'js/i18n.js',
  'js/state.js',
  'js/timers.js',
  'js/audio.js',
  'js/soundtracks.js',
  'js/pathgen.js',
  'js/platforms.js',
  'js/player.js',
  'js/drawing.js',
  'js/hud.js',
  'js/effects.js',
  'js/scenes.js',
  'js/scoring.js',
  'js/logic.js',
  'js/input.js',
  'js/loop.js',
  'js/menu.js',
  'js/init.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
