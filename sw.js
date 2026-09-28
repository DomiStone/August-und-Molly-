"use strict";
const CACHE = "august-molly-stable-feeding-v1";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "game.js",
  "movement.js",
  "minigames.js",
  "food-view.js",
  "feeding.js",
  "offline.js",
  "assets/august.png",
  "assets/molly.png",
  "assets/enclosure-large.webp",
  "assets/august-walk.webp",
  "assets/molly-walk.webp",
  "assets/august-scratch.webp",
  "assets/molly-scratch.webp",
  "assets/august-peek.webp",
  "assets/molly-peek.webp",
  "assets/august-dance.webp",
  "assets/molly-dance.webp",
  "assets/hurdle.webp",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("august-molly-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  // Restrict this worker to explicitly listed game assets within its scope.
  const known = FILES.some(
    (path) => new URL(path, self.registration.scope).href === url.href,
  );
  if (!known) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.match(event.request).then((hit) => hit || fetch(event.request)),
      ),
  );
});
