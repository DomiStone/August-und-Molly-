"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const pets = {
  august: { name: "August", food: 70, water: 75, joy: 80 },
  molly: { name: "Molly", food: 72, water: 75, joy: 80 },
};
let selected = ["august", "molly"],
  paused = false,
  sound = false,
  searchActive = false,
  water = 60,
  found = 0,
  reactionTime = 0,
  needsTime = 0,
  searchResultTime = 0,
  audioContext;
const effects = new Map();
function update() {
  for (const [id, p] of Object.entries(pets))
    for (const key of ["food", "water", "joy"])
      $(`[data-need="${id}-${key}"]`).style.setProperty(
        "--level",
        Math.round(p[key]) + "%",
      );
  $("#water-fill").style.width = water + "%";
  if (typeof refreshCompanionUi === "function") refreshCompanionUi();
}
function message(text) {
  $("#message").textContent = text;
}
function react(icon) {
  $("#reaction").textContent = icon;
  $("#reaction").classList.add("visible");
  reactionTime = 2.2;
}
function tone(kind = "happy") {
  if (!sound || paused || document.hidden) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    const time = audioContext.currentTime;
    [0, 0.13, 0.26].forEach((d, i) => {
      const o = audioContext.createOscillator(),
        g = audioContext.createGain();
      const notes = { water: [510, 430, 350], sleepy: [330, 294, 262],
        curious: [520, 660, 590], favorite: [660, 880, 990],
        clean: [440, 660, 880], rustle: [210, 260, 190], nibble: [300, 340, 280] };
      if (kind === "rustle" || kind === "nibble") o.type = "triangle";
      o.frequency.value = (notes[kind] || [700, 840, 980])[i];
      g.gain.setValueAtTime(0, time + d);
      g.gain.linearRampToValueAtTime(kind === "rustle" || kind === "nibble" ? 0.012 : 0.035, time + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, time + d + 0.17);
      o.connect(g);
      g.connect(audioContext.destination);
      o.start(time + d);
      o.stop(time + d + 0.18);
    });
  } catch {}
}
function effect(id, icon) {
  const w = walkers[id];
  const e = document.createElement("span");
  e.className = "effect";
  e.textContent = icon;
  e.style.left = w.x + "%";
  e.style.top = w.y - 12 + "%";
  $("#effects").append(e);
  effects.set(e, 1.8);
}
function select(ids) {
  if (paused || (typeof miniGame !== "undefined" && miniGame)) return;
  selected = ids;
  for (const id of Object.keys(pets)) {
    $("#" + id).classList.toggle("selected", ids.includes(id));
    $("#select-" + id).classList.toggle("selected", ids.includes(id));
    $("#select-" + id).setAttribute("aria-pressed", ids.includes(id));
  }
  $("#both").setAttribute("aria-pressed", ids.length === 2);
  if (typeof refreshCompanionUi === "function") refreshCompanionUi();
  tone();
}
for (const id of Object.keys(pets)) {
  for (const button of [$("#" + id), $("#select-" + id)])
    button.addEventListener("click", () => select([id]));
}
$("#both").addEventListener("click", () => select(["august", "molly"]));
function closeFood() {
  $("#food-drawer").hidden = true;
  $("#food-menu").setAttribute("aria-expanded", false);
}
$("#food-menu").addEventListener("click", () => {
  if (paused) return;
  if (typeof closeCompanionPanel === "function") closeCompanionPanel(false);
  hideGames();
  const open = $("#food-drawer").hidden;
  $("#food-drawer").hidden = !open;
  $("#food-menu").setAttribute("aria-expanded", open);
});
$$("[data-food]").forEach((b) =>
  b.addEventListener("click", () => {
    if (paused) return;
    endMiniGame();
    closeFood();
    stopSearch();
    startFeeding([...selected], b.dataset.food);
  }),
);
$("#refill").addEventListener("click", () => {
  if (paused) return;
  water = 100;
  if (typeof refreshWorldUi === "function") refreshWorldUi();
  react("💧💙");
  tone("water");
  update();
  for (const id of Object.keys(pets)) effect(id, "💧");
});
function perform(mode, icon, duration) {
  if (paused) return;
  if (typeof endMiniGame === "function") endMiniGame();
  closeFood();
  hideGames();
  stopSearch();
  for (const id of selected) {
    if (mode === "house") goHome(id);
    else {
      doBehavior(id, mode, duration);
      pets[id].joy = Math.min(100, pets[id].joy + 10);
      effect(id, icon);
    }
  }
  react(icon);
  tone();
  update();
  if (mode === "cuddling" && typeof rememberMoment === "function")
    rememberMoment("cuddle");
}
$("#home").addEventListener("click", () => perform("house", "🏠", 0));
$("#scratch").addEventListener("click", () => perform("scratching", "🐾", 3.8));
$("#cuddle").addEventListener("click", () => perform("cuddling", "💕", 3));
$("#popcorn").addEventListener("click", () => perform("hopping", "✨", 2.2));
function stopSearch() {
  searchActive = false;
  searchResultTime = 0;
  $("#search-items").replaceChildren();
  $("#search-progress").hidden = true;
  $("#search").setAttribute("aria-pressed", false);
}
$("#search").addEventListener("click", () => {
  if (paused) return;
  if (typeof endMiniGame === "function") endMiniGame();
  $("#games-drawer").hidden = true;
  $("#games").setAttribute("aria-expanded", false);
  if (searchActive) {
    stopSearch();
    return;
  }
  closeFood();
  cancelAllFeeding();
  if (typeof cancelAllWorldActions === "function") cancelAllWorldActions();
  if (typeof cancelAllCompanionActions === "function") cancelAllCompanionActions();
  searchActive = true;
  found = 0;
  $("#search").setAttribute("aria-pressed", true);
  $("#search-progress").hidden = false;
  $$("#search-progress span").forEach((s) => s.classList.remove("found"));
  const targets = [...selected];
  [
    [24, 51, "🥬"],
    [76, 57, "🥒"],
    [49, 77, "🫑"],
  ].forEach(([x, y, icon], i) => {
    let collected = false;
    const b = document.createElement("button");
    b.className = "search-item";
    b.style.left = x + "%";
    b.style.top = y + "%";
    b.textContent = icon;
    b.setAttribute("aria-label", "Leckerei finden");
    b.addEventListener("click", () => {
      if (paused || collected || !searchActive) return;
      collected = true;
      b.remove();
      found++;
      $$("#search-progress span")[i].classList.add("found");
      const isLast = found === 3;
      targets.forEach((id, j) =>
        sendPet(
          id,
          clamp(x, 28, 72) + (targets.length === 2 ? (j ? 10 : -10) : 0),
          y,
          () => {
            doBehavior(id, isLast ? "dancing" : "eating", isLast ? 4 : 2);
            effect(id, icon);
          },
        ),
      );
      tone();
      if (found === 3) {
        if (typeof rememberMoment === "function") rememberMoment("search");
        react("🌟🌟🌟");
        searchActive = false;
        $("#search").setAttribute("aria-pressed", false);
        for (const id of targets) pets[id].joy = 100;
        update();
        searchResultTime = 2.5;
      }
    });
    $("#search-items").append(b);
  });
  react("🔎🥬");
});
function setPause(value) {
  if (value) hideGames();
  if (value && typeof closeCompanionPanel === "function") closeCompanionPanel(false);
  paused = value;
  document.body.classList.toggle("paused", value);
  $("#pause-overlay").hidden = !value;
  $("#pause").setAttribute("aria-pressed", value);
  $$("nav button,.top-tools button,.pig,.search-item").forEach(
    (b) => (b.disabled = value),
  );
  if (value) $("#resume").focus();
  else $("#pause").focus();
  if (audioContext) {
    (value ? audioContext.suspend() : audioContext.resume()).catch(() => {});
  }
}
$("#pause").addEventListener("click", () => setPause(true));
$("#resume").addEventListener("click", () => setPause(false));
$("#sound").addEventListener("click", () => {
  sound = !sound;
  $("#sound").textContent = sound ? "🔊" : "🔇";
  $("#sound").setAttribute("aria-pressed", sound);
  $("#sound").setAttribute(
    "aria-label",
    sound ? "Ton ausschalten" : "Ton einschalten",
  );
  tone();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeFood();
    hideGames();
    if (typeof closeCompanionPanel === "function") closeCompanionPanel();
    if (paused) {
      setPause(false);
      return;
    }
    endMiniGame();
  }
});
function stepGameUi(dt) {
  reactionTime = Math.max(0, reactionTime - dt);
  if (!reactionTime) $("#reaction").classList.remove("visible");
  if (searchResultTime > 0) {
    searchResultTime = Math.max(0, searchResultTime - dt);
    if (!searchResultTime) $("#search-progress").hidden = true;
  }
  for (const [el, remaining] of effects) {
    if (remaining <= dt) {
      el.remove();
      effects.delete(el);
    } else effects.set(el, remaining - dt);
  }
  needsTime += dt;
  if (needsTime >= 15) {
    needsTime -= 15;
    for (const p of Object.values(pets)) {
      p.food = Math.max(35, p.food - 0.5);
      p.water = Math.max(35, p.water - 0.4);
      p.joy = Math.max(40, p.joy - 0.4);
    }
    update();
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !paused) setPause(true);
  if (document.hidden && typeof saveCompanions === "function") saveCompanions();
});
update();
