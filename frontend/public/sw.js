// Kill switch: este SW elimina todos los caches y se desregistra.
// Reemplaza el SW anterior que causaba conflictos con chrome-extensions
// y servía versiones cacheadas desactualizadas.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => caches.delete(name)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => self.registration.unregister())
  );
});
