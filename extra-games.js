"use strict";

const gardenFoods = ["🥕", "🥒", "🫑", "🥬"];
const orchestraIcons = ["🌾", "💧", "🌿"];
const orchestraSounds = ["rustle", "water", "curious"];

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function prepareExtraGame() {
  const g = miniGame;
  document.body.classList.add("in-extra-game");
  $("#extra-game").hidden = false;
  $("#extra-help").hidden = g.type !== "orchestra";
  $("#extra-title").textContent = { memory: "🃏 Gemüse-Memory", catch: "🧺 Gemüse-Fangen", orchestra: "🎶 Wiesen-Orchester" }[g.type];
  for (const [id, w] of Object.entries(walkers)) {
    takeOutside(w);
    w.mode = "mini-ready";
    w.x = id === "august" ? 22 : 78;
    w.y = 74;
    renderWalker(w, false);
  }
  g.buttons = [];
  g.open = [];
  g.matched = new Set();
  g.collected = 0;
  g.round = 0;
  const board = $("#extra-board");
  board.replaceChildren();
  board.dataset.game = g.type;
  const count = g.type === "memory" ? 6 : g.type === "catch" ? 9 : 3;
  for (let i = 0; i < count; i++) {
    const button = document.createElement("button");
    button.dataset.extra = String(i);
    button.addEventListener("click", () => playExtraMove(i));
    g.buttons.push(button);
    board.append(button);
  }
  if (g.type === "memory") g.cards = shuffled(["🥕", "🥕", "🥒", "🥒", "🫑", "🫑"]);
  if (g.type === "catch") nextGardenPatch();
  if (g.type === "orchestra") nextOrchestraRound();
  drawExtraGame();
}

function nextGardenPatch() {
  const g = miniGame;
  g.targetFood = gardenFoods[g.collected % gardenFoods.length];
  g.cards = Array.from({ length: 9 }, () => gardenFoods[Math.floor(Math.random() * gardenFoods.length)]);
  g.cards[Math.floor(Math.random() * 9)] = g.targetFood;
  g.timer = 2.8;
  g.phase = "ready";
}

function nextOrchestraRound(repeat = false) {
  const g = miniGame;
  if (!repeat) g.sequence = Array.from({ length: g.round + 2 }, () => Math.floor(Math.random() * 3));
  g.phase = "showing";
  g.timer = 0;
  g.playback = 0;
  g.input = 0;
  g.flash = g.sequence[0];
  tone(orchestraSounds[g.flash]);
}

function drawExtraGame() {
  const g = miniGame;
  if (!g || !["memory", "catch", "orchestra"].includes(g.type)) return;
  g.buttons.forEach((button, index) => {
    const faceUp = g.type !== "memory" || g.open.includes(index) || g.matched.has(index);
    button.textContent = g.type === "orchestra" ? orchestraIcons[index] : faceUp ? g.cards[index] : "🌼";
    button.disabled = g.phase !== "ready" || g.matched.has(index) || g.open.includes(index);
    button.classList.toggle("matched", g.matched.has(index));
    button.classList.toggle("lit", g.type === "orchestra" && index === g.flash);
    button.setAttribute("aria-label", g.type === "memory" ? `Karte ${index + 1}: ${faceUp ? g.cards[index] : "verdeckt"}` : button.textContent);
    button.setAttribute("aria-pressed", g.open.includes(index) || g.matched.has(index));
  });
  $("#extra-cue").textContent = g.phase === "won" ? "🐹 💛 🏆" : g.type === "memory" ? "🌼 + 🌼 → 🥕🥕 💛" : g.type === "catch" ? `${g.targetFood} → 🧺  ${g.collected}/6` : g.phase === "showing" ? "👀 🎵 …" : `👉 ${g.sequence.map((_, i) => i < g.input ? "★" : "☆").join(" ")}`;
  $("#extra-help").disabled = g.phase !== "ready";
}

function playExtraMove(index) {
  const g = miniGame;
  if (paused || !g || !["memory", "catch", "orchestra"].includes(g.type) || g.phase !== "ready" || !Number.isInteger(index) || !g.buttons[index]) return;
  if (g.type === "memory") {
    if (g.open.includes(index) || g.matched.has(index)) return;
    g.open.push(index);
    tone("rustle");
    if (g.open.length === 2) {
      if (g.cards[g.open[0]] === g.cards[g.open[1]]) {
        g.open.forEach(i => g.matched.add(i));
        g.open = [];
        g.score++;
        tone("happy");
      } else { g.phase = "peek"; g.timer = 1.2; }
    }
  } else if (g.type === "catch") {
    if (g.cards[index] !== g.targetFood) {
      g.buttons[index].classList.add("try-again");
      return;
    }
    g.collected++;
    g.score = Math.floor(g.collected / 2);
    g.phase = "harvest";
    g.timer = 0.5;
    tone("happy");
    g.ids.forEach(id => effect(id, "🥕"));
  } else {
    tone(orchestraSounds[index]);
    if (index !== g.sequence[g.input]) { nextOrchestraRound(true); drawExtraGame(); return; }
    g.input++;
    g.flash = index;
    if (g.input === g.sequence.length) {
      g.score++;
      g.round++;
      g.phase = "round-end";
      g.timer = 1;
    }
  }
  starDisplay(g.score);
  if (g.score === 3) winMiniGame();
  drawExtraGame();
}

function stepExtraGame(dt) {
  const g = miniGame;
  if (paused || !g || g.phase === "won") return;
  if (g.type === "orchestra" && g.phase === "showing") {
    g.timer += dt;
    const beat = Math.floor(g.timer / 1.05);
    if (beat >= g.sequence.length) { g.phase = "ready"; g.flash = -1; }
    else {
      if (beat !== g.playback) { g.playback = beat; tone(orchestraSounds[g.sequence[beat]]); }
      g.flash = g.timer % 1.05 < 0.7 ? g.sequence[beat] : -1;
    }
    drawExtraGame();
    return;
  }
  if (g.phase === "peek" || g.phase === "round-end" || g.type === "catch") {
    g.timer -= dt;
    if (g.timer > 0) return;
    if (g.type === "memory") { g.open = []; g.phase = "ready"; }
    else if (g.type === "catch") {
      g.buttons.forEach(button => button.classList.remove("try-again"));
      nextGardenPatch();
    } else nextOrchestraRound();
    drawExtraGame();
  }
}

function closeExtraGame() {
  $("#extra-game").hidden = true;
  $("#extra-board").replaceChildren();
  document.body.classList.remove("in-extra-game");
}

$("#extra-help").addEventListener("click", () => {
  if (!paused && miniGame?.type === "orchestra" && miniGame.phase === "ready") {
    nextOrchestraRound(true);
    drawExtraGame();
  }
});
