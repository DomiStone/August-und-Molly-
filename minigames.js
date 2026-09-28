"use strict";
let miniGame = null;
const danceMoves = ["wiggle", "twirl", "bounce"],
  danceIcons = { wiggle: "↔️", twirl: "🐾", bounce: "✨" };
function hideGames() {
  $("#games-drawer").hidden = true;
  $("#games").setAttribute("aria-expanded", false);
}
$("#games").addEventListener("click", () => {
  if (paused) return;
  if (typeof closeCompanionPanel === "function") closeCompanionPanel(false);
  closeFood();
  const show = $("#games-drawer").hidden;
  $("#games-drawer").hidden = !show;
  $("#games").setAttribute("aria-expanded", show);
});
function starDisplay(score) {
  $$(".mini-stars span").forEach((s, i) => {
    s.textContent = i < score ? "★" : "☆";
    s.classList.toggle("earned", i < score);
  });
}
function endMiniGame() {
  if (!miniGame) return;
  miniGame = null;
  $("#mini-ui").hidden = true;
  document.body.classList.remove("in-minigame");
  for (const [id, w] of Object.entries(walkers)) {
    resetAppearance(w);
    sendPet(id, id === "august" ? 29 : 73, 66);
  }
}
function startMiniGame(type) {
  if (paused) return;
  if (typeof cancelAllCompanionActions === "function") cancelAllCompanionActions();
  if (typeof closeCompanionPanel === "function") closeCompanionPanel(false);
  cancelAllFeeding();
  endMiniGame();
  stopSearch();
  closeFood();
  hideGames();
  miniGame = {
    type,
    score: 0,
    phase: "ready",
    ids: [...selected],
    index: 0,
    timer: 0,
    target: "wiggle",
    lock: 0,
  };
  $("#mini-ui").hidden = false;
  document.body.classList.add("in-minigame");
  $("#hurdle").hidden = type !== "jump";
  $("#jump-now").hidden = type !== "jump";
  $("#dance-controls").hidden = type !== "dance";
  $("#dance-cue").hidden = type !== "dance";
  $("#mini-again").hidden = true;
  starDisplay(0);
  if (type === "jump") prepareJump();
  else {
    for (const [id, w] of Object.entries(walkers)) {
      takeOutside(w);
      w.x = id === "august" ? 34 : 67;
      w.y = 64;
      w.mode = "mini-ready";
      renderWalker(w, false);
    }
    nextDanceCue();
  }
  react(type === "jump" ? "🐹 ↗ 🪵" : "🎵 ↔️");
}
function prepareJump() {
  const g = miniGame;
  if (!g) return;
  g.phase = "ready";
  g.pet = g.ids[g.index % g.ids.length];
  for (const [id, w] of Object.entries(walkers)) {
    takeOutside(w);
    w.x = id === g.pet ? 31 : 77;
    w.y = id === g.pet ? 63 : 75;
    w.direction = 1;
    w.mode = "mini-ready";
    w.gait = 0;
    renderWalker(w, false);
  }
  $("#jump-now").disabled = false;
}
function nextDanceCue() {
  if (!miniGame) return;
  miniGame.target = danceMoves[miniGame.score % 3];
  $("#dance-cue").textContent = danceIcons[miniGame.target];
  $("#dance-cue").classList.remove("correct");
}
function winMiniGame() {
  const g = miniGame;
  if (typeof rememberMoment === "function") rememberMoment(g.type);
  g.phase = "won";
  $("#jump-now").hidden = true;
  $("#dance-controls").hidden = true;
  $("#dance-cue").hidden = true;
  $("#mini-again").hidden = false;
  react("🏆🌟");
  tone();
  for (const id of g.ids) {
    doBehavior(id, "dancing", 6);
    walkers[id].danceKind = "wiggle";
    pets[id].joy = 100;
    effect(id, "🌟");
  }
  update();
  message("Drei Sterne! Die Meerschweinchen feiern mit einem Wackeltanz.");
}
$("#hurdle-game").addEventListener("click", () => startMiniGame("jump"));
$("#dance-game").addEventListener("click", () => startMiniGame("dance"));
$("#mini-close").addEventListener("click", () => {
  if (!paused) endMiniGame();
});
$("#mini-again").addEventListener("click", () => {
  if (miniGame && !paused) startMiniGame(miniGame.type);
});
$("#jump-now").addEventListener("click", () => {
  const g = miniGame;
  if (paused || !g || g.type !== "jump" || g.phase !== "ready") return;
  g.phase = "jumping";
  g.timer = 0;
  const w = walkers[g.pet];
  w.mode = "mini-jump";
  w.el.classList.add("mini-jump");
  $("#jump-now").disabled = true;
  tone();
});
$$("[data-dance]").forEach((b) =>
  b.addEventListener("click", () => {
    const g = miniGame;
    if (paused || !g || g.type !== "dance" || g.phase === "won" || g.lock > 0)
      return;
    const move = b.dataset.dance;
    for (const id of g.ids) {
      doBehavior(id, move === "bounce" ? "hopping" : "dancing", 2.2);
      walkers[id].danceKind = move;
    }
    tone();
    if (move === g.target) {
      g.score++;
      starDisplay(g.score);
      g.lock = 1.1;
      g.phase = "dance-feedback";
      $("#dance-cue").classList.add("correct");
      g.ids.forEach((id) => effect(id, "★"));
      if (g.score === 3) winMiniGame();
    } else {
      g.lock = 0.6;
      react(danceIcons[g.target]);
    }
  }),
);
function stepMiniGame(dt) {
  const g = miniGame;
  if (!g) return;
  g.lock = Math.max(0, g.lock - dt);
  if (g.type === "jump" && g.phase === "jumping") {
    g.timer += dt;
    const t = Math.min(1, g.timer / 1.65),
      w = walkers[g.pet];
    w.x = 31 + 38 * t;
    w.y = 63;
    w.gait += dt * 14;
    w.el.style.setProperty(
      "--jump-y",
      -Math.sin(Math.PI * t) * Math.min(140, Math.max(75, innerHeight * 0.18)) +
        "px",
    );
    if (t >= 1) {
      w.el.style.removeProperty("--jump-y");
      w.el.classList.remove("mini-jump");
      g.score++;
      starDisplay(g.score);
      effect(g.pet, "⭐");
      tone();
      if (g.score === 3) {
        winMiniGame();
      } else {
        doBehavior(g.pet, "dancing", 1.1);
        w.danceKind = "wiggle";
        g.phase = "jump-feedback";
        g.timer = 1.3;
      }
    }
  } else if (g.phase === "jump-feedback") {
    g.timer -= dt;
    if (g.timer <= 0) {
      g.index++;
      prepareJump();
    }
  } else if (g.phase === "dance-feedback" && g.lock === 0) {
    g.phase = "ready";
    nextDanceCue();
  }
}
document.addEventListener("keydown", (e) => {
  if (
    (e.code === "Space" || e.code === "ArrowUp") &&
    miniGame?.type === "jump" &&
    e.target === document.body
  ) {
    e.preventDefault();
    $("#jump-now").click();
  }
});
