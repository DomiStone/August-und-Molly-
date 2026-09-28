"use strict";
// Local static files only. No accounts, telemetry or external requests.
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // The game still works normally if the browser disallows offline storage.
    });
  });
}
