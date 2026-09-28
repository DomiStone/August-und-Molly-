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
for (const name of ["game", "food-view", "feeding", "movement", "minigames"])
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
