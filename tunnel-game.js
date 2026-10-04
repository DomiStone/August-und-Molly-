"use strict";

const MAZE_SIZE = 5;
const MAZE_GOAL = MAZE_SIZE * MAZE_SIZE - 1;
const MAZE_COMPLETE = 31;
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
  Object.assign(g, makeMazeRiddles(g.maze));
  g.inventory = 0;
  g.message = "Sammle Schlüssel A und B sowie 3 Zutaten. Dann zum Picknick 🧺!";
  g.hintCell = null;
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
    const t = Math.max(0, (progress - delay) / (1 - delay));
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
    button.classList.toggle("maze-hint", cell === g.hintCell);
    const gate = g.gates.find(gate => gate.cell === cell);
    const item = g.items.find(item => item.cell === cell && !(g.inventory & item.bit));
    const locked = gate && !(g.inventory & gate.bit);
    button.classList.toggle("maze-locked", Boolean(locked));
    button.textContent = locked ? `🔒${gate.name}` : item ? item.symbol : cell === MAZE_GOAL ? "🧺" : "";
    button.setAttribute("aria-label", `Raum ${Math.floor(cell / MAZE_SIZE) + 1}, ${cell % MAZE_SIZE + 1}${locked ? ", Tür " + gate.name + ": Schlüssel fehlt" : item ? ", " + item.label : cell === MAZE_GOAL ? ", Picknickziel" : ""}`);
    button.setAttribute("aria-current", cell === g.cell ? "location" : "false");
  });
  $("#tunnel-hint").textContent = g.phase === "won"
    ? "Picknick geschafft! Noch einmal mit neuen Wegen und Verstecken?"
    : g.message;
  const foodCount = g.items.filter(item => item.bit >= 4 && (g.inventory & item.bit)).length;
  $("#tunnel-inventory").textContent = `Schlüssel A ${g.inventory & 1 ? "✓" : "○"} · B ${g.inventory & 2 ? "✓" : "○"} · Zutaten ${foodCount}/3`;
  $("#tunnel-tip").disabled = g.phase !== "ready";
}

function moveThroughMaze(cell) {
  const g = miniGame;
  if (paused || g?.type !== "tunnel" || g.phase !== "ready" || !g.maze[g.cell].includes(cell)) return;
  const gate = g.gates.find(gate => gate.cell === cell);
  if (gate && !(g.inventory & gate.bit)) {
    g.message = `Diese Tür braucht Schlüssel ${gate.name}. Suche 🔑${gate.name} in einem anderen Gang.`;
    drawTunnelPuzzle();
    return;
  }
  g.hintCell = null;
  g.from = g.cell;
  g.to = cell;
  g.timer = 0;
  g.phase = "travelling";
  drawTunnelPuzzle();
  tone("rustle");
}

function stepTunnelPuzzle(dt) {
  const g = miniGame;
  if (paused || g?.type !== "tunnel" || g.phase !== "travelling") return;
  g.timer += dt;
  const progress = Math.min(1, g.timer / 0.65);
  positionTunnelToken(g.from, g.to, progress);
  if (progress < 1) return;
  g.cell = g.to;
  g.visited.add(g.cell);
  g.phase = "ready";
  const item = g.items.find(item => item.cell === g.cell && !(g.inventory & item.bit));
  if (item) {
    g.inventory |= item.bit;
    g.message = item.bit < 4 ? `${item.label} gefunden! Die passende Tür ist jetzt offen.` : `${item.label} im Picknickkorb! Suche die übrigen Zutaten.`;
    tone("happy");
  }
  g.score = Math.min(2, g.items.filter(item => item.bit >= 4 && (g.inventory & item.bit)).length);
  if (g.cell === MAZE_GOAL) {
    if (g.inventory === MAZE_COMPLETE) { g.score = 3; winMiniGame(); }
    else g.message = "Der Picknickkorb ist noch nicht voll. Suche alle 3 Zutaten und beide Schlüssel!";
  }
  starDisplay(g.score);
  drawTunnelPuzzle();
}

function closeTunnelPuzzle() {
  $("#tunnel-puzzle").hidden = true;
  $("#tunnel-grid").replaceChildren();
  document.body.classList.remove("in-tunnel-game");
}

$("#tunnel-game").addEventListener("click", () => startMiniGame("tunnel"));

// Each key is placed on the reachable side of its own door. Doors are on
// the unique start-to-goal route, so both locks matter and cannot trap a pet.
function makeMazeRiddles(maze) {
  const route = mazeSolution(maze);
  const gates = [1, 2].map((bit, index) => ({
    cell: route[Math.floor((route.length - 1) * (index + 1) / 3)],
    bit,
    name: index === 0 ? "A" : "B",
  }));
  const used = new Set([0, MAZE_GOAL, ...gates.map(gate => gate.cell)]);
  const items = [];
  for (const gate of gates) {
    const blocked = new Set(gates.filter(other => other.bit >= gate.bit).map(other => other.cell));
    const reachable = [0], seen = new Set([0]);
    for (let i = 0; i < reachable.length; i++) {
      for (const cell of maze[reachable[i]]) {
        if (!seen.has(cell) && !blocked.has(cell)) { seen.add(cell); reachable.push(cell); }
      }
    }
    const cell = chooseMazeHidingPlace(maze, reachable.filter(cell => !used.has(cell)), route);
    used.add(cell);
    items.push({ cell, bit: gate.bit, symbol: `🔑${gate.name}`, label: `Schlüssel ${gate.name}` });
  }
  for (const [index, [symbol, label]] of [["🥕", "Karotte"], ["🥒", "Gurke"], ["🌿", "Kräuter"]].entries()) {
    const cell = chooseMazeHidingPlace(maze, maze.map((_, cell) => cell).filter(cell => !used.has(cell)), route);
    used.add(cell);
    items.push({ cell, bit: 4 << index, symbol, label });
  }
  return { gates, items };
}

function chooseMazeHidingPlace(maze, candidates, route) {
  // Prefer side corridors and dead ends: finding the exit alone is not enough.
  const detours = candidates.filter(cell => !route.includes(cell));
  const pool = detours.length ? detours : candidates;
  const deadEnds = pool.filter(cell => maze[cell].length === 1);
  const choices = deadEnds.length ? deadEnds : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

function showMazeTip() {
  const g = miniGame;
  if (paused || g?.type !== "tunnel" || g.phase !== "ready") return;
  // Search (room, inventory), not just rooms: a useful route may backtrack
  // after collecting a key. Reveal one step only, never move for the player.
  const queue = [{ cell: g.cell, inventory: g.inventory, first: null }];
  const seen = new Set([`${g.cell}:${g.inventory}`]);
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    if (state.cell === MAZE_GOAL && state.inventory === MAZE_COMPLETE) {
      g.hintCell = state.first;
      g.message = "Der umrandete Nachbarraum führt dich weiter. Du darfst jederzeit zurückgehen.";
      drawTunnelPuzzle();
      return;
    }
    for (const cell of g.maze[state.cell]) {
      const gate = g.gates.find(gate => gate.cell === cell);
      if (gate && !(state.inventory & gate.bit)) continue;
      const item = g.items.find(item => item.cell === cell);
      const inventory = state.inventory | (item?.bit || 0);
      const key = `${cell}:${inventory}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ cell, inventory, first: state.first ?? cell });
    }
  }
}

$("#tunnel-tip").addEventListener("click", showMazeTip);
