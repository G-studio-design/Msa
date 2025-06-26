// public/sw.js

// This event listener is for handling push notifications from a server.
// While not used for the self-triggered notifications, it's good practice to have.
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Default Title', body: 'Default body' };
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/msarch-logo.png'
  });
});

// This is the important listener for when a user clicks on a notification.
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // This logic attempts to focus an existing tab or open a new one.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a window for this origin is already open, focus it.
      for (const client of clientList) {
        if (client.url === self.location.origin + '/dashboard' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
