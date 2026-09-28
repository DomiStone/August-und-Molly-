"use strict";

// One owned action per pet. No timeout/interval callbacks survive cancellation.
const feedings = new Map();
const BITE_SECONDS = 0.82;

function feedingGeometry(w, y) {
  const habitat = $("#habitat");
  const width = habitat.clientWidth,
    height = habitat.clientHeight;
  const petWidth = w.el.offsetWidth;
  const petHeight = (petWidth * 272) / 384;
  const depth = clamp(0.65 + (y - 37) * 0.011, 0.65, 1.13);
  // Native photographs have opposite directions and different mouth heights.
  const mouthY = w.id === "august" ? 0.52 : 0.48;
  const photoHeight = petWidth / 1.5;
  return {
    width,
    height,
    mouthX: petWidth * depth * 0.275,
    mouthY:
      -0.68 * petHeight +
      0.78 * petHeight * (1 - depth) +
      depth * ((petHeight - photoHeight) / 2 + photoHeight * mouthY),
    foodWidth: clamp(width * 0.11, 64, 108),
  };
}

function layoutFeeding(action) {
  const w = walkers[action.id];
  const g = (action.geometry = feedingGeometry(w, action.y));
  action.foodX = (action.startX * g.width) / 100 + g.mouthX;
  action.foodY = (action.y * g.height) / 100 + g.mouthY;
  action.view.el.style.left = action.foodX + "px";
  action.view.el.style.top = action.foodY - g.foodWidth * 0.2 + "px";
  action.view.el.style.width = g.foodWidth + "px";
}

function startFeeding(ids, type) {
  const config = FOOD_TYPES[type];
  if (paused || !config) return;
  for (const id of ids) {
    // Repeated taps never replace/duplicate an active portion. The other pet
    // can still be selected and fed independently.
    if (feedings.has(id)) continue;
    const w = walkers[id];
    const startX = id === "august" ? 27 : 65;
    const y = id === "august" ? 65 : 71;
    sendPet(id, startX, y, () => beginEating(id));
    const action = {
      id,
      type,
      config,
      startX,
      y,
      phase: "approaching",
      bite: 0,
      clock: 0,
      edge: 0,
      settle: 0,
      view: createFoodView(id, type),
    };
    feedings.set(id, action);
    layoutFeeding(action);
    w.el.dataset.feeding = "approaching";
    message(`${pets[id].name} läuft zum Futter.`);
  }
}

function beginEating(id) {
  const action = feedings.get(id);
  if (!action) return;
  const w = walkers[id];
  resetAppearance(w);
  w.x = action.startX;
  w.y = action.y;
  w.direction = 1;
  w.vx = w.vy = 0;
  w.mode = "feeding";
  w.arrival = null;
  w.el.classList.add("feeding");
  w.el.dataset.feeding = action.phase = "eating";
  renderWalker(w, false);
  tone();
}

function cancelFeeding(id) {
  const action = feedings.get(id);
  if (!action) return;
  feedings.delete(id);
  action.view.el.remove(); // Includes every crumb owned by this portion.
  const w = walkers[id];
  w.arrival = null;
  w.el.classList.remove("feeding");
  w.el.style.removeProperty("--chew-y");
  w.el.style.removeProperty("--chew-angle");
  delete w.el.dataset.feeding;
  w.mode = "sniff";
  w.wait = 1.2;
  w.nextNatural = simulationTime + 20;
}

function cancelAllFeeding() {
  for (const id of [...feedings.keys()]) cancelFeeding(id);
}

function finishFeeding(action) {
  cancelFeeding(action.id);
  // Nutrition is committed exactly once, after the last bite and chew.
  const pet = pets[action.id];
  pet.food = Math.min(100, pet.food + action.config.value);
  pet.joy = Math.min(100, pet.joy + 5);
  update();
  effect(action.id, "💕");
  message(`${pet.name} hat das Futter ganz aufgegessen.`);
  if (typeof foodMemory === "function") foodMemory(action.id, action.type);
}

function stepFeeding(dt) {
  for (const action of feedings.values()) {
    if (action.phase === "approaching") continue;
    const w = walkers[action.id];
    stepFoodCrumbs(action, dt);
    action.clock += dt;
    const chew = Math.sin(
      Math.min(1, action.clock / BITE_SECONDS) * Math.PI * 2,
    );
    w.el.style.setProperty("--chew-y", `${Math.max(0, chew) * 1.7}px`);
    w.el.style.setProperty("--chew-angle", `${chew * 0.7}deg`);
    if (action.phase === "finishing") {
      action.settle += dt;
      if (action.settle >= 0.5) finishFeeding(action);
      continue;
    }
    if (action.clock < BITE_SECONDS) continue;
    action.clock -= BITE_SECONDS;
    action.bite++;
    renderFoodBite(action);
    spawnFoodCrumbs(action);
    // The pet follows the retreating bite edge; the food never slides/scales.
    action.edge =
      ((action.bite / action.config.bites) * action.config.length) / 120;
    w.x =
      action.startX +
      ((action.edge * action.geometry.foodWidth) / action.geometry.width) * 100;
    if (action.bite === action.config.bites) {
      action.phase = "finishing";
      action.view.edible.style.visibility = "hidden";
    }
  }
}

window.addEventListener("resize", () => {
  for (const action of feedings.values()) {
    layoutFeeding(action);
    if (action.phase !== "approaching") {
      walkers[action.id].x =
        action.startX +
        ((action.edge * action.geometry.foodWidth) / action.geometry.width) *
          100;
    }
  }
});
