// This file is designed to immediately unregister any existing service worker.
self.addEventListener('install', () => {
  // Skip over the "waiting" lifecycle state, to ensure the activate event
  // fires as soon as possible.
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Unregister the service worker immediately.
  self.registration
    .unregister()
    .then(() => {
      // Once unregistered, match all clients (open pages) and reload them
      // to ensure they are no longer controlled by the old service worker.
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
});
