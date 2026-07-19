/* Client data cache expires hourly; static dumps refresh daily in CI */
const CACHE = 'ofwx-v4';
const DATA_MAX_AGE_MS = 60 * 60 * 1000;
const SHELL = ['./', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

function isDataRequest(url) {
  return url.pathname.includes('/data/');
}

async function putTimedResponse(request, response) {
  const headers = new Headers(response.headers);
  headers.set('x-ofwx-cached-at', String(Date.now()));
  headers.set('Cache-Control', 'max-age=3600');
  const body = await response.clone().blob();
  const timed = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  const cache = await caches.open(CACHE);
  await cache.put(request, timed);
}

async function matchFreshData(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (!cached) return null;

  const cachedAt = Number(cached.headers.get('x-ofwx-cached-at') || 0);
  if (!cachedAt || Date.now() - cachedAt > DATA_MAX_AGE_MS) {
    await cache.delete(request);
    return null;
  }
  return cached;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isDataRequest(url)) {
    event.respondWith(
      (async () => {
        try {
          // Bypass HTTP caches so reloads can see fresh dumps
          const response = await fetch(request, { cache: 'no-store' });
          if (response.ok) {
            await putTimedResponse(request, response);
          }
          return response;
        } catch {
          const fresh = await matchFreshData(request);
          if (fresh) return fresh;
          return Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    }),
  );
});
