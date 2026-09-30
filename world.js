"use strict";

// The world owns resources and social/tunnel actions, not a second game loop.
const world = {
  hay: 100, cleaned: 0, bedding: 0, tunnelPlace: 0, baby: false,
  minutes: new Date().getHours() * 60 + new Date().getMinutes(),
  dirt: new Map(), actions: new Map(), dirtId: 0,
  dirtClock: 40, socialClock: 24, uiClock: 0,
};
const tunnelPlaces = [{ x: 51, y: 51 }, { x: 49, y: 75 }];
const baby = { x: 43, y: 70, parent: "august", clock: 0, hop: 0, gait: 0 };

function safeWorldNumber(value, fallback, min, max) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function restoreWorld(saved) {
  if (!saved || typeof saved !== "object") return;
  world.hay = safeWorldNumber(saved.hay, 100, 0, 100);
  world.cleaned = Math.floor(safeWorldNumber(saved.cleaned, 0, 0, 1000));
  world.bedding = Math.floor(safeWorldNumber(saved.bedding, 0, 0, 2));
  world.tunnelPlace = Math.floor(safeWorldNumber(saved.tunnelPlace, 0, 0, 1));
  world.minutes = safeWorldNumber(saved.minutes, world.minutes, 0, 1439);
  world.baby = saved.baby === true;
  if (Array.isArray(saved.dirt)) {
    for (const spot of saved.dirt.slice(0, 6)) {
      if (spot && Number.isFinite(spot.x) && Number.isFinite(spot.y))
        addLitter(clamp(spot.x, 20, 80), clamp(spot.y, 48, 78));
    }
  }
}

function worldSnapshot() {
  return {
    hay: Math.round(world.hay), cleaned: world.cleaned, bedding: world.bedding,
    tunnelPlace: world.tunnelPlace, baby: world.baby, minutes: Math.floor(world.minutes),
    dirt: [...world.dirt.values()].map(({ x, y }) => ({ x, y })),
  };
}

function dayPhase() {
  const hour = world.minutes / 60;
  if (hour < 6 || hour >= 22) return { name: "🌙 Ruhige Nacht", shade: 0.16, quiet: true };
  if (hour < 10) return { name: "🌅 Guten Morgen", shade: 0.06, quiet: false };
  if (hour < 18) return { name: "☀️ Kleine Tagesabenteuer", shade: 0, quiet: false };
  return { name: "🌇 Gemütlicher Abend", shade: 0.1, quiet: true };
}

function refreshWorldUi() {
  const phase = dayPhase();
  $("#world-clock").textContent = phase.name + " · Der Spieltag vergeht sanft, nur während ihr spielt.";
  $("#daylight").style.opacity = phase.shade;
  $("#hay-status").textContent = `🌾 Heu: ${Math.round(world.hay)} %`;
  $("#bottle-status").textContent = `💧 Tränke: ${Math.round(water)} %`;
  $("#clean-status").textContent = `✨ Sauberkeit: ${100 - world.dirt.size * 10} %`;
  $("#water-fill").style.width = water + "%";
  $("#bottle-water").setAttribute("y", 118 - water);
  $("#bottle-water").setAttribute("height", water);
  $("#rack-hay").style.opacity = world.hay > 0 ? 0.35 + world.hay / 155 : 0;
  $("#hay-rack").setAttribute("aria-label", `Heu aus der Raufe fressen, ${Math.round(world.hay)} Prozent übrig`);
  $("#drink-bowl").setAttribute("aria-label", `An der Trinkflasche trinken, ${Math.round(water)} Prozent Wasser`);
  $("#baby").hidden = !world.baby;
  $("#adopt-baby").disabled = world.baby || memories.size < 3;
  $("#family-status").textContent = world.baby
    ? "Fips ist da! Das Jungtier folgt August und Molly, imitiert sie und ruht mit ihnen. Seine Versorgung gehört zur gemeinsamen Pflege; es gibt keine weiteren Babys."
    : "Nach drei Album-Stickern kann genau ein Jungtier einziehen: Fips. Keine Zucht, kein Zeitdruck.";
  $("#habitat").dataset.bedding = String(world.bedding);
  const place = tunnelPlaces[world.tunnelPlace];
  $("#world-tunnel").style.left = place.x + "%";
  $("#world-tunnel").style.top = place.y + "%";
}

function bottleDestination(id) {
  const width = $("#drink-bowl").offsetWidth;
  const habitat = $("#habitat");
  // SVG nozzle ends at (18,146), in a 100×160 view box.
  const nozzleX = bowlPlace.x - width * 0.32 / habitat.clientWidth * 100;
  const nozzleY = bowlPlace.y + width * 0.66 / habitat.clientHeight * 100;
  const side = id === "august" ? -1 : 1;
  let y = nozzleY + 5, geometry;
  for (let i = 0; i < 5; i++) {
    geometry = feedingGeometry(walkers[id], y);
    y = clamp(nozzleY - geometry.mouthY / geometry.height * 100, 42, 80);
  }
  return { x: clamp(nozzleX + side * geometry.mouthX / geometry.width * 100, 17, 83), y, direction: -side };
}

function canDrink(action) {
  if (water <= 0) { finishCompanionAction(action); return false; }
  // One opening, one drinker. A canceled/finished action releases it immediately.
  const first = [...companionActions.values()].find(a => a.kind === "drinking" && a.phase === "active");
  return first === action;
}

function hayReservations() {
  return [...feedings.values()].reduce((sum, a) => sum + (a.rackRemaining || 0), 0);
}

function startRackMeal(ids) {
  if (paused || miniGame || searchActive) return;
  for (const id of ids) {
    if (feedings.has(id)) continue;
    if (world.hay - hayReservations() < 8) {
      cozyNotice("🌾 Die Heuraufe braucht Nachschub. Auffüllen geht im 📖.");
      break;
    }
    startFeeding([id], "Heu");
    const action = feedings.get(id);
    if (action) action.rackRemaining = 8;
  }
}

function consumeRackBite(action) {
  if (!action.rackRemaining) return;
  action.rackRemaining--;
  world.hay = Math.max(0, world.hay - 1);
  refreshWorldUi();
}

function worldBusy(id) { return world.actions.has(id) || walkers[id].sleepRequested; }

function availableForWorld(id) {
  const w = walkers[id];
  return !miniGame && !searchActive && !feedings.has(id) && !companionActions.has(id)
    && !worldBusy(id) && !w.arrival && ["walk", "sniff"].includes(w.mode);
}

function cancelWorldAction(id) {
  const w = walkers[id];
  w.sleepRequested = false;
  $("#sleep-" + id).hidden = true;
  w.runUntil = 0;
  const action = world.actions.get(id);
  if (!action) return;
  world.actions.delete(id);
  w.el.classList.remove("tunneling");
  w.el.style.removeProperty("--tunnel-opacity");
  w.arrival = null;
  if (w.mode === "in-tunnel") { w.mode = "sniff"; w.wait = 2; }
  if (action.partner && world.actions.get(action.partner)?.partner === id) {
    const partner = action.partner;
    world.actions.delete(partner);
    walkers[partner].runUntil = 0;
    walkers[partner].arrival = null;
    walkers[partner].mode = "sniff";
    walkers[partner].wait = 2;
    walkers[partner].nextNatural = simulationTime + 25;
  }
}

function cancelAllWorldActions() {
  for (const id of Object.keys(walkers)) {
    const wasSleeping = walkers[id].mode === "house-sleep";
    cancelWorldAction(id);
    if (wasSleeping) {
      takeOutside(walkers[id]);
      walkers[id].mode = "sniff";
      walkers[id].wait = 2;
    }
  }
}

function startHouseSleep(id) {
  if (paused || miniGame || searchActive || walkers[id].sleepRequested) return;
  goHome(id);
  walkers[id].sleepRequested = true;
  cozyNotice(`${pets[id].name} kuschelt sich ins ${id === "august" ? "linke" : "rechte"} Lieblingsfenster. 🌙`);
}

function startSocialWalk(explicit = false) {
  if (paused || miniGame || searchActive) return false;
  const ids = ["august", "molly"];
  if (!explicit && !ids.every(availableForWorld)) return false;
  if (explicit) ids.forEach(id => { cancelFeeding(id); cancelCompanionAction(id); });
  const leader = Math.random() < 0.6 ? "august" : "molly";
  const follower = ids.find(id => id !== leader);
  sendPet(leader, leader === "august" ? 72 : 28, 61);
  sendPet(follower, leader === "august" ? 52 : 48, 69);
  world.actions.set(leader, { kind: "social", leader, partner: follower, elapsed: 0 });
  world.actions.set(follower, { kind: "social", leader, partner: leader, elapsed: 0 });
  for (const id of ids) walkers[id].runUntil = simulationTime + 8;
  cozyNotice(`${pets[leader].name} geht voraus – komm mit! 🐾`);
  tone("curious");
  return true;
}

function finishSocialWalk() {
  // Remove the group ownership before changing either animal's behavior.
  for (const id of ["august", "molly"]) world.actions.delete(id);
  for (const id of ["august", "molly"]) {
    doBehavior(id, "cuddling", 2.5);
    walkers[id].direction = id === "august" ? 1 : -1;
    pets[id].joy = Math.min(100, pets[id].joy + 4);
    pets[id].enrichment = Math.min(100, pets[id].enrichment + 10);
    effect(id, "💕");
  }
  rememberMoment("friends");
}

function startWorldTunnel(ids) {
  if (paused || miniGame || searchActive) return;
  const place = tunnelPlaces[world.tunnelPlace];
  for (const id of ids) {
    if (world.actions.get(id)?.kind === "tunnel") continue;
    const side = id === "august" ? -1 : 1;
    const target = { x: place.x + side * 10, y: place.y + 6 };
    sendPet(id, target.x, target.y, () => {
      const action = world.actions.get(id);
      if (!action) return;
      action.phase = "inside";
      walkers[id].mode = "in-tunnel";
      walkers[id].el.classList.add("tunneling");
      tone("rustle");
    });
    world.actions.set(id, { kind: "tunnel", phase: "approaching", elapsed: 0, start: target.x, end: place.x - side * 10, y: target.y });
  }
}

function discoverToy() {
  // A moved toy interests a free curious pet, never interrupts care or sleep.
  if (availableForWorld("august")) startCompanionAction("august", "playing");
}

function chooseWorldBehavior(w) {
  if (worldBusy(w.id)) return true;
  const p = pets[w.id];
  w.nextNatural = simulationTime + 24 + Math.random() * 18;
  if (p.water < 60 && water > 0) startCompanionAction(w.id, "drinking");
  else if (p.energy < 60) startHouseSleep(w.id);
  else if (p.food < 64 && world.hay - hayReservations() >= 8) startRackMeal([w.id]);
  else if (p.enrichment < 60) startCompanionAction(w.id, "playing");
  else {
    const chance = Math.random();
    if (dayPhase().quiet && chance < (w.id === "molly" ? 0.45 : 0.2)) startHouseSleep(w.id);
    else if (chance < 0.25) startWorldTunnel([w.id]);
    else if (chance < 0.38 && world.hay - hayReservations() >= 8 && p.food < 85) startRackMeal([w.id]);
    else if (chance > 0.87 && p.energy > 65) {
      sendPet(w.id, w.x < 50 ? 74 : 26, 66);
      w.runUntil = simulationTime + 6;
      effect(w.id, "✨");
    } else return false;
  }
  return true;
}

function addLitter(x, y) {
  if (world.dirt.size >= 6) return;
  const id = ++world.dirtId;
  const button = document.createElement("button");
  button.className = "litter";
  button.style.left = x + "%";
  button.style.top = y + "%";
  button.setAttribute("aria-label", "Kleine Köttel entfernen");
  button.innerHTML = '<i></i><i></i>';
  button.addEventListener("click", () => cleanLitter(id));
  world.dirt.set(id, { x, y, button });
  $("#litter-layer").append(button);
}

function cleanLitter(id, silent = false) {
  if (paused || miniGame || !world.dirt.has(id)) return;
  world.dirt.get(id).button.remove();
  world.dirt.delete(id);
  world.cleaned = Math.min(1000, world.cleaned + 1);
  if (!silent) {
    for (const pet of Object.values(pets)) pet.joy = Math.min(100, pet.joy + 2);
    tone("clean");
    react("✨");
  }
  if (world.cleaned >= 3) rememberMoment("clean");
  refreshWorldUi();
  saveCompanions();
}

function cleanEnclosure() {
  if (paused || miniGame) return;
  if (!world.dirt.size) { cozyNotice("Alles schön sauber – Zeit zum Spielen! 🍃"); return; }
  for (const id of [...world.dirt.keys()]) cleanLitter(id, true);
  for (const id of Object.keys(pets)) {
    pets[id].joy = Math.min(100, pets[id].joy + 6);
    effect(id, "✨");
  }
  tone("clean");
  cozyNotice("Frische Einstreu, glückliche Pfötchen. ✨");
  update();
  saveCompanions();
}

function stepBaby(dt) {
  if (!world.baby) return;
  const el = $("#baby");
  baby.clock += dt;
  baby.hop = Math.max(0, baby.hop - dt);
  if (baby.clock > 35) { baby.clock = 0; baby.parent = baby.parent === "august" ? "molly" : "august"; }
  const parent = walkers[baby.parent];
  const sleeping = ["house-sleep", "napping", "inside", "peeking"].includes(parent.mode);
  const eating = feedings.get(baby.parent)?.phase === "eating";
  const inHouse = ["house-sleep", "inside", "peeking"].includes(parent.mode);
  const targetX = clamp(inHouse ? 46 : parent.x + (parent.x > 50 ? -17 : 17), 17, 83);
  const targetY = clamp(inHouse ? 45 : parent.y + 7, 44, 80);
  const dx = targetX - baby.x, dy = targetY - baby.y;
  const distance = Math.hypot(dx, dy * 1.5);
  const amount = Math.min(1, dt * 16 / Math.max(1, distance));
  baby.x += dx * amount;
  baby.y += dy * amount;
  const moving = distance > 2;
  baby.gait += dt * 11;
  el.dataset.mode = moving ? "following" : sleeping ? "sleeping" : eating ? "nibbling" : baby.hop ? "hopping" : "sniffing";
  el.style.left = baby.x + "%";
  el.style.top = baby.y + "%";
  el.style.setProperty("--baby-facing", dx >= 0 ? 1 : -1);
  const f = Math.floor(baby.gait) % 8;
  $("#baby .baby-walk").style.backgroundPosition = `${(f % 4) * 100 / 3}% ${f < 4 ? 0 : 100}%`;
}

function stepWorld(dt) {
  world.minutes = (world.minutes + dt * 2) % 1440;
  for (const [id, action] of [...world.actions]) {
    if (action.kind === "social") {
      if (id !== action.leader) continue;
      action.elapsed += dt;
      const leader = walkers[id], follower = walkers[action.partner];
      // A changing destination creates following rather than two parallel walks.
      follower.tx = clamp(leader.x + (leader.direction > 0 ? -19 : 19), 18, 82);
      follower.ty = clamp(leader.y + 8, 45, 78);
      follower.wait = 0;
      if (action.elapsed > 7) finishSocialWalk();
    } else if (action.kind === "tunnel" && action.phase === "inside") {
      action.elapsed += dt;
      const t = Math.min(1, action.elapsed / 2.8), w = walkers[id];
      w.x = action.start + (action.end - action.start) * t;
      w.y = action.y;
      w.direction = action.end > action.start ? 1 : -1;
      w.el.style.setProperty("--tunnel-opacity", Math.abs(t - 0.5) > 0.32 ? Math.abs(t - 0.5) * 2 : 0);
      if (t === 1) {
        cancelWorldAction(id);
        sendPet(id, action.end, action.y + 5);
        pets[id].enrichment = Math.min(100, pets[id].enrichment + 12);
        effect(id, "🍀");
      }
    }
  }
  if (!miniGame && !searchActive) {
    world.dirtClock -= dt;
    if (world.dirtClock <= 0) {
      const id = Math.random() < 0.5 ? "august" : "molly", w = walkers[id];
      if (["walk", "sniff"].includes(w.mode)) addLitter(clamp(w.x, 20, 80), clamp(w.y + 4, 48, 78));
      world.dirtClock = 38 + Math.random() * 25;
    }
    world.socialClock -= dt;
    if (world.socialClock <= 0) world.socialClock = startSocialWalk() ? 55 + Math.random() * 30 : 8;
  }
  stepBaby(dt);
  world.uiClock += dt;
  if (world.uiClock >= 1) { world.uiClock = 0; refreshWorldUi(); }
}

restoreWorld(pendingWorldSave);
refreshWorldUi();
saveCompanions();
$("#hay-rack").addEventListener("click", () => startRackMeal([...selected]));
$("#refill-hay").addEventListener("click", () => {
  if (paused) return;
  world.hay = 100;
  tone("rustle");
  cozyNotice("Die Raufe duftet wieder nach frischem Heu. 🌾");
  refreshWorldUi();
  saveCompanions();
});
$("#house-sleep").addEventListener("click", () => {
  if (paused) return;
  closeCompanionPanel();
  stopSearch();
  selected.forEach(startHouseSleep);
});
$("#world-tunnel").addEventListener("click", () => startWorldTunnel([...selected]));
$("#move-tunnel").addEventListener("click", () => {
  if (paused) return;
  for (const [id, action] of [...world.actions]) if (action.kind === "tunnel") cancelWorldAction(id);
  world.tunnelPlace = (world.tunnelPlace + 1) % 2;
  refreshWorldUi();
  saveCompanions();
  closeCompanionPanel();
  if (availableForWorld("august")) startWorldTunnel(["august"]);
});
$("#together").addEventListener("click", () => { closeCompanionPanel(); startSocialWalk(true); });
$("#clean-enclosure").addEventListener("click", () => { cleanEnclosure(); closeCompanionPanel(); });
$("#bedding-style").addEventListener("click", () => {
  if (paused) return;
  world.bedding = (world.bedding + 1) % 3;
  refreshWorldUi();
  saveCompanions();
  cozyNotice(["🌾 Warme Strohfarben", "🍃 Sanftes Wiesengrün", "🌸 Zartes Blütenrosa"][world.bedding]);
});
$("#adopt-baby").addEventListener("click", () => {
  if (paused || world.baby || memories.size < 3) return;
  world.baby = true;
  rememberMoment("baby");
  refreshWorldUi();
  saveCompanions();
  closeCompanionPanel();
  cozyNotice("Willkommen, Fips! Unser kleiner Mitbewohner entdeckt das Gehege. 🐹");
});
$("#baby").addEventListener("click", () => {
  if (paused || miniGame || !world.baby) return;
  baby.hop = 3;
  tone("curious");
  cozyNotice(`Fips: klein, neugierig und immer ${pets[baby.parent].name} hinterher. 💛`);
});
