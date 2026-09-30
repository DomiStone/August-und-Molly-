"use strict";

// Companion activities share the movement clock and own their arrival callback.
// Only durable, validated data is saved: never timers, callbacks or DOM state.
const COMPANION_SAVE_KEY = "august-molly:companions:v1";
const personalities = {
  august: { trait: "Neugieriger Entdecker", favorite: "Karotte", icon: "🥕" },
  molly: { trait: "Gemütliche Genießerin", favorite: "Gurke", icon: "🥒" },
};
const MOMENTS = {
  favorite: { icon: "🥕", title: "Lieblingsbissen", hint: "Ein Lieblingsfutter ganz aufessen" },
  cuddle: { icon: "💕", title: "Kuschelzeit", hint: "Sanft streicheln" },
  rest: { icon: "🌙", title: "Traumstunde", hint: "Ein Nickerchen beenden" },
  ball: { icon: "🌿", title: "Ballfreunde", hint: "Mit dem Weidenball spielen" },
  search: { icon: "🔎", title: "Spürnasen", hint: "Drei Leckereien finden" },
  jump: { icon: "⭐", title: "Kleine Hüpfer", hint: "Das Hüpfspiel schaffen" },
  dance: { icon: "🎵", title: "Wackeltanz", hint: "Das Tanzspiel schaffen" },
  clean: { icon: "🧹", title: "Frisch gemacht", hint: "Drei kleine Hinterlassenschaften entfernen" },
  friends: { icon: "🐾", title: "Beste Freunde", hint: "Gemeinsam das Gehege erkunden" },
  tunnel: { icon: "🍀", title: "Tunnelspürnasen", hint: "Den Weg durchs Tunnelspiel finden" },
  baby: { icon: "🐹", title: "Willkommen, Fips", hint: "Ein Jungtier im Gehege willkommen heißen" },
};
const companionActions = new Map();
const ballPlaces = [{ x: 46, y: 76 }, { x: 33, y: 52 }, { x: 65, y: 55 }];
const bowlPlace = { x: 93, y: 57 };
const memories = new Set();
let ballPlace = 0, flowers = false, storageAvailable = true;
let companionUiClock = 0, companionSaveClock = 0, noticeClock = 0;
let nextCozyEvent = 35;
let pendingWorldSave = null;

function boundedNeed(value, fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 35, 100) : fallback;
}

function restoreCompanions() {
  for (const p of Object.values(pets)) { p.energy = 85; p.enrichment = 80; }
  try {
    const raw = localStorage.getItem(COMPANION_SAVE_KEY);
    if (!raw) return;
    // Avoid parsing unexpectedly large or unrelated values.
    if (raw.length > 12000) return;
    const saved = JSON.parse(raw);
    if (!saved || ![1, 2].includes(saved.version)) return;
    pendingWorldSave = saved.world || null;
    for (const [id, p] of Object.entries(pets)) {
      for (const key of ["food", "water", "joy", "energy", "enrichment"])
        p[key] = boundedNeed(saved.pets?.[id]?.[key], p[key]);
    }
    if (Array.isArray(saved.memories)) {
      for (const key of saved.memories)
        if (typeof key === "string" && Object.prototype.hasOwnProperty.call(MOMENTS, key)) memories.add(key);
    }
    if (Number.isInteger(saved.ballPlace) && ballPlaces[saved.ballPlace])
      ballPlace = saved.ballPlace;
    flowers = saved.flowers === true && memories.size >= 3;
    if (typeof saved.water === "number" && Number.isFinite(saved.water)) water = clamp(saved.water, 0, 100);
  } catch {
    // Corrupt JSON is recoverable; a blocked storage API also stays non-fatal.
  }
}

function saveCompanions() {
  try {
    const snapshot = { version: 2, pets: {}, water, memories: [...memories], ballPlace, flowers,
      world: typeof worldSnapshot === "function" ? worldSnapshot() : pendingWorldSave };
    for (const [id, p] of Object.entries(pets)) {
      snapshot.pets[id] = {};
      for (const key of ["food", "water", "joy", "energy", "enrichment"])
        snapshot.pets[id][key] = Math.round(boundedNeed(p[key], 75));
    }
    localStorage.setItem(COMPANION_SAVE_KEY, JSON.stringify(snapshot));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  const status = $("#save-status");
  status.textContent = storageAvailable
    ? "Nur auf diesem Gerät gespeichert. Keine Nachteile, wenn ihr eine Pause macht."
    : "Speichern ist hier nicht verfügbar. Ihr könnt trotzdem spielen; nach dem Schließen beginnt eine neue Runde.";
}

function cozyNotice(text) {
  $("#cozy-notice").textContent = text;
  $("#cozy-notice").hidden = false;
  noticeClock = 5;
}

function rememberMoment(key) {
  if (!Object.prototype.hasOwnProperty.call(MOMENTS, key) || memories.has(key)) return;
  memories.add(key);
  cozyNotice(memories.size === 3
    ? "🌼 Drei Erinnerungen! Eure Blumen-Girlande wartet im Pflegealbum."
    : `${MOMENTS[key].icon} Neuer Album-Sticker: ${MOMENTS[key].title}`);
  refreshCompanionUi();
  saveCompanions();
}

function foodMemory(id, type) {
  if (personalities[id].favorite === type) {
    pets[id].joy = Math.min(100, pets[id].joy + 4);
    effect(id, "💛");
    tone("favorite");
    if (memories.has("favorite")) cozyNotice(`${pets[id].name} liebt ${type}!`);
    rememberMoment("favorite");
  }
  update();
  saveCompanions();
}

function moodFor(id) {
  const p = pets[id], w = walkers[id];
  if (w.mode === "house-sleep") return "🏠 Schläft im Lieblingsfenster";
  if (w.mode === "in-tunnel") return "🍀 Auf kleiner Tunnelreise";
  if (w.mode === "napping") return "🌙 Träumt von der Wiese";
  if (w.mode === "drinking") return "💧 Genießt einen Schluck";
  if (w.mode === "playing") return "🌿 Hat den Ball entdeckt";
  if (feedings.has(id)) return "🥬 Freut sich aufs Knabbern";
  if (p.energy < 60) return "💤 Bereit für eine Kuschelpause";
  if (p.water < 55) return "💧 Mag einen frischen Schluck";
  if (p.food < 55) return "🌾 Lust auf etwas zum Knabbern";
  if (p.enrichment < 60) return "🌿 Bereit für ein kleines Abenteuer";
  if (p.joy > 85) return "💛 Fühlt sich rundum wohl";
  return id === "august" ? "🌱 Neugierig auf kleine Abenteuer" : "🍃 Entspannt und zufrieden";
}

function buildCompanionUi() {
  for (const [id, p] of Object.entries(pets)) {
    const card = document.createElement("section");
    card.className = "companion-card";
    // All interpolated strings here are project-owned constants, never saved text.
    card.innerHTML = `<div class="companion-heading"><img src="assets/${id}.png" alt=""><div><h2>${p.name}</h2><small>${personalities[id].trait} · liebt ${personalities[id].icon}</small></div></div><p id="mood-${id}"></p><div class="cozy-needs"></div>`;
    for (const [key, label] of Object.entries({ food: "Satt", water: "Versorgt", joy: "Froh", energy: "Ausgeruht", enrichment: "Beschäftigt" })) {
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      const meter = document.createElement("meter");
      meter.id = `cozy-${id}-${key}`;
      meter.min = 0;
      meter.max = 100;
      meter.setAttribute("aria-label", `${p.name}: ${label}`);
      labelEl.append(meter);
      card.querySelector(".cozy-needs").append(labelEl);
    }
    $("#companion-cards").append(card);
  }
  for (const [key, item] of Object.entries(MOMENTS)) {
    const sticker = document.createElement("div");
    sticker.id = "moment-" + key;
    sticker.className = "album-sticker";
    sticker.innerHTML = `<span aria-hidden="true">${item.icon}</span><strong>${item.title}</strong><small>${item.hint}</small>`;
    $("#album-stickers").append(sticker);
  }
}

function refreshCompanionUi() {
  for (const id of Object.keys(pets)) {
    const mood = moodFor(id);
    $("#select-" + id).title = `${pets[id].name}: ${mood}`;
    $("#mood-" + id).textContent = mood;
    for (const key of ["food", "water", "joy", "energy", "enrichment"])
      $(`#cozy-${id}-${key}`).value = pets[id][key];
  }
  $("#companion-selection").textContent = "Für " + selected.map(id => pets[id].name).join(" & ");
  $("#album-count").textContent = `${memories.size} / ${Object.keys(MOMENTS).length}`;
  for (const key of Object.keys(MOMENTS)) {
    $("#moment-" + key).classList.toggle("collected", memories.has(key));
    $("#moment-" + key).setAttribute("aria-label", `${MOMENTS[key].title}: ${memories.has(key) ? "gesammelt" : MOMENTS[key].hint}`);
  }
  $("#toggle-flowers").hidden = memories.size < 3;
  $("#toggle-flowers").setAttribute("aria-pressed", flowers);
  $("#toggle-flowers").textContent = flowers ? "🌼 Girlande abnehmen" : "🌼 Blumen-Girlande aufhängen";
  $("#flower-garland").hidden = !flowers;
  if (typeof refreshWorldUi === "function") refreshWorldUi();
}

function closeCompanionPanel(focus = true) {
  const wasOpen = !$("#companion-panel").hidden;
  $("#companion-panel").hidden = true;
  $("#companion-menu").setAttribute("aria-expanded", false);
  if (focus && wasOpen) $("#companion-menu").focus();
}

function hasCompanionAction(id) { return companionActions.has(id); }

function cancelCompanionAction(id) {
  const action = companionActions.get(id);
  if (!action) return;
  companionActions.delete(id);
  const w = walkers[id];
  w.arrival = null;
  w.el.classList.remove("napping", "playing", "drinking");
  w.el.style.removeProperty("--cozy-motion");
  w.el.style.removeProperty("--drink-nod");
  w.mode = "sniff";
  w.wait = 3;
  w.nextNatural = simulationTime + 30 + Math.random() * 20;
}

function cancelAllCompanionActions() {
  for (const id of [...companionActions.keys()]) cancelCompanionAction(id);
}

function activityDestination(id, kind) {
  if (kind === "drinking" && typeof bottleDestination === "function") return bottleDestination(id);
  if (kind === "napping") return { x: id === "august" ? 30 : 69, y: id === "august" ? 64 : 72, direction: id === "august" ? 1 : -1 };
  const source = kind === "playing" ? ballPlaces[ballPlace] : bowlPlace;
  const side = id === "august" ? -1 : 1;
  const objectWidth = $(kind === "playing" ? "#willow-ball" : "#drink-bowl").offsetWidth;
  let y = source.y + 5, g;
  // Account for perspective changing with the animal's final vertical position.
  for (let i = 0; i < 4; i++) {
    g = feedingGeometry(walkers[id], y);
    const surfaceOffset = kind === "drinking" ? objectWidth * 0.1 : 0;
    y = clamp(source.y - (g.mouthY + surfaceOffset) / g.height * 100, 42, 80);
  }
  return {
    x: clamp(source.x + side * (g.mouthX + objectWidth * 0.24) / g.width * 100, 17, 83),
    y,
    direction: -side,
  };
}

function startCompanionAction(id, kind) {
  if (paused || miniGame || searchActive || !["napping", "playing", "drinking"].includes(kind)) return;
  if (companionActions.get(id)?.kind === kind) return;
  if (kind === "drinking" && water <= 0) { cozyNotice("Die Tränke ist leer. Mit 💧 wieder auffüllen."); return; }
  if (kind === "drinking" && [...companionActions.values()].some(a => a.id !== id && a.kind === "drinking")) {
    // Wait away from the nozzle, not with two overlapping faces at one opening.
    sendPet(id, id === "august" ? 32 : 43, 76);
    companionActions.set(id, { id, kind, phase: "waiting", elapsed: 0, duration: 5 });
    return;
  }
  const target = activityDestination(id, kind);
  sendPet(id, target.x, target.y, () => {
    const action = companionActions.get(id);
    if (!action) return;
    const w = walkers[id];
    resetAppearance(w);
    w.x = target.x;
    w.y = target.y;
    w.direction = target.direction;
    w.vx = w.vy = 0;
    w.mode = kind;
    w.el.classList.add(kind);
    action.phase = "active";
    tone(kind === "napping" ? "sleepy" : kind === "drinking" ? "water" : "curious");
  });
  companionActions.set(id, { id, kind, target, phase: "approaching", elapsed: 0, duration: kind === "napping" ? 16 : 5 });
  if (kind === "drinking") walkers[id].tx = target.x;
}

function finishCompanionAction(action) {
  const { id, kind } = action;
  cancelCompanionAction(id);
  if (kind === "drinking") {
    effect(id, "💧");
    sendPet(id, id === "august" ? 43 : 80, 73);
  } else {
    if (kind === "playing") pets[id].enrichment = Math.min(100, pets[id].enrichment + 20);
    pets[id].joy = Math.min(100, pets[id].joy + (kind === "playing" ? 12 : 5));
    effect(id, kind === "playing" ? "🌿" : "💛");
    rememberMoment(kind === "playing" ? "ball" : "rest");
  }
  update();
  saveCompanions();
}

function useCompanionActivity(kind) {
  if (paused) return;
  endMiniGame();
  stopSearch();
  closeFood();
  hideGames();
  closeCompanionPanel();
  for (const id of selected) startCompanionAction(id, kind);
}

function naturalCompanionBehavior(w) {
  if (typeof chooseWorldBehavior === "function" && chooseWorldBehavior(w)) return;
  const p = pets[w.id], chance = Math.random();
  if (p.energy < 60 || (w.id === "molly" && chance < 0.25)) {
    startCompanionAction(w.id, "napping");
  } else if (p.water < 58) {
    startCompanionAction(w.id, "drinking");
  } else if (w.id === "august" && chance < 0.45) {
    startCompanionAction(w.id, "playing");
  } else if (chance > 0.82) {
    goHome(w.id);
  } else {
    doBehavior(w.id, p.joy > 85 && chance < 0.7 ? "hopping" : "scratching", 3);
  }
  w.nextNatural = simulationTime + 35 + Math.random() * 25;
  if (simulationTime >= nextCozyEvent) {
    const lines = w.id === "august"
      ? ["August hat etwas rascheln gehört. 🌿", "August steckt voller kleiner Abenteuer. 🐾"]
      : ["Molly hat einen gemütlichen Lieblingsplatz gefunden. 🍃", "Molly lässt es heute ganz entspannt angehen. 💛"];
    cozyNotice(w.mode === "walk" && companionActions.get(w.id)?.kind === "napping"
      ? `${p.name} sucht sich ein Plätzchen zum Dösen. 🌙` : lines[Math.floor(Math.random() * lines.length)]);
    nextCozyEvent = simulationTime + 65 + Math.random() * 35;
  }
}

function layoutCompanionObjects() {
  for (const [selector, pos] of [["#willow-ball", ballPlaces[ballPlace]], ["#drink-bowl", bowlPlace]]) {
    $(selector).style.left = pos.x + "%";
    $(selector).style.top = pos.y + "%";
  }
}

function stepCompanions(dt) {
  for (const [id, p] of Object.entries(pets)) {
    if (!["napping", "house-sleep"].includes(walkers[id].mode)) p.energy = Math.max(35, p.energy - dt * 0.035);
    p.enrichment = Math.max(35, p.enrichment - dt * 0.04);
  }
  let playing = false;
  for (const action of companionActions.values()) {
    if (action.phase === "waiting") {
      const first = [...companionActions.values()].find(a => a.kind === "drinking");
      if (first === action) {
        companionActions.delete(action.id);
        startCompanionAction(action.id, "drinking");
      }
      continue;
    }
    if (action.phase !== "active") continue;
    if (action.kind === "drinking" && typeof canDrink === "function" && !canDrink(action)) continue;
    action.elapsed += dt;
    const w = walkers[action.id];
    w.el.style.setProperty("--cozy-motion", `${Math.sin(action.elapsed * (action.kind === "napping" ? 1.5 : 4)) * 1.5}px`);
    if (action.kind === "napping") pets[action.id].energy = Math.min(100, pets[action.id].energy + dt * 2);
    if (action.kind === "playing") playing = true;
    if (action.kind === "drinking") {
      w.el.style.setProperty("--drink-nod", `${Math.sin(action.elapsed * 5) * 1.1}deg`);
      const sip = Math.min(water, dt * 1.2);
      water = Math.max(0, water - sip);
      pets[action.id].water = Math.min(100, pets[action.id].water + sip * 5);
      if (water <= 0) { finishCompanionAction(action); continue; }
    }
    if (action.elapsed >= action.duration) finishCompanionAction(action);
  }
  $("#willow-ball").classList.toggle("being-played", playing);
  $("#drink-bowl").classList.toggle("being-used", [...companionActions.values()].some(a => a.kind === "drinking" && a.phase === "active"));
  noticeClock = Math.max(0, noticeClock - dt);
  if (!noticeClock) $("#cozy-notice").hidden = true;
  companionUiClock += dt;
  companionSaveClock += dt;
  if (companionUiClock >= 1) { companionUiClock = 0; refreshCompanionUi(); }
  if (companionSaveClock >= 20) { companionSaveClock = 0; saveCompanions(); }
}

restoreCompanions();
buildCompanionUi();
layoutCompanionObjects();
refreshCompanionUi();
update();
saveCompanions();
if (!memories.size) {
  cozyNotice("Tippe auf Wiese, Ball, Tränke oder Heu. Im 📖 entdeckt ihr euer Gehege.");
  noticeClock = 10;
}
$("#companion-menu").addEventListener("click", () => {
  if (paused || miniGame) return;
  const open = $("#companion-panel").hidden;
  closeFood();
  hideGames();
  $("#companion-panel").hidden = !open;
  $("#companion-menu").setAttribute("aria-expanded", open);
  refreshCompanionUi();
  if (open) $("#companion-close").focus();
});
$("#companion-close").addEventListener("click", () => closeCompanionPanel());
$("#nap").addEventListener("click", () => useCompanionActivity("napping"));
$("#play-ball").addEventListener("click", () => useCompanionActivity("playing"));
$("#willow-ball").addEventListener("click", () => useCompanionActivity("playing"));
$("#drink-bowl").addEventListener("click", () => useCompanionActivity("drinking"));
$("#call-pets").addEventListener("click", () => {
  if (paused) return;
  endMiniGame();
  stopSearch();
  closeCompanionPanel();
  for (const id of selected) sendPet(id, id === "august" ? 34 : 68, 78, () => {
    doBehavior(id, "cuddling", 2.5);
    effect(id, "💛");
  });
  tone("curious");
  cozyNotice("Kommt her, ihr zwei! 💛");
});
$("#move-ball").addEventListener("click", () => {
  if (paused) return;
  for (const action of [...companionActions.values()])
    if (action.kind === "playing") cancelCompanionAction(action.id);
  ballPlace = (ballPlace + 1) % ballPlaces.length;
  layoutCompanionObjects();
  if (typeof discoverToy === "function") discoverToy();
  saveCompanions();
  closeCompanionPanel();
  cozyNotice("Ein neuer Platz zum Entdecken! 🌿");
});
$("#toggle-flowers").addEventListener("click", () => {
  if (paused || memories.size < 3) return;
  flowers = !flowers;
  refreshCompanionUi();
  saveCompanions();
});
window.addEventListener("pagehide", saveCompanions);
window.addEventListener("resize", () => {
  // Keep the same owned action and elapsed time, including during pause.
  for (const action of companionActions.values()) {
    if (action.kind === "napping" || action.phase === "waiting") continue;
    Object.assign(action.target, activityDestination(action.id, action.kind));
    const w = walkers[action.id];
    if (action.phase === "approaching") {
      w.tx = action.target.x;
      w.ty = action.target.y;
    } else {
      w.x = action.target.x;
      w.y = action.target.y;
      renderWalker(w, false);
    }
  }
});
