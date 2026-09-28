"use strict";
const walkers = {},
  clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let previousFrame = 0,
  simulationTime = 0;
const DOOR = { x: 50.25, y: 37 };
for (const [id, x, y] of [
  ["august", 31, 62],
  ["molly", 69, 69],
]) {
  const el = $("#" + id),
    body = document.createElement("span"),
    sprite = document.createElement("span"),
    scratch = document.createElement("span");
  body.className = "walking-body";
  sprite.className = "walk-sprite";
  body.append(sprite);
  scratch.className = "scratch-body";
  const dance = document.createElement("span");
  dance.className = "dance-body";
  el.insertBefore(dance, el.querySelector("img"));
  el.insertBefore(body, el.querySelector("img"));
  el.insertBefore(scratch, el.querySelector("img"));
  walkers[id] = {
    id,
    el,
    body,
    sprite,
    scratch,
    dance,
    x,
    y,
    tx: id === "august" ? 67 : 32,
    ty: id === "august" ? 56 : 76,
    vx: 0,
    vy: 0,
    direction: id === "august" ? 1 : -1,
    gait: 0,
    mode: "walk",
    timer: 0,
    wait: 0,
    arrival: null,
    nextNatural: id === "august" ? 9 : 17,
    cycle: 0,
  };
  renderWalker(walkers[id], true);
}
function resetAppearance(w) {
  w.el.classList.remove(
    "scratching",
    "hopping",
    "eating",
    "cuddling",
    "entering",
    "in-house",
    "dancing",
    "mini-jump",
  );
  w.el.style.removeProperty("--jump-y");
  w.el.style.removeProperty("--entry-opacity");
  w.el.style.removeProperty("--entry-scale");
  $("#peek-" + w.id).classList.remove("visible");
}
function takeOutside(w) {
  if (["inside", "peeking", "entering", "exiting"].includes(w.mode)) {
    w.x = DOOR.x + (w.id === "august" ? -5 : 5);
    w.y = 43;
  }
  resetAppearance(w);
}
function sendPet(id, x, y, onArrival = null) {
  cancelFeeding(id);
  const w = walkers[id];
  takeOutside(w);
  w.tx = clamp(x, 17, 83);
  w.ty = clamp(y, 42, 80);
  w.wait = 0;
  w.timer = 0;
  w.mode = "walk";
  w.arrival = onArrival;
  w.nextNatural = simulationTime + 18 + Math.random() * 12;
}
function doBehavior(id, mode, duration = 3) {
  cancelFeeding(id);
  const w = walkers[id];
  takeOutside(w);
  w.mode = mode;
  w.timer = duration;
  w.total = duration;
  w.vx = 0;
  w.vy = 0;
  w.arrival = null;
  w.nextNatural = simulationTime + 15 + Math.random() * 12;
  w.el.classList.add(mode);
  renderWalker(w, false);
}
function goHome(id) {
  const w = walkers[id];
  sendPet(id, DOOR.x, 42);
  w.mode = "to-house";
  w.ty = DOOR.y;
  w.arrival = () => {
    w.mode = "entering";
    w.timer = 1.1;
    w.total = 1.1;
    w.el.classList.add("entering");
  };
}
function chooseDestination(w) {
  let x, y;
  for (let i = 0; i < 12; i++) {
    x = 19 + Math.random() * 62;
    y = 46 + Math.random() * 33;
    if (Math.hypot(x - w.x, (y - w.y) * 1.6) > 23) break;
  }
  sendPet(w.id, x, y);
}
function renderWalker(w, moving) {
  w.el.dataset.mode = w.mode;
  w.el.style.left = w.x + "%";
  w.el.style.top = w.y + "%";
  w.el.style.zIndex = w.y > 64 ? "5" : "4";
  w.el.style.setProperty(
    "--depth",
    clamp(0.65 + (w.y - 37) * 0.011, 0.65, 1.13),
  );
  w.el.style.setProperty("--facing", w.direction);
  w.el.style.setProperty(
    "--idle-facing",
    w.direction * (w.id === "august" ? 1 : -1),
  );
  w.el.classList.toggle("walking", moving);
  w.el.classList.toggle("sniffing", !moving && w.mode === "sniff");
  const frame = Math.floor(w.gait) % 8;
  w.sprite.style.backgroundPosition =
    ((frame % 4) * 100) / 3 + "% " + (frame < 4 ? 0 : 100) + "%";
}
function stepMovement(dt) {
  if (paused || document.hidden) return;
  simulationTime += dt;
  stepGameUi(dt);
  stepFeeding(dt);
  if (typeof stepMiniGame === "function") stepMiniGame(dt);
  for (const w of Object.values(walkers)) {
    if (w.mode === "feeding") {
      renderWalker(w, false);
      continue;
    }
    if (w.mode === "mini-ready" || w.mode === "mini-jump") {
      renderWalker(w, w.mode === "mini-jump");
      continue;
    }
    if (
      ["scratching", "hopping", "eating", "cuddling", "dancing"].includes(
        w.mode,
      )
    ) {
      w.timer -= dt;
      if (w.mode === "dancing") {
        const elapsed = w.total - w.timer;
        const rear =
          w.danceKind === "wiggle" ||
          (w.danceKind !== "twirl" && Math.floor(elapsed / 1.4) % 2 === 0);
        const f = Math.floor(elapsed * 7) % 4;
        w.dance.style.backgroundPosition =
          (f * 100) / 3 + "% " + (rear ? 0 : 100) + "%";
        w.dance.style.transform =
          "translateX(" +
          Math.sin(elapsed * 10) * 3 +
          "px) rotate(" +
          Math.sin(elapsed * 10) * 3 +
          "deg)";
      }
      if (w.mode === "scratching") {
        const phase = Math.floor((w.total - w.timer) * 8);
        const frame = w.timer < 0.3 ? 3 : [0, 1, 2, 1][phase % 4];
        w.scratch.style.backgroundPosition = (frame * 100) / 3 + "% 0";
        w.scratch.style.transform =
          "scaleX(" + w.direction * (w.id === "august" ? 1 : -1) + ")";
      }
      renderWalker(w, false);
      if (w.timer <= 0) {
        resetAppearance(w);
        w.mode = miniGame ? "mini-ready" : "sniff";
        w.wait = 0.8;
      }
      continue;
    }
    if (w.mode === "entering") {
      w.timer -= dt;
      const progress = clamp(w.timer / w.total, 0, 1);
      w.el.style.setProperty("--entry-opacity", progress);
      w.el.style.setProperty("--entry-scale", 0.2 + progress * 0.45);
      renderWalker(w, false);
      if (w.timer <= 0) {
        w.el.classList.remove("entering");
        w.el.classList.add("in-house");
        w.mode = "inside";
        w.timer = 0.8;
      }
      continue;
    }
    if (w.mode === "inside") {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.mode = "peeking";
        w.timer = 6;
        $("#peek-" + w.id).classList.add("visible");
      }
      continue;
    }
    if (w.mode === "peeking") {
      w.timer -= dt;
      const p = $("#peek-" + w.id + " span"),
        elapsed = 6 - w.timer;
      const frame = Math.floor(elapsed * 0.85) % 4;
      p.style.backgroundPosition = (frame * 100) / 3 + "% 0";
      p.style.setProperty(
        "--peek-lift",
        (elapsed < 0.65
          ? Math.max(0, 100 - (elapsed / 0.65) * 100)
          : w.timer < 0.65
            ? (1 - w.timer / 0.65) * 100
            : 0) + "%",
      );
      if (w.timer <= 0) {
        $("#peek-" + w.id).classList.remove("visible");
        w.mode = "exiting";
        w.timer = 1;
        w.el.classList.remove("in-house");
        w.el.classList.add("entering");
      }
      continue;
    }
    if (w.mode === "exiting") {
      w.timer -= dt;
      const t = clamp(1 - w.timer, 0, 1);
      w.el.style.setProperty("--entry-opacity", t);
      w.el.style.setProperty("--entry-scale", 0.2 + t * 0.45);
      renderWalker(w, false);
      if (w.timer <= 0) {
        resetAppearance(w);
        w.x = DOOR.x;
        w.y = 40;
        sendPet(w.id, w.id === "august" ? 29 : 73, 64);
      }
      continue;
    }
    if (
      !(typeof miniGame !== "undefined" && miniGame) &&
      !searchActive &&
      !feedings.has(w.id) &&
      w.mode !== "to-house" &&
      simulationTime >= w.nextNatural
    ) {
      w.cycle++;
      if (w.cycle % 3 === 2) goHome(w.id);
      else
        doBehavior(
          w.id,
          w.cycle % 3 === 1 ? "scratching" : "hopping",
          w.cycle % 3 === 1 ? 3.6 : 1.65,
        );
      continue;
    }
    if (w.wait > 0) {
      w.wait = Math.max(0, w.wait - dt);
      renderWalker(w, false);
      if (w.wait === 0) {
        const next = w.nextNatural;
        chooseDestination(w);
        w.nextNatural = next;
      }
      continue;
    }
    const dx = w.tx - w.x,
      dy = w.ty - w.y,
      dist = Math.hypot(dx, dy * 1.65);
    if (dist < 0.9) {
      w.vx = 0;
      w.vy = 0;
      w.wait = 1.5 + Math.random() * 2;
      const arrival = w.arrival;
      w.arrival = null;
      w.mode = "sniff";
      renderWalker(w, false);
      if (arrival) arrival();
      continue;
    }
    let hx = dx / dist,
      hy = dy / dist;
    const other = Object.values(walkers).find((p) => p !== w);
    const sx = w.x - other.x,
      sy = (w.y - other.y) * 1.8,
      sep = Math.hypot(sx, sy);
    if (
      sep < 17 &&
      !feedings.has(w.id) &&
      w.mode !== "to-house" &&
      !["inside", "peeking", "entering"].includes(other.mode)
    ) {
      const force = (17 - sep) / 17;
      hx += (sx / (sep || 1)) * force * 0.85;
      hy += (sy / (sep || 1)) * force * 0.85;
      if (Math.abs(sy) < 4) hy += (w.id === "august" ? -1 : 1) * force * 0.8;
    }
    const length = Math.hypot(hx, hy * 1.65) || 1,
      speed = (w.id === "august" ? 10 : 8.8) * Math.min(1, 0.4 + dist / 8),
      blend = Math.min(1, dt * 5);
    w.vx += ((hx / length) * speed - w.vx) * blend;
    w.vy += ((hy / length) * speed - w.vy) * blend;
    w.x = clamp(w.x + w.vx * dt, 17, 83);
    w.y = clamp(w.y + w.vy * dt, w.mode === "to-house" ? DOOR.y : 39, 80);
    if (Math.abs(w.vx) > 0.7) w.direction = w.vx > 0 ? 1 : -1;
    const velocity = Math.hypot(w.vx, w.vy * 1.65);
    w.gait += dt * velocity * 1.35;
    renderWalker(w, velocity > 0.2);
  }
}
function frame(now) {
  const dt = previousFrame ? Math.min((now - previousFrame) / 1000, 0.045) : 0;
  previousFrame = now;
  stepMovement(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
$("#habitat").addEventListener("click", (e) => {
  if (
    paused ||
    searchActive ||
    (typeof miniGame !== "undefined" && miniGame) ||
    e.target.closest("button,nav,.top-tools")
  )
    return;
  closeFood();
  hideGames();
  const r = $("#habitat").getBoundingClientRect(),
    x = ((e.clientX - r.left) / r.width) * 100,
    y = ((e.clientY - r.top) / r.height) * 100;
  if (y < 38 || y > 85) return;
  const centerX = selected.length === 2 ? clamp(x, 27, 73) : x;
  selected.forEach((id, i) =>
    sendPet(id, centerX + (selected.length === 2 ? (i ? 10 : -10) : 0), y),
  );
});
