"use strict";

const MAZE_SIZE = 4;
const MAZE_GOAL = MAZE_SIZE * MAZE_SIZE - 1;
let previousMazeRoute = "";

// A spanning tree creates reachable rooms, junctions and harmless dead ends.
function mazeNeighbors(cell) {
  const result = [];
  if (cell >= MAZE_SIZE) result.push(cell - MAZE_SIZE);
  if (cell % MAZE_SIZE < MAZE_SIZE - 1) result.push(cell + 1);
  if (cell < MAZE_SIZE * (MAZE_SIZE - 1)) result.push(cell + MAZE_SIZE);
  if (cell % MAZE_SIZE > 0) result.push(cell - 1);
  return result;
}

function buildTunnelMaze() {
  const maze = Array.from({ length: MAZE_SIZE * MAZE_SIZE }, () => []);
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

function mazeSolution(maze) {
  const queue = [[0]], seen = new Set([0]);
  while (queue.length) {
    const route = queue.shift(), cell = route[route.length - 1];
    if (cell === MAZE_GOAL) return route;
    for (const next of maze[cell]) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...route, next]);
    }
  }
  return [];
}

function makeTunnelMaze() {
  let maze, route;
  for (let attempt = 0; attempt < 12; attempt++) {
    maze = buildTunnelMaze();
    route = mazeSolution(maze).join(",");
    if (route !== previousMazeRoute) break;
  }
  if (route === previousMazeRoute) {
    // Bounded fallback also works with a constant random source in tests.
    for (const transpose of [false, true]) {
      maze = Array.from({ length: MAZE_SIZE * MAZE_SIZE }, () => []);
      const cells = [];
      for (let row = 0; row < MAZE_SIZE; row++) {
        for (let offset = 0; offset < MAZE_SIZE; offset++) {
          const col = row % 2 ? MAZE_SIZE - 1 - offset : offset;
          cells.push(transpose ? col * MAZE_SIZE + row : row * MAZE_SIZE + col);
        }
      }
      for (let i = 1; i < cells.length; i++) {
        maze[cells[i - 1]].push(cells[i]);
        maze[cells[i]].push(cells[i - 1]);
      }
      route = mazeSolution(maze).join(",");
      if (route !== previousMazeRoute) break;
    }
  }
  previousMazeRoute = route;
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
  for (let cell = 0; cell <= MAZE_GOAL; cell++) {
    const button = document.createElement("button");
    button.className = "tunnel-cell";
    button.dataset.cell = cell;
    button.setAttribute("aria-label", `Tunnelraum ${Math.floor(cell / MAZE_SIZE) + 1}, ${cell % MAZE_SIZE + 1}${cell === MAZE_GOAL ? ", Gemüseziel" : ""}`);
    button.textContent = cell === MAZE_GOAL ? "🥬" : "";
    const directions = [cell - MAZE_SIZE, cell + 1, cell + MAZE_SIZE, cell - 1];
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
  if (g.ids.length > 1) {
    const buddy = document.createElement("img");
    buddy.id = "tunnel-buddy";
    buddy.src = `assets/${g.ids[1]}.png`;
    buddy.alt = "";
    grid.append(buddy);
    g.buddy = buddy;
  }
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
  for (const [token, delay] of [[g.token, 0], [g.buddy, 0.18]]) {
    if (!token) continue;
    const t = progress === 1 ? 1 : Math.max(0, progress - delay);
    const x = from % MAZE_SIZE + ((to % MAZE_SIZE) - (from % MAZE_SIZE)) * t;
    const y = Math.floor(from / MAZE_SIZE) + (Math.floor(to / MAZE_SIZE) - Math.floor(from / MAZE_SIZE)) * t;
    token.style.left = (x + (delay ? 0.3 : 0.62)) * 100 / MAZE_SIZE + "%";
    token.style.top = (y + (delay ? 0.65 : 0.43)) * 100 / MAZE_SIZE + "%";
  }
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
    : g.ids.map(id => pets[id].name).join(" & ") + ": Finde den Weg zum Gemüse. Tippe auf einen offenen Nachbarraum; Sackgasse? Gehe zurück.";
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
  if (g.cell === MAZE_GOAL) { g.score = 3; winMiniGame(); }
  starDisplay(g.score);
  drawTunnelPuzzle();
}

function closeTunnelPuzzle() {
  $("#tunnel-puzzle").hidden = true;
  $("#tunnel-grid").replaceChildren();
  document.body.classList.remove("in-tunnel-game");
}

$("#tunnel-game").addEventListener("click", () => startMiniGame("tunnel"));
