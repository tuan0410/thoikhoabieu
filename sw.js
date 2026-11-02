'use strict';
const CACHE = 'lichhoc-shell-v3';
// Only public assets belong here. Never cache API responses or account data.
const SHELL = [
  '/', '/index.html', '/offline.html', '/style.css', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png',
  '/js/data.js', '/js/utils.js', '/js/state.js', '/js/api.js', '/js/pwa.js', '/js/mobile.js', '/js/sync.js',
  '/js/schedule.js', '/js/components.js', '/js/menu.js', '/js/theme.js', '/js/router.js',
  '/js/events.js', '/js/auth.js', '/js/app.js', '/js/views/overview.js',
  '/js/views/timetable.js', '/js/views/courses.js', '/js/views/tasks.js',
  '/js/views/exams.js', '/js/views/manage.js', '/js/views/sync.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('lichhoc-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !SHELL.includes(url.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
    return;
  }
  event.respondWith(fetch(event.request).catch(() => caches.match(url.pathname)));
});
