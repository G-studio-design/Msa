'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // We don't need to wait for the 'load' event.
      // Registering as soon as the component mounts is more reliable.
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.error('Service Worker registration failed: ', err); // Use console.error for better debugging
        }
      );
    }
  }, []);

  return null; // This component doesn't render anything
}
