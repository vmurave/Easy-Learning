// Easy Learning — service worker
//
// Responsibilities:
//   1. Minimal offline cache for the app shell.
//   2. Handle incoming Web Push messages (display localized reminders).
//   3. Handle notification clicks (focus or open the app).
//
// Scheduled-notification mechanism: the Cloudflare Worker backend
// (worker/src/worker.js) fires an empty Web Push at the user's local 9:00,
// 17:00, and 21:00. This service worker receives the push event and shows
// a notification whose title/body are read from IndexedDB — the page
// writes the latest localized strings there on every language switch and
// on reminder enable.

'use strict';

// Bumping this string busts the install cache for all visitors. Bump it
// whenever the app shell (HTML/CSS/JS) changes in a way that needs to
// reach existing users immediately — e.g. CSP/header changes or critical
// bug fixes — instead of waiting for natural cache expiry.
const CACHE_VERSION = 'el20-v12';
const APP_SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ─── Install: pre-cache the app shell ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => { /* tolerate missing optional files */ })
    )
  );
  self.skipWaiting();
});

// ─── Activate: clean up old cache versions ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// ─── Fetch: cache-first for app shell, network-first for everything else ───
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (req.mode === 'navigate' ||
            /\.(html|css|js|png|svg|webmanifest|json)$/.test(url.pathname))) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline and not cached');
      });
    })
  );
});

// ─── Push: show the reminder notification ───────────────────────────────────
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // Page writes the latest locale strings to IDB on toggle / lang switch.
    let strs = null;
    try { strs = await idbGet('reminderStrings'); } catch (_) { /* fall back */ }
    const title = (strs && strs.title) || '📚 Time to learn!';
    const body  = (strs && strs.body)  || 'Open Easy Learning and review your vocabulary.';
    const url   = (strs && strs.url)   || './index.html';

    await self.registration.showNotification(title, {
      body,
      icon:    'icons/icon-192.png',
      badge:   'icons/icon-192.png',
      tag:     'study-reminder',
      // Re-using the same tag replaces any earlier reminder so the user
      // sees one current notification, not a stack of three.
      renotify: true,
      data:    { url },
    });
  })());
});

// ─── Notification click: focus or open the app ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.registration.scope) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});

// ─── Page-to-SW messaging (for ping / future extensions) ───────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'PING') {
    event.source && event.source.postMessage({ type: 'PONG' });
  }
});

// ─── IndexedDB helpers ──────────────────────────────────────────────────────
// Used to read the locale-specific reminder strings written by the page.

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('easy-learning', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(key) {
  return idbOpen().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const r  = tx.objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  }));
}
