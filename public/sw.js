// public/sw.js

// This event listener is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  // The skipWaiting() method allows this service worker to activate
  // as soon as it's finished installing.
  self.skipWaiting();
  console.log('[Service Worker] Installed');
});

// This event listener is fired when the service worker is activated.
self.addEventListener('activate', (event) => {
  // The clients.claim() method allows an active service worker to set itself
  // as the controller for all clients within its scope.
  event.waitUntil(self.clients.claim());
  console.log('[Service Worker] Activated');
});

// This event listener is fired when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification
  event.notification.close();

  // Logic to focus an existing window or open a new one
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true, // Important to find clients immediately after activation
    }).then((clientList) => {
      // If a window for the app is already open, focus it.
      for (const client of clientList) {
        // You can add more complex URL matching here if needed.
        // For now, focusing any open client is sufficient.
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one to the dashboard.
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
