"use strict";
const CACHE = "august-molly-puzzle-maze-v5";
const FILES = [
  "./",
  "index.html",
  "index.html?v=puzzle-maze-v5",
  "style.css?v=puzzle-maze-v5",
  "game.js?v=puzzle-maze-v5",
  "movement.js?v=puzzle-maze-v5",
  "minigames.js?v=puzzle-maze-v5",
  "food-view.js?v=puzzle-maze-v5",
  "feeding.js?v=puzzle-maze-v5",
  "companions.js?v=puzzle-maze-v5",
  "world.js?v=puzzle-maze-v5",
  "tunnel-game.js?v=puzzle-maze-v5",
  "offline.js?v=puzzle-maze-v5",
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
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map(path => new Request(path, { cache: "reload" })))));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
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
