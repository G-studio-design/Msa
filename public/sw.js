// A "kill-switch" service worker to unregister previous service workers.
self.addEventListener('install', () => {
  // Skip waiting, allowing the new service worker to activate immediately.
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Unregister this service worker and all other service workers.
  self.registration.unregister()
    .then(() => {
      // Once unregistered, reload all clients to ensure they get the latest version without the service worker.
      return self.clients.matchAll();
    })
    .then(clients => {
      clients.forEach(client => {
        if (client.url && 'navigate' in client) {
          client.navigate(client.url);
        }
      });
    });
});
