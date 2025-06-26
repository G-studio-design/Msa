// public/sw.js

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Ensure the new service worker takes control of the page immediately.
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked.');
  event.notification.close();

  // This code attempts to focus on an existing window/tab for your app,
  // or open a new one if none exists.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for the app is already open, focus it.
      for (const client of clientList) {
        if ('focus' in client) {
          // You could add logic here to check if the client's URL matches
          // a specific path if you want more control.
          return client.focus();
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        // Change '/dashboard' to your app's main page if different
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// The fetch event listener is commented out as we are not implementing
// a full offline-first strategy at this moment. It can be added later.
// self.addEventListener('fetch', (event) => { ... });
