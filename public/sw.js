// public/sw.js
'use strict';

/**
 * A simple, robust service worker for handling client-side notifications.
 */

// On install, activate immediately.
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing.');
  // Activate the new service worker as soon as it's installed.
  self.skipWaiting();
});

// On activation, take control of all open pages.
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated.');
  // Allows the activated service worker to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks.
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.', event);
  
  // Close the notification pop-up.
  event.notification.close();

  // Focus the existing app window/tab or open a new one.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's an open window for this app, focus it.
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
