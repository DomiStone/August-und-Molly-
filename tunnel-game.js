"use strict";

// A randomized spanning tree guarantees that all nine tunnel rooms are reachable.
function mazeNeighbors(cell) {
  const result = [];
  if (cell >= 3) result.push(cell - 3);
  if (cell % 3 < 2) result.push(cell + 1);
  if (cell < 6) result.push(cell + 3);
  if (cell % 3 > 0) result.push(cell - 1);
  return result;
}

function makeTunnelMaze() {
  const maze = Array.from({ length: 9 }, () => []);
  const visited = new Set([0]), stack = [0];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = mazeNeighbors(current).filter(cell => !visited.has(cell));
    if (!options.length) { stack.pop(); continue; }
    const next = options[Math.floor(Math.random() * options.length)];
    maze[current].push(next);
    maze[next].push(current);
    visited.add(next);
    stack.push(next);
  }
  return maze;
}

function prepareTunnelPuzzle() {
  const g = miniGame;
  g.maze = makeTunnelMaze();
  g.cell = 0;
  g.visited = new Set([0]);
  g.phase = "ready";
  g.buttons = [];
  document.body.classList.add("in-tunnel-game");
  $("#tunnel-puzzle").hidden = false;
  const grid = $("#tunnel-grid");
  grid.replaceChildren();
  for (let cell = 0; cell < 9; cell++) {
    const button = document.createElement("button");
    button.className = "tunnel-cell";
    button.dataset.cell = cell;
    button.setAttribute("aria-label", `Tunnelraum ${Math.floor(cell / 3) + 1}, ${cell % 3 + 1}${cell === 8 ? ", Gemüseziel" : ""}`);
    button.textContent = cell === 8 ? "🥬" : "";
    const directions = [cell - 3, cell + 1, cell + 3, cell - 1];
    ["Top", "Right", "Bottom", "Left"].forEach((side, index) => {
      if (g.maze[cell].includes(directions[index])) button.style[`border${side}Color`] = "transparent";
    });
    button.addEventListener("click", () => moveThroughMaze(cell));
    grid.append(button);
    g.buttons.push(button);
  }
  const token = document.createElement("img");
  token.id = "tunnel-token";
  token.src = `assets/${g.ids[0]}.png`;
  token.alt = "";
  grid.append(token);
  g.token = token;
  for (const [id, w] of Object.entries(walkers)) {
    takeOutside(w);
    w.mode = "mini-ready";
    w.x = id === "august" ? 24 : 78;
    w.y = 69;
    renderWalker(w, false);
  }
  drawTunnelPuzzle();
  positionTunnelToken(0, 0, 1);
}

function positionTunnelToken(from, to, progress) {
  const g = miniGame;
  if (!g?.token) return;
  const x = from % 3 + ((to % 3) - (from % 3)) * progress;
  const y = Math.floor(from / 3) + (Math.floor(to / 3) - Math.floor(from / 3)) * progress;
  g.token.style.left = (x + 0.5) * 100 / 3 + "%";
  g.token.style.top = (y + 0.5) * 100 / 3 + "%";
}

function drawTunnelPuzzle() {
  const g = miniGame;
  if (g?.type !== "tunnel") return;
  g.buttons.forEach((button, cell) => {
    button.disabled = g.phase !== "ready" || !g.maze[g.cell].includes(cell);
    button.classList.toggle("visited", g.visited.has(cell));
    button.setAttribute("aria-current", cell === g.cell ? "location" : "false");
  });
  $("#tunnel-hint").textContent = g.phase === "won"
    ? "Gefunden! Noch eine Runde mit neuen Wegen?"
    : "Tippe auf einen Nachbarraum mit offenem Gang. Zurückgehen ist erlaubt.";
}

function moveThroughMaze(cell) {
  const g = miniGame;
  if (paused || g?.type !== "tunnel" || g.phase !== "ready" || !g.maze[g.cell].includes(cell)) return;
  g.from = g.cell;
  g.to = cell;
  g.timer = 0;
  g.phase = "travelling";
  drawTunnelPuzzle();
  tone("rustle");
}

function stepTunnelPuzzle(dt) {
  const g = miniGame;
  if (g?.type !== "tunnel" || g.phase !== "travelling") return;
  g.timer += dt;
  const progress = Math.min(1, g.timer / 0.65);
  positionTunnelToken(g.from, g.to, progress);
  if (progress < 1) return;
  g.cell = g.to;
  g.visited.add(g.cell);
  g.phase = "ready";
  g.score = Math.min(2, Math.floor((g.visited.size - 1) / 3));
  if (g.cell === 8) { g.score = 3; winMiniGame(); }
  starDisplay(g.score);
  drawTunnelPuzzle();
}

function closeTunnelPuzzle() {
  $("#tunnel-puzzle").hidden = true;
  $("#tunnel-grid").replaceChildren();
  document.body.classList.remove("in-tunnel-game");
}

$("#tunnel-game").addEventListener("click", () => startMiniGame("tunnel"));
