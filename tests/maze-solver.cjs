// Independent breadth-first oracle used by VM and real-browser tests.
module.exports = function solvePuzzle({ maze, gates, items, cell = 0, inventory = 0 }) {
  const queue = [{ route: [cell], inventory }];
  const seen = new Set([`${cell}:${inventory}`]);
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i], current = state.route.at(-1);
    if (current === maze.length - 1 && state.inventory === 31) return state.route;
    for (const next of maze[current]) {
      if (gates.some(gate => gate.cell === next && !(state.inventory & gate.bit))) continue;
      const bits = items.filter(item => item.cell === next).reduce((bits, item) => bits | item.bit, state.inventory);
      const key = `${next}:${bits}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ route: [...state.route, next], inventory: bits });
    }
  }
  return null;
};
