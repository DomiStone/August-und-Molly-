const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
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
for (const name of ["game", "food-view", "feeding", "movement", "minigames", "companions"])
  vm.runInContext(fs.readFileSync(name + ".js", "utf8"), context, {
    filename: name + ".js",
  });
const run = (code) => vm.runInContext(code, context);
const step = (seconds) =>
  run(`for(let i=0;i<${seconds * 60};i++)stepMovement(1/60)`);
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
step(25);
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
assert.equal(run("companionActions.get('august').kind"), "napping");
console.log("PASS: companion activities, pause, cancellation, favorites, unique memories, bounded storage restore and blocked/corrupt storage.");
