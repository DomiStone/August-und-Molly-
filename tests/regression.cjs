const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const solvePuzzle = require("./maze-solver.cjs");
process.chdir(path.join(__dirname, ".."));

class Element {
  constructor() {
    this.style = {
      setProperty: (k, v) => (this.style[k] = v),
      removeProperty: (k) => delete this.style[k],
    };
    this.dataset = {};
    this.attrs = {};
    this.handlers = {};
    this.children = [];
    this.nodes = {};
    this.clientWidth = 1024;
    this.clientHeight = 600;
    this.offsetWidth = 225;
    this.classes = new Set();
    this.classList = {
      add: (...v) => v.forEach((x) => this.classes.add(x)),
      remove: (...v) => v.forEach((x) => this.classes.delete(x)),
      toggle: (x, v) => (v ? this.classes.add(x) : this.classes.delete(x)),
    };
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  querySelector(k) {
    return (this.nodes[k] ||= new Element());
  }
  querySelectorAll() {
    return (this.straws ||= Array.from({ length: 16 }, () => new Element()));
  }
  addEventListener(k, f) {
    (this.handlers[k] ||= []).push(f);
  }
  append(e) {
    e.parent = this;
    this.children.push(e);
  }
  insertBefore(e) {
    this.append(e);
  }
  replaceChildren() {
    this.children = [];
  }
  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter((e) => e !== this);
  }
  focus() {}
  click() {
    for (const f of this.handlers.click || []) f({ target: this });
  }
}
const map = {},
  el = (s) => (map[s] ||= new Element());
const foods = ["Karotte", "Gurke", "Paprika", "Salat", "Heu"].map((food) => {
  const e = new Element();
  e.dataset.food = food;
  return e;
});
const dance = ["wiggle", "twirl", "bounce"].map((move) => {
  const e = new Element();
  e.dataset.dance = move;
  return e;
});
const groups = {
  "[data-food]": foods,
  "[data-dance]": dance,
  ".mini-stars span": Array.from({ length: 3 }, () => new Element()),
  "#search-progress span": Array.from({ length: 3 }, () => new Element()),
};
const context = vm.createContext({
  localStorage: {
    value: null,
    getItem() { return this.value; },
    setItem(key, value) { this.value = value; },
  },
  document: {
    querySelector: el,
    querySelectorAll: (s) => groups[s] || [],
    createElement: () => new Element(),
    addEventListener: () => {},
    body: el("body"),
    hidden: false,
  },
  window: { addEventListener: () => {} },
  requestAnimationFrame: () => {},
  innerHeight: 600,
  console,
  setTimeout: () => {
    throw Error("Unowned timeout added");
  },
  setInterval: () => {
    throw Error("Unowned interval added");
  },
});
for (const name of ["game", "food-view", "feeding", "movement", "minigames", "extra-games", "companions", "family", "world", "tunnel-game", "play-menu"])
  vm.runInContext(fs.readFileSync(name + ".js", "utf8"), context, {
    filename: name + ".js",
  });
const run = (code) => vm.runInContext(code, context);
const step = (seconds) =>
  run(`for(let i=0;i<${seconds * 60};i++)stepMovement(1/60)`);
// Focused manual-feeding regressions have no unattended rack meals in flight.
// The autonomous stocked-rack chain is exercised separately below.
run("world.hay=0");
for (const ids of [["august"], ["molly"], ["august", "molly"]]) {
  for (const [index, type] of [
    "Karotte",
    "Gurke",
    "Paprika",
    "Salat",
    "Heu",
  ].entries()) {
    run(
      `select(${JSON.stringify(ids)}); pets.august.food=50; pets.molly.food=50`,
    );
    foods[index].click();
    assert.equal(run("feedings.size"), ids.length);
    for (let i = 0; i < 10; i++) foods[index].click();
    assert.equal(run("feedings.size"), ids.length);
    assert.equal(el("#food-layer").children.length, ids.length);
    step(30);
    assert.equal(run("feedings.size"), 0, `${type} ${ids} did not finish`);
    assert.equal(el("#food-layer").children.length, 0);
    for (const id of ids) assert.ok(run(`pets.${id}.food`) > 50);
  }
}
run("select(['august','molly']);startFeeding(selected,'Karotte')");
step(7);
const state = run(
  "JSON.stringify([...feedings.values()].map(a=>[a.bite,a.clock,a.phase]))",
);
run("setPause(true)");
step(60);
assert.equal(
  run(
    "JSON.stringify([...feedings.values()].map(a=>[a.bite,a.clock,a.phase]))",
  ),
  state,
);
run("setPause(false)");
step(25);
assert.equal(run("feedings.size"), 0);
for (const button of ["home", "scratch", "cuddle", "popcorn"]) {
  run("select(['august','molly']);startFeeding(selected,'Salat')");
  step(1);
  el("#" + button).click();
  assert.equal(run("feedings.size"), 0, button);
  assert.equal(el("#food-layer").children.length, 0);
}
run(
  "select(['august']);startFeeding(selected,'Heu');select(['molly']);startFeeding(selected,'Paprika')",
);
assert.equal(run("feedings.size"), 2);
run("sendPet('august',25,70)");
assert.equal(run("feedings.size"), 1);
step(30);
assert.equal(run("feedings.size"), 0);
run("select(['august','molly']);goHome('august');goHome('molly')");
const states = { august: new Set(), molly: new Set() };
for (let i = 0; i < 2400; i++) {
  step(1 / 60);
  for (const id of Object.keys(states))
    states[id].add(run(`walkers.${id}.mode`));
}
for (const set of Object.values(states))
  for (const s of [
    "to-house",
    "entering",
    "inside",
    "peeking",
    "exiting",
    "walk",
  ])
    assert.ok(set.has(s), s);
el("#refill").click();
assert.equal(run("water"), 100);
el("#search").click();
for (const b of [...el("#search-items").children]) {
  b.click();
  b.click();
}
assert.equal(run("found"), 3);
run("startFeeding(['august'],'Gurke');startMiniGame('jump')");
assert.equal(run("feedings.size"), 0);
for (let i = 0; i < 3; i++) {
  el("#jump-now").click();
  step(3.2);
  assert.equal(run("miniGame.score"), i + 1);
}
assert.equal(run("miniGame.phase"), "won");
el("#mini-again").click();
assert.equal(run("miniGame.score"), 0);
run("startMiniGame('dance')");
dance[1].click();
assert.equal(run("miniGame.score"), 0);
step(1);
for (let i = 0; i < 3; i++) {
  dance[i].click();
  step(1.2);
  assert.equal(run("miniGame.score"), i + 1);
}
assert.equal(run("miniGame.phase"), "won");
step(10);
assert.equal(run("walkers.august.mode"), "mini-ready");
run("endMiniGame()");
assert.equal(run("miniGame"), null);
console.log(
  "PASS: 15 feeding combinations, repeated taps, pause, cancel/cleanup, independent pets, all house states, care, search, jump, dance, replay.",
);

run("endMiniGame();stopSearch();select(['august','molly']);pets.august.energy=45;pets.molly.energy=50;useCompanionActivity('napping')");
step(10);
assert.equal(run("walkers.august.mode"), "napping");
const napState = run("JSON.stringify([...companionActions.values()])");
const energy = run("pets.august.energy");
run("setPause(true)");
step(30);
assert.equal(run("JSON.stringify([...companionActions.values()])"), napState);
assert.equal(run("pets.august.energy"), energy);
run("setPause(false)");
step(17);
assert.ok(run("pets.august.energy") > energy);
assert.ok(run("memories.has('rest')"));
run("useCompanionActivity('playing')");
for (let i = 0; i < 8; i++) run("useCompanionActivity('playing')");
assert.equal(run("companionActions.size"), 2);
step(25);
assert.ok(run("memories.has('ball')"));
run("useCompanionActivity('drinking');pets.august.water=45;pets.molly.water=45");
step(35);
assert.ok(run("pets.august.water") > 70);
assert.ok(run("pets.molly.water") > 70);
for (const code of ["sendPet('august',30,60)", "doBehavior('august','scratching')", "startFeeding(['august'],'Heu')", "startMiniGame('dance')"]) {
  run("endMiniGame();cancelAllFeeding();startCompanionAction('august','playing')");
  run(code);
  assert.equal(run("companionActions.has('august')"), false, code);
}
run("endMiniGame();cancelAllCompanionActions();startFeeding(['august'],'Karotte')");
step(25);
assert.ok(run("memories.has('favorite')"));
const count = run("memories.size");
run("foodMemory('august','Karotte');foodMemory('august','Karotte')");
assert.equal(run("memories.size"), count);
run("ballPlace=2;flowers=true;pets.august.energy=63;saveCompanions();pets.august.energy=35;ballPlace=0;flowers=false;restoreCompanions()");
assert.equal(run("pets.august.energy"), 63);
assert.equal(run("ballPlace"), 2);
assert.equal(run("flowers"), true);
run("localStorage.value='{broken';restoreCompanions()");
run("localStorage.value=JSON.stringify({version:1,pets:{august:{food:-500,water:'bad',energy:500}},memories:['__proto__','unknown'],ballPlace:999});restoreCompanions()");
assert.equal(run("pets.august.food"), 35);
assert.equal(run("pets.august.energy"), 100);
assert.ok(run("Number.isFinite(pets.august.water)"));
run("localStorage.setItem=()=>{throw Error('blocked')};saveCompanions()");
assert.equal(run("storageAvailable"), false);
run("cancelAllCompanionActions();cancelAllFeeding();pets.august.energy=40;naturalCompanionBehavior(walkers.august)");
assert.equal(run("walkers.august.sleepRequested"), true);
console.log("PASS: companion activities, pause, cancellation, favorites, unique memories, bounded storage restore and blocked/corrupt storage.");

run("cancelAllWorldActions();cancelAllCompanionActions();cancelAllFeeding();world.minutes=720;world.socialClock=99999;water=80;pets.august.water=40;pets.molly.water=45;useCompanionActivity('drinking')");
assert.equal(run("companionActions.get('molly').phase"),'waiting');
assert.ok(run("walkers.molly.tx") < 50, 'second drinker waits away from nozzle');
step(36);
assert.ok(run("pets.august.water") > 68);
assert.ok(run("pets.molly.water") > 73);
assert.ok(run("water") < 69 && run("water") > 66);
run("cancelAllCompanionActions();water=20;pets.molly.water=40;useCompanionActivity('drinking');cancelCompanionAction('august')");
step(25);
assert.ok(run("pets.molly.water") > 68, 'canceled first drinker must release the queue');
assert.equal(run("[...companionActions.values()].some(a=>a.kind==='drinking')"),false);
run("water=0;cancelAllCompanionActions();startCompanionAction('august','drinking')");
assert.equal(run("companionActions.has('august')"),false);
const thirst = run("pets.august.water");
el("#refill").click();
assert.equal(run("pets.august.water"),thirst,"refilling must not instantly satisfy thirst");
run("cancelAllWorldActions();cancelAllCompanionActions();cancelAllFeeding();world.hay=16;pets.august.food=45;pets.molly.food=45;startRackMeal(['august','molly'])");
assert.equal(run("hayReservations()"),16);
run("startRackMeal(['august','molly'])");
assert.equal(run("hayReservations()"),16);
step(25);
assert.equal(run("world.hay"),0);
assert.equal(run("hayReservations()"),0);
assert.ok(run("pets.august.food")>60);
run("world.hay=8;startRackMeal(['august']);sendPet('august',30,65)");
assert.equal(run("world.hay"),8);
assert.equal(run("hayReservations()"),0);
run("world.hay=0;pets.august.energy=40;pets.molly.energy=42;startHouseSleep('august');startHouseSleep('molly')");
const sleepModes = new Set();
for(let i=0;i<55;i++){step(1);sleepModes.add(run("walkers.august.mode"));}
for(const mode of ['entering','house-sleep','peeking','exiting','walk'])assert.ok(sleepModes.has(mode),mode);
assert.ok(run("pets.august.energy")>65);
run("startHouseSleep('august')");
step(10);
run("startFeeding(['august'],'Karotte')");
assert.equal(run("walkers.august.sleepRequested"),false);
assert.equal(el('#sleep-august').hidden,true);
run("cancelAllFeeding();cancelAllWorldActions();startSocialWalk(true)");
step(8);
assert.equal(run("memories.has('friends')"),true);
run("startSocialWalk(true);startFeeding(['august'],'Gurke')");
assert.equal(run("world.actions.size"),0);
run("cancelAllFeeding();startWorldTunnel(['august','molly'])");
step(20);
assert.equal(run("[...world.actions.values()].some(a=>a.kind==='tunnel')"),false);
run("addLitter(30,60);addLitter(40,65);addLitter(50,70);setPause(true)");
const dirtCount=run("world.dirt.size");
run("cleanEnclosure()");
assert.equal(run("world.dirt.size"),dirtCount);
run("setPause(false);cleanEnclosure()");
assert.equal(run("world.dirt.size"),0);
assert.equal(run("memories.has('clean')"),true);
el('#adopt-baby').click();el('#adopt-baby').click();
assert.equal(run("world.baby"),true);
assert.equal(run("family.members.length"),2);
step(3);
assert.ok(run("Number.isFinite(baby.x) && Number.isFinite(baby.y)"));
let lastRoute;
for(let trial=0;trial<200;trial++){
  const maze=JSON.parse(run("JSON.stringify(makeTunnelMaze())"));
  const visited=new Set([0]), queue=[0];
  while(queue.length)for(const neighbor of maze[queue.shift()])if(!visited.has(neighbor)){visited.add(neighbor);queue.push(neighbor);}
  assert.equal(visited.size,25);
  const riddles = JSON.parse(run(`JSON.stringify(makeMazeRiddles(${JSON.stringify(maze)}))`));
  assert.equal(new Set([...riddles.items, ...riddles.gates].map(item => item.cell)).size, 7);
  assert.ok(riddles.items.every(item => Number.isInteger(item.cell) && item.cell > 0 && item.cell < 24));
  assert.ok(solvePuzzle({maze, ...riddles}), 'Every key and ingredient must be reachable in order');
  const routeKey=run("previousMazeRoute");
  assert.notEqual(routeKey,lastRoute);
  lastRoute=routeKey;
}
run("startMiniGame('tunnel')");
run("miniGame.cell=MAZE_GOAL;miniGame.to=MAZE_GOAL;miniGame.phase='travelling';miniGame.timer=0");
step(.8);
assert.equal(run("miniGame.phase"), 'ready', 'Finding the exit without the picnic must not win');
run("miniGame.cell=0;moveThroughMaze(miniGame.maze[0][0]);setPause(true)");
const mazeTimer = run("miniGame.timer");
run("stepTunnelPuzzle(20)");
assert.equal(run("miniGame.timer"), mazeTimer);
run("setPause(false)");step(.8);
run("startMiniGame('tunnel')");
run("miniGame.cell=miniGame.maze[miniGame.gates[0].cell][0]");
const beforeDoor = run("miniGame.cell");
run("moveThroughMaze(miniGame.gates[0].cell)");step(.8);
assert.equal(run("miniGame.cell"), beforeDoor, 'A locked door must block travel');
run("miniGame.cell=0;showMazeTip()");
assert.ok(run("miniGame.maze[0].includes(miniGame.hintCell)"));
const route = solvePuzzle(JSON.parse(run("JSON.stringify({maze:miniGame.maze,gates:miniGame.gates,items:miniGame.items})")));
for(const cell of route.slice(1)){run(`moveThroughMaze(${cell})`);step(.8);}
assert.equal(run("miniGame.phase"),'won');
assert.equal(run("miniGame.score"),3);
assert.equal(run("memories.has('tunnel')"),true);
run("endMiniGame();globalThis.savedMazeRandom=Math.random;Math.random=()=>0");
for (let trial=0; trial<6; trial++) {
  run("startMiniGame('tunnel')");
  const puzzle = JSON.parse(run("JSON.stringify({maze:miniGame.maze,gates:miniGame.gates,items:miniGame.items})"));
  assert.ok(solvePuzzle(puzzle), 'Constant-random fallback remains solvable');
  run("endMiniGame()");
}
run("Math.random=globalThis.savedMazeRandom");
run("endMiniGame();restoreWorld({hay:-4,baby:true,dirt:Array.from({length:20},()=>({x:900,y:-50})),bedding:99})");
assert.equal(run("world.hay"),0);
assert.ok(run("world.dirt.size")<=6);
assert.equal(run("world.bedding"),2);
console.log("PASS: thirst/resource chain, serialized bottle, empty/refill, reserved hay bites/cancel, house sleep/wake, social ownership, tunnel, cleaning/pause, one baby, 200 solvable key-and-picnic puzzles, locked doors, hints and save validation.");

run("endMiniGame();selected=['august','molly'];startTunnelAdventure();startTunnelAdventure()");
assert.equal(run("world.actions.size"),2);
run("setPause(true)");step(20);
assert.equal(run("miniGame"),null);
run("setPause(false)");step(25);
assert.equal(run("miniGame.type"),'tunnel');
assert.equal(run("miniGame.ids.length"),2);
run("endMiniGame();startTunnelAdventure();sendPet('august',30,60)");step(20);
assert.equal(run("miniGame"),null,'canceled entrance must not open a game later');
console.log('PASS: changed maze solution every round, paused entrance, two-pet tunnel launch, cancellation.');

run("endMiniGame();startMiniGame('memory')");
run("playExtraMove(0);playExtraMove(0)");
assert.equal(run("miniGame.open.length"),1, 'A card cannot match itself');
const different = run("miniGame.cards.findIndex(card=>card!==miniGame.cards[0])");
run(`playExtraMove(${different});setPause(true)`);
const peekTimer = run("miniGame.timer");
run("stepExtraGame(20)");
assert.equal(run("miniGame.timer"),peekTimer);
run("setPause(false);stepExtraGame(2)");
assert.equal(run("miniGame.open.length"),0);
const deck = JSON.parse(run("JSON.stringify(miniGame.cards)"));
for (const value of new Set(deck)) {
  const pair = deck.flatMap((card,i)=>card===value?[i]:[]);
  run(`playExtraMove(${pair[0]});playExtraMove(${pair[1]})`);
}
assert.equal(run("miniGame.phase"),'won');
run("startMiniGame('catch')");
for (let i=0;i<6;i++) {
  run("playExtraMove(miniGame.cards.indexOf(miniGame.targetFood))");
  const count=run("miniGame.collected");
  run("playExtraMove(miniGame.cards.indexOf(miniGame.targetFood))");
  assert.equal(run("miniGame.collected"),count);
  run("stepExtraGame(.6)");
}
assert.equal(run("miniGame.phase"),'won');
run("startMiniGame('orchestra');stepExtraGame(5);playExtraMove((miniGame.sequence[0]+1)%3)");
assert.equal(run("miniGame.phase"),'showing');
for (let round=0;round<3;round++) {
  run("stepExtraGame(6)");
  const notes=JSON.parse(run("JSON.stringify(miniGame.sequence)"));
  for(const note of notes) run(`playExtraMove(${note})`);
  run("stepExtraGame(1.1)");
}
assert.equal(run("miniGame.phase"),'won');
run("endMiniGame();restoreFamily(null,false)");
for(let i=0;i<25;i++) run("adoptFamilyMember()");
assert.equal(run("family.members.length"),25);
assert.ok(run("family.visible.length")<=6);
assert.equal(run("new Set(family.members.map(m=>m.id)).size"),25);
run("setPause(true)");
const familyTime=run("family.time");
run("stepFamily(500);adoptFamilyMember();growFamilyMember()");
assert.equal(run("family.time"),familyTime);
assert.equal(run("family.members.length"),25);
run("setPause(false);growFamilyMember()");
assert.equal(run("family.members.find(m=>m.id===family.selectedId).adult"),true);
run("changeFamilyPage(-1);stepFamily(481)");
assert.equal(run("family.visible.every(a=>a.member.adult)"),true);
run("globalThis.savedFamily=familySnapshot();restoreFamily(globalThis.savedFamily,false)");
assert.equal(run("family.members.length"),25);
assert.ok(run("family.visible.length")<=6);
run("restoreFamily({members:[{id:1,age:999},{id:1},{id:-2},{id:2,skin:'<script>',age:NaN}]},false)");
assert.equal(run("family.members.length"),2);
assert.equal(run("family.members[1].skin"),'august');
run("togglePlayMenu();showPlaySection('food');runPlayAction('refill')");
assert.equal(run("water"),100);
for (const action of ['home','scratch','cuddle','popcorn','nap','refill-hay','clean-enclosure','adopt-baby','house-sleep','move-ball','move-tunnel','bedding-style','toggle-flowers','together','call-pets','update-game','memory','catch','orchestra'])
  assert.ok(run(`playSections.some(section=>section.actions.some(entry=>entry[0]===${JSON.stringify(action)}))`), action+' must be reachable in pictures');
console.log('PASS: memory mismatch/self-match/pause, catching repeat taps, orchestra retry/reward, 25 unique family members, bounded visible actors, growth, migration and picture actions.');
