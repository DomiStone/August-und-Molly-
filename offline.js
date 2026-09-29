"use strict";
// Local static files only. No accounts, telemetry or external requests.
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener("load", () => {
    let requestedUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (requestedUpdate) location.reload();
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(registration => {
      const showUpdate = () => { $("#update-game").hidden = !registration.waiting; };
      showUpdate();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", showUpdate);
      });
      $("#update-game").addEventListener("click", () => {
        if (!registration.waiting) return;
        saveCompanions();
        setPause(true);
        requestedUpdate = true;
        registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
      });
    }).catch(() => {
      // The game still works normally if the browser disallows offline storage.
    });
  });
}
