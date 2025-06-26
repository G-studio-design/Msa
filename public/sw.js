
// public/sw.js

// On install, you might want to cache some static assets.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Placeholder for caching logic if needed in the future.
});

// On activate, clean up old caches and take control.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // This ensures the new service worker takes control of the page immediately.
  event.waitUntil(self.clients.claim());
});

/**
 * Handles the user clicking on a notification.
 * This is crucial for mobile device compatibility.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked.');
  
  // Close the notification pop-up
  event.notification.close();

  // Try to focus an existing window/tab of the app, or open a new one.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for this app is already open, focus it.
      if (clientList.length > 0) {
        let client = clientList[0];
        // Try to find a focused client first
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Otherwise, open a new window.
      return clients.openWindow('/');
    })
  );
});

/**
 * Generic fetch handler. Can be expanded for offline support later.
 */
self.addEventListener('fetch', (event) => {
  // For now, just use the network.
  event.respondWith(fetch(event.request));
});
