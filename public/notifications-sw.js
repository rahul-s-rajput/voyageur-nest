/* global self */
// Simple service worker for Web Push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Handle incoming push messages
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Notification';
    const options = {
      body: data.message || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      tag: data.tag || undefined,
      requireInteraction: true,
      renotify: true,
      timestamp: Date.now()
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (_) {
    // ignore
  }
});

// Handle clicks on notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});



