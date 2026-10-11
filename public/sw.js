// Cadence's service worker. It gives the installed app an offline page and nothing more: it never stores pages, habits
// or anything else from your account. Registered from src/components/service-worker-register. Change VERSION whenever
// offline.html changes, so the new copy replaces the stored one.
const VERSION = 'v1';
const CACHE = `cadence-offline-${VERSION}`;
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => {
        return cache.add(OFFLINE_PAGE);
      })
      .then(() => {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => {
              return key.startsWith('cadence-') && key !== CACHE;
            })
            .map(key => {
              return caches.delete(key);
            }),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Pages go to the network as usual; only when the network itself fails do people get the offline page.
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(OFFLINE_PAGE);
    }),
  );
});
