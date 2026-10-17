// Herald service worker — handles real native push notifications
// (Web Push API + VAPID) so they show up in the Android/desktop
// notification tray even when the site/PWA is closed, and deep-links
// a tap straight to the article.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push arrived from the browser's push service. The payload was sent by
// our backend via services/pushSend.js — see that file for the exact shape.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { headline: event.data ? event.data.text() : 'Herald' };
  }

  const headline = data.headline || 'Herald';
  const source = data.source || 'Herald';
  const image = data.image || null;
  const articleId = data.articleId || null;
  const priority = data.priority === 'high' ? 'high' : 'normal';
  const url = articleId ? `/article/${articleId}` : '/';

  // Collapsed state: icon, source name as the notification "app" line,
  // headline as the title, thumbnail on the right (Chrome auto-shrinks
  // `image` into a thumbnail when collapsed).
  // Expanded state: `image` renders full-width (BigPictureStyle-equivalent),
  // full headline visible, timestamp shown automatically by the OS.
  const options = {
    body: source,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: image || undefined,
    // tag + renotify: a second push about the SAME article replaces the
    // existing notification instead of stacking a duplicate.
    tag: articleId ? `herald-${articleId}` : undefined,
    renotify: !!articleId,
    requireInteraction: priority === 'high',
    vibrate: priority === 'high' ? [200, 100, 200, 100, 200] : [150],
    timestamp: Date.now(),
    data: { url, articleId, priority },
  };

  event.waitUntil(self.registration.showNotification(headline, options));
});

// Deep-link: tapping the notification focuses an already-open Herald tab
// and navigates it, or opens a new one if none exists.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
