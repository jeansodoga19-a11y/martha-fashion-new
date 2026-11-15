const VERSION = "v2";

const APP_CACHE = `martha-fashion-app-${VERSION}`;
const MEDIA_CACHE = `martha-fashion-media-${VERSION}`;
const STATIC_CACHE = `martha-fashion-static-${VERSION}`;

const APP_FILES = [
  "/",
  "/manifest.json",
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then(async (cache) => {
      await Promise.allSettled(
        APP_FILES.map((url) => cache.add(url))
      );
    })
  );

  self.skipWaiting();
});

// Activation
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const oldCaches = keys.filter(
        (key) =>
          key.startsWith("martha-fashion-") &&
          ![APP_CACHE, MEDIA_CACHE, STATIC_CACHE].includes(key)
      );

      await Promise.all(
        oldCaches.map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })
  );
});

// Enregistrer une ressource dans le cache
async function saveInCache(cacheName, request, response) {
  if (!response || (!response.ok && response.type !== "opaque")) {
    return;
  }

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn("Cache indisponible :", error);
  }
}

// Pages : priorité au réseau, puis au cache
async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      await saveInCache(APP_CACHE, request, response);
    }

    return response;
  } catch {
    const cachedPage = await caches.match(request);

    if (cachedPage) return cachedPage;

    if (new URL(request.url).pathname === "/") {
      const home = await caches.match("/");

      if (home) return home;
    }

    return new Response(
      "Cette page n'est pas encore disponible hors connexion.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  }
}

// Ressources statiques : priorité au cache
async function handleStatic(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);

    await saveInCache(STATIC_CACHE, request, response);

    return response;
  } catch {
    return new Response("Ressource indisponible hors connexion.", {
      status: 503,
    });
  }
}

// Photos : cache prioritaire, y compris Supabase Storage
async function handleImage(request) {
  const cached = await caches.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);

    if (response.ok || response.type === "opaque") {
      await saveInCache(MEDIA_CACHE, request, response);
    }

    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Pages HTML
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Images locales ou hébergées sur Supabase
  if (request.destination === "image") {
    event.respondWith(handleImage(request));
    return;
  }

  // Ressources statiques Next.js et icônes
  if (
    url.origin === self.location.origin &&
    (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json"
    )
  ) {
    event.respondWith(handleStatic(request));
  }
});