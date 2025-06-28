// public/sw.js

// This event is fired when the service worker is installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event fired.');
  // The skipWaiting() method allows this service worker to activate
  // as soon as it's finished installing.
  self.skipWaiting();
});

// This event is fired when the service worker is activated.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event fired.');
  // The clients.claim() method allows an active service worker to set itself
  // as the controller for all clients within its scope.
  event.waitUntil(self.clients.claim());
});

// This is the core logic for handling notification clicks.
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.', event.notification);

  // Close the notification pop-up.
  event.notification.close();

  // Retrieve the URL from the notification's data payload.
  // Fallback to the root if no URL is provided.
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  // This function searches for an existing window/tab with the app's URL
  // and focuses it if found. If not, it opens a new one.
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window for the app is already open, focus it and navigate to the URL.
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          console.log('[Service Worker] Found an existing client, focusing and navigating.');
          // Navigate the existing client to the correct URL before focusing.
          if (client.navigate) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // If no window is found, open a new one to the correct URL.
      console.log('[Service Worker] No existing client found, opening a new one to:', urlToOpen);
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
