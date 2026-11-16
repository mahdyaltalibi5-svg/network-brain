// Summit CRM service worker: shows lead alerts and opens the lead when one is tapped.
const BASE = '/portal'; // keep in step with lib/base.ts

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Summit CRM', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Summit CRM', {
    body: d.body || '',
    tag: d.tag,
    renotify: !!d.tag,
    requireInteraction: true,
    icon: BASE + '/icons/icon-192.png',
    badge: BASE + '/icons/icon-192.png',
    data: { url: d.url || BASE + '/now' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || BASE + '/now', self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) if (new URL(w.url).origin === self.location.origin) { await w.focus(); return w.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
