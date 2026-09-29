const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const root = path.resolve(__dirname, "..");
const results = path.join(root, "test-results");
fs.mkdirSync(results, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webp": "image/webp",
  ".png": "image/png",
};
let workerRevision = 0;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  const file = path.resolve(
    root,
    "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
  );
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", types[path.extname(file)] || "text/plain");
  res.setHeader("Cache-Control", "no-cache");
  if (pathname === "/sw.js" && workerRevision) {
    res.end(fs.readFileSync(file, "utf8").replace("august-molly-living-v3", "august-molly-living-v3-test-update"));
    return;
  }
  fs.createReadStream(file).pipe(res);
});
const report = [];
const pass = (name) => {
  report.push(name);
  console.log("PASS:", name);
};
let browser, page;
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const ctx = await browser.newContext({
    viewport: { width: 1024, height: 600 },
    hasTouch: true,
  });
  page = await ctx.newPage();
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) =>
    errors.push(r.url() + ": " + r.failure()?.errorText),
  );
  page.on("request", (r) => {
    if (!r.url().startsWith(origin)) external.push(r.url());
  });
  await page.goto(origin);
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode())),
  );
  // Run the real rAF/event loop with a controllable browser clock. No game hooks
  // replace production behavior; accelerated simulation is limited to long waits.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const tick = (ms) => page.clock.runFor(ms);
  const click = (id) => page.locator("#" + id).click();
  const state = (expr) => page.evaluate(expr);
  const settle = async () => {
    for (let i=0;i<52 && await state('feedings.size');i++) await tick(500);
    assert.equal(await state('feedings.size'),0,'feeding failed to settle');
  };
  const feed = async (type, choice) => {
    await click(choice);
    await click("food-menu");
    await page.locator(`[data-food="${type}"]`).click();
  };
  for (const [id, expected] of [
    ["select-august", ["august"]],
    ["select-molly", ["molly"]],
    ["both", ["august", "molly"]],
  ]) {
    await click(id);
    assert.deepEqual(await state("selected"), expected);
  }
  const ground = await page.evaluate(() => {
    for (let y=300;y<450;y+=25) for(let x=300;x<700;x+=25) {
      const e=document.elementFromPoint(x,y);
      if(e?.id==='habitat'||e?.classList.contains('habitat-background'))return {x,y};
    }
    throw Error('No tappable ground');
  });
  const oldPosition=await state('walkers.august.x');
  await page.mouse.click(ground.x, ground.y);
  assert.equal(await state('walkers.molly.tx-walkers.august.tx'),20);
  await tick(1500);
  assert.notEqual(await state('walkers.august.x'),oldPosition);
  pass("selection and tap-to-move, separate destinations");
  await click("home");
  const house = { august: new Set(), molly: new Set() };
  for (let i = 0; i < 50; i++) {
    await tick(500);
    const modes = await state(
      "Object.fromEntries(Object.entries(walkers).map(([id,w])=>[id,w.mode]))",
    );
    for (const id of Object.keys(house)) house[id].add(modes[id]);
  }
  for (const modes of Object.values(house))
    for (const mode of ["entering", "inside", "peeking", "exiting", "walk"])
      assert.ok(modes.has(mode), mode);
  pass("both house entrances, window peeks and exits");
  for (const [id, mode] of [
    ["scratch", "scratching"],
    ["cuddle", "cuddling"],
    ["popcorn", "hopping"],
  ]) {
    await click(id);
    assert.equal(await state("walkers.august.mode"), mode);
    await tick(4500);
  }
  await click("refill");
  assert.equal(await state("water"), 100);
  await click("sound");
  assert.equal(await state("sound"), true);
  await click("sound");
  assert.equal(await state("sound"), false);
  await click("food-menu");
  assert.equal(await page.locator("#food-drawer").isVisible(), true);
  await click("food-menu");
  assert.equal(await page.locator("#food-drawer").isVisible(), false);
  pass("scratch, cuddle, popcorn, water, sound and food menu");
  for (const choice of ["select-august", "select-molly", "both"]) {
    for (const type of ["Karotte", "Gurke", "Paprika", "Salat", "Heu"]) {
      await feed(type, choice);
      const ids = await state("[...selected]");
      assert.equal(await page.locator(".food-object").count(), ids.length);
      const before = await state(
        "Object.fromEntries(Object.entries(pets).map(([id,p])=>[id,p.food]))",
      );
      const stages = new Map();
      for (let i = 0; i < 50; i++) {
        await tick(300);
        const portions = await page
          .locator(".food-object")
          .evaluateAll((es) =>
            es.map((e) => {
              const pet=document.querySelector('#'+e.dataset.pet);
              const r=pet.querySelector('img').getBoundingClientRect();
              const f=e.getBoundingClientRect();
              const biteX=e.dataset.food==='Heu' ? 0 : Number(e.querySelector('.bite-mask').getAttribute('points').split(',')[0])+2;
              const mouthX=r.left+r.width*.775;
              const mouthY=r.top+(r.height-r.width/1.5)/2+r.width/1.5*(e.dataset.pet==='august'?.52:.48);
              return {
              id: e.dataset.pet,
              bite: Number(e.dataset.bite),
              width: e.getBoundingClientRect().width,
              clip: e.querySelector(".bite-mask").getAttribute("points"),
              eating:pet.dataset.mode==='feeding',
              gap:Math.hypot(mouthX-(f.left+Math.max(0,biteX)/120*f.width),mouthY-(f.top+f.height/2)),
            }}),
          );
        for (const f of portions) {
          const old = stages.get(f.id);
          if (old) {
            assert.ok(f.bite >= old.bite);
            assert.ok(Math.abs(old.width - f.width) < 0.1);
          }
          stages.set(f.id, f);
          if(f.eating)assert.ok(f.gap<6,`${type}/${f.id}: mouth is ${f.gap}px from bite edge`);
        }
      }
      await settle();
      for(const id of ids)assert.ok(stages.get(id)?.bite>1,`missing visible bite stages: ${type}/${id}`);
      assert.equal(await page.locator(".food-object").count(), 0);
      assert.equal(await state("feedings.size"), 0);
      for (const id of ids)
        assert.ok(
          (await state(`pets.${id}.food`)) >=
            Math.min(100, before[id] + FOOD_VALUE(type)) - 2,
        );
      pass(
        `${type} / ${choice}: approaches, bites, fixed size, finishes and cleans up`,
      );
    }
  }
  await feed("Karotte", "both");
  // Wait for both animals to eat, taking a screenshot before their first bites.
  for (
    let i = 0;
    i < 80 &&
    !(await state('[...feedings.values()].every(a=>a.phase==="eating")'));
    i++
  )
    await tick(100);
  await page.screenshot({ path: path.join(results, "feeding-start.png") });
  await tick(1800);
  await page.screenshot({ path: path.join(results, "feeding-bites.png") });
  const positions = await state(
    "JSON.stringify([...feedings.values()].map(a=>[a.id,a.bite,a.clock]))",
  );
  await click("pause");
  await tick(5000);
  assert.equal(
    await state(
      "JSON.stringify([...feedings.values()].map(a=>[a.id,a.bite,a.clock]))",
    ),
    positions,
  );
  await click("resume");
  await settle();
  assert.equal(await state("feedings.size"), 0);
  pass("pause/resume freezes feeding and cleans up after completion");
  await feed("Salat", "both");
  for (let i = 0; i < 8; i++) {
    await click("food-menu");
    await page.locator('[data-food="Gurke"]').click();
  }
  assert.equal(await state("feedings.size"), 2);
  assert.equal(await page.locator(".food-object").count(), 2);
  await click("scratch");
  assert.equal(await state("feedings.size"), 0);
  await tick(10000);
  assert.equal(await page.locator(".food-object,.food-crumb").count(), 0);
  for (const action of ["home", "cuddle", "popcorn"]) {
    await feed("Heu", "both");
    await tick(7000);
    await click(action);
    assert.equal(await state("feedings.size"), 0);
  }
  await feed("Paprika", "both");
  await page.mouse.click(500, 420);
  assert.equal(await state("feedings.size"), 0);
  pass(
    "rapid taps, movement and care interruptions leave no orphan food or timers",
  );
  await feed("Gurke", "select-august");
  await feed("Heu", "select-molly");
  assert.equal(await state("feedings.size"), 2);
  await settle();
  pass("independent portions with changed selection");
  await click("both");
  await click("games");
  await click("search");
  for (let i = 0; i < 3; i++)
    await page.locator(".search-item").first().click();
  assert.equal(await state("found"), 3);
  await tick(10000);
  pass("search game and completion");
  await feed("Salat", "both");
  await click("games");
  await click("hurdle-game");
  assert.equal(await state("feedings.size"), 0);
  for (let i = 0; i < 3; i++) {
    await click("jump-now");
    await tick(3200);
    assert.equal(await state("miniGame.score"), i + 1);
  }
  assert.equal(await state("miniGame.phase"), "won");
  await click("mini-again");
  assert.equal(await state("miniGame.score"), 0);
  await click("jump-now");
  await tick(500);
  await click("pause");
  const jump = await state("miniGame.timer");
  await tick(2000);
  assert.equal(await state("miniGame.timer"), jump);
  await page.keyboard.press("Escape");
  assert.equal(await state("miniGame.type"), "jump");
  await click("mini-close");
  pass("jump, replay, mid-jump pause and Escape resumes without closing game");
  await click("games");
  await click("dance-game");
  await page.locator('[data-dance="twirl"]').click();
  assert.equal(await state("miniGame.score"), 0);
  await tick(1000);
  for (const move of ["wiggle", "twirl", "bounce"]) {
    await page.locator(`[data-dance="${move}"]`).click();
    await tick(1500);
  }
  assert.equal(await state("miniGame.phase"), "won");
  await tick(8000);
  assert.equal(await state("walkers.august.mode"), "mini-ready");
  await click("mini-close");
  pass("dance: wrong/correct symbols, reward, no autonomous wandering");
  await click("both");
  await click("companion-menu");
  assert.equal(await page.locator("#companion-panel").isVisible(), true);
  assert.match(await page.locator("#companion-cards").innerText(), /Neugieriger Entdecker/);
  assert.match(await page.locator("#companion-cards").innerText(), /Gemütliche Genießerin/);
  await page.screenshot({path:path.join(results,"cozy-profiles.png")});
  await click("nap");
  for (let i=0;i<30 && await state('walkers.august.mode!=="napping" || walkers.molly.mode!=="napping"');i++) await tick(300);
  assert.equal(await state('walkers.august.mode'), 'napping');
  await tick(300);
  await page.screenshot({path:path.join(results,"cozy-nap.png")});
  const cozyState = await state('JSON.stringify([...companionActions.values()])');
  await click("pause");
  await tick(5000);
  assert.equal(await state('JSON.stringify([...companionActions.values()])'),cozyState);
  await click("resume");
  await tick(19000);
  assert.equal(await state('memories.has("rest")'),true);
  await click("willow-ball");
  await click("willow-ball");
  assert.equal(await state('companionActions.size'),2);
  await tick(25000);
  assert.equal(await state('memories.has("ball")'),true);
  await click("drink-bowl");
  assert.equal(await state('companionActions.get("molly").phase'),'waiting');
  await page.setViewportSize({width:600,height:1024});
  await page.setViewportSize({width:1024,height:600});
  assert.equal(await state('companionActions.get("molly").phase'),'waiting');
  for(let i=0;i<80 && await state('walkers.molly.mode!=="drinking"');i++)await tick(300);
  assert.equal(await state('walkers.molly.mode'),'drinking');
  assert.notEqual(await state('walkers.august.mode'),'drinking');
  await tick(300);
  await page.screenshot({path:path.join(results,"cozy-drinking.png")});
  await click("pause");
  const beforeRotation = await state('[...companionActions.values()].map(a=>[a.id,a.kind,a.elapsed])');
  await page.setViewportSize({width:600,height:1024});
  await tick(1500);
  assert.deepEqual(await state('[...companionActions.values()].map(a=>[a.id,a.kind,a.elapsed])'),beforeRotation);
  await click("resume");
  await page.setViewportSize({width:1024,height:600});
  await tick(18000);
  assert.equal(await state('[...companionActions.values()].some(a=>a.kind==="drinking")'),false);
  await click("companion-menu");
  await click("nap");
  await feed("Heu","both");
  assert.equal(await state('companionActions.size'),0);
  await settle();
  await click("companion-menu");
  await click("call-pets");
  assert.equal(await state('walkers.august.tx'),34);
  assert.equal(await state('walkers.molly.tx'),68);
  await tick(12000);
  const previousBall = await state('ballPlace');
  await click("companion-menu");
  await click("move-ball");
  assert.notEqual(await state('ballPlace'),previousBall);
  await click("companion-menu");
  assert.equal(await page.locator("#toggle-flowers").isVisible(),true);
  await click("toggle-flowers");
  assert.equal(await page.locator("#flower-garland").isVisible(),true);
  await page.screenshot({path:path.join(results,"cozy-album.png")});
  await click("companion-close");
  let durable = await state('JSON.parse(localStorage.getItem(COMPANION_SAVE_KEY))');
  assert.ok(durable.memories.includes('favorite'));
  pass("personalities, naps, pause, drinking, toy/repeat/cancel, recall, rearrangement and album rewards");
  // Fixture only establishes a need; the real movement/rAF decision path must
  // discover and consume resources without invoking its completion callbacks.
  const resetActors = async () => state(`endMiniGame();stopSearch();cancelAllFeeding();cancelAllCompanionActions();cancelAllWorldActions();
    world.socialClock=999;world.minutes=720;
    for(const [id,p] of Object.entries(pets)){p.food=95;p.water=95;p.energy=90;p.enrichment=90;sendPet(id,id==='august'?30:76,68);walkers[id].nextNatural=simulationTime+999;}`);
  await resetActors();
  await state('water=70;pets.august.water=40;pets.molly.water=40;walkers.august.nextNatural=0;walkers.molly.nextNatural=0');
  await tick(36000);
  assert.ok(await state('pets.august.water>68 && pets.molly.water>68 && water<59 && water>55'));
  const thirstBeforeRefill = await state('pets.august.water');
  await click('refill');
  assert.equal(await state('pets.august.water'),thirstBeforeRefill);
  await resetActors();
  await state('world.hay=100;pets.august.food=40;walkers.august.nextNatural=0');
  await tick(23000);
  assert.ok(await state('pets.august.food>55 && world.hay===92'));
  await click('companion-menu'); await click('refill-hay');
  assert.equal(await state('world.hay'),100);
  await click('house-sleep');
  const houseSleepModes = new Set();
  for(let i=0;i<15 && !await state('walkers.august.mode==="house-sleep"');i++) { await tick(1000); houseSleepModes.add(await state('walkers.august.mode')); }
  assert.equal(await state('walkers.august.mode'),'house-sleep');
  await page.screenshot({path:path.join(results,'world-house-sleep.png')});
  const sleepTimer = await state('walkers.august.timer');
  await click('pause'); await tick(4000);
  assert.equal(await state('walkers.august.timer'),sleepTimer);
  await click('resume');
  for(let i=0;i<35;i++){await tick(1000);houseSleepModes.add(await state('walkers.august.mode'));}
  assert.ok(houseSleepModes.has('peeking') && houseSleepModes.has('exiting') && houseSleepModes.has('walk'));
  pass('autonomous thirst→bottle→real water use, hunger→reserved hay bites, house sleep→pause→wake→exit');
  await resetActors();
  await state('cleanEnclosure();addLitter(35,58);addLitter(47,67);addLitter(66,75)');
  const dirty = await state('world.dirt.size');
  await page.locator('.litter').first().click();
  assert.equal(await state('world.dirt.size'),dirty-1);
  await click('companion-menu'); await click('clean-enclosure');
  assert.equal(await state('world.dirt.size'),0);
  assert.equal(await state('memories.has("clean")'),true);
  await click('companion-menu');await click('together');
  await tick(2200);
  assert.equal(await state('world.actions.size'),2);
  await page.screenshot({path:path.join(results,'world-friends.png')});
  await tick(6500);
  assert.equal(await state('memories.has("friends")'),true);
  await click('world-tunnel');
  let insideTunnel=false;
  for(let i=0;i<35;i++){await tick(400);if(await state('walkers.august.mode==="in-tunnel"'))insideTunnel=true;}
  assert.equal(insideTunnel,true);
  assert.equal(await state('[...world.actions.values()].some(a=>a.kind==="tunnel")'),false);
  await click('companion-menu');await click('adopt-baby');
  assert.equal(await page.locator('#baby').isVisible(),true);
  await click('baby');
  await click('companion-menu');
  assert.equal(await page.locator('#adopt-baby').isEnabled(),false);
  assert.equal(await page.locator('#baby').count(),1);
  await click('bedding-style');
  await click('move-tunnel');
  await tick(5000);
  await page.screenshot({path:path.join(results,'world-family.png')});
  pass('click cleaning, fresh bedding, social following, usable tunnel, rearrangement and one adopted baby');
  const solveMaze = async (pauseOnFirst = false) => {
    const maze = await state('miniGame.maze');
    const queue=[[0]],seen=new Set([0]);let route;
    while(queue.length){const path=queue.shift(),cell=path.at(-1);if(cell===8){route=path;break;}for(const next of maze[cell])if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}
    assert.ok(route);
    for(const [index,cell] of route.slice(1).entries()){
      await page.locator(`[data-cell="${cell}"]`).click();
      if(pauseOnFirst && index===0){await tick(200);await click('pause');const t=await state('miniGame.timer');await tick(2000);assert.equal(await state('miniGame.timer'),t);await click('resume');}
      await tick(800);
    }
    assert.equal(await state('miniGame.phase'),'won');
    assert.equal(await state('miniGame.score'),3);
  };
  await click('companion-menu');await click('tunnel-game');
  assert.equal(await state('feedings.size+companionActions.size+world.actions.size'),0);
  await page.screenshot({path:path.join(results,'world-tunnel-game.png')});
  await solveMaze(true);
  await click('mini-again');await solveMaze();await click('mini-close');
  pass('randomized connected tunnel maze, real UI solution, pause, reward and replay');
  await resetActors();
  await state('world.socialClock=10;world.dirtClock=4;walkers.august.nextNatural=simulationTime+4;walkers.molly.nextNatural=simulationTime+8');
  const idleModes=new Set();
  for(let i=0;i<120;i++){
    await tick(1000);
    for(const mode of await state('Object.values(walkers).map(w=>w.mode)'))idleModes.add(mode);
    assert.ok(await state('Object.values(walkers).every(w=>Number.isFinite(w.x)&&Number.isFinite(w.y))'));
  }
  assert.ok(idleModes.size>=3,JSON.stringify([...idleModes]));
  assert.equal(await page.locator('.food-object').count(),await state('feedings.size'));
  assert.ok(await state('world.dirt.size<=6'));
  await page.screenshot({path:path.join(results,'world-idle-two-minutes.png')});
  pass('two unattended simulated minutes: varied live states, bounded litter and no orphan portions');
  for (const size of [
    { width: 1024, height: 600 },
    { width: 600, height: 1024 },
    { width: 800, height: 480 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(size);
    await tick(50);
    assert.equal(
      await state("document.documentElement.scrollWidth>innerWidth"),
      false,
    );
    await click("food-menu");
    const bounds = await page
      .locator("button:visible")
      .evaluateAll((es) =>
        es.map((e) => ({
          id: e.id || e.dataset.food,
          x: e.getBoundingClientRect().x,
          y: e.getBoundingClientRect().y,
          right: e.getBoundingClientRect().right,
          bottom: e.getBoundingClientRect().bottom,
        })),
      );
    for (const b of bounds)
      assert.ok(
        b.x >= -1 &&
          b.y >= -1 &&
          b.right <= size.width + 1 &&
          b.bottom <= size.height + 1,
        JSON.stringify({ size, b }),
      );
    await page.locator('[data-food="Karotte"]').click();
    await tick(5500);
    await page.screenshot({
      path: path.join(results, `tablet-${size.width}x${size.height}.png`),
    });
    await click("games");
    await click("dance-game");
    const menu = await page.locator("#dance-controls").boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= size.width);
    await click("mini-close");
    await settle();
    await click("companion-menu");
    await page.locator("#toggle-flowers").scrollIntoViewIfNeeded();
    const panelBox = await page.locator("#companion-panel").boundingBox();
    assert.ok(panelBox.x>=0 && panelBox.y>=0 && panelBox.x+panelBox.width<=size.width+1 && panelBox.y+panelBox.height<=size.height+1);
    assert.equal(await page.locator("#companion-panel").evaluate(e=>e.scrollWidth>e.clientWidth),false);
    await page.screenshot({path:path.join(results,`album-${size.width}x${size.height}.png`)});
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#companion-panel").isVisible(),false);
    await click('companion-menu');await click('tunnel-game');
    const puzzleBox=await page.locator('#tunnel-puzzle').boundingBox();
    assert.ok(puzzleBox.x>=0 && puzzleBox.y>=0 && puzzleBox.x+puzzleBox.width<=size.width && puzzleBox.y+puzzleBox.height<=size.height);
    await page.screenshot({path:path.join(results,`tunnel-${size.width}x${size.height}.png`)});
    await click('mini-close');
  }
  pass(
    "responsive controls, feeding and minigames at 1024x600, 600x1024, 800x480, 360x640",
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await state('saveCompanions()');
  durable=await state('JSON.parse(localStorage.getItem(COMPANION_SAVE_KEY))');
  await page.reload();
  assert.equal(await state('flowers'),durable.flowers);
  assert.equal(await state('ballPlace'),durable.ballPlace);
  assert.deepEqual(await state('[...memories].sort()'),durable.memories.sort());
  assert.equal(await state('companionActions.size'),0);
  assert.equal(await state('world.baby'),true);
  assert.equal(await state('world.hay'),durable.world.hay);
  assert.equal(await state('world.actions.size'),0);
  pass("local save survives reload without restoring in-flight activities or offline need decay");
  for (const seed of ["{broken", JSON.stringify({version:1,pets:{august:{food:-400,energy:900}},memories:["__proto__","rest"],ballPlace:999})]) {
    const probe = await browser.newContext();
    await probe.addInitScript(value => localStorage.setItem("august-molly:companions:v1",value),seed);
    const probePage = await probe.newPage();
    probePage.on('pageerror', e=>errors.push(e.message));
    await probePage.goto(origin);
    assert.ok(await probePage.evaluate(()=>Number.isFinite(pets.august.food)&&pets.august.food>=35&&pets.august.energy<=100));
    assert.equal(await probePage.locator('#companion-menu').isVisible(),true);
    await probe.close();
  }
  const blockedStorage = await browser.newContext();
  await blockedStorage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked for test')}}));
  const blockedPage = await blockedStorage.newPage();
  blockedPage.on('pageerror',e=>errors.push(e.message));
  await blockedPage.goto(origin);
  await blockedPage.locator('#companion-menu').click();
  assert.match(await blockedPage.locator('#save-status').innerText(),/nicht verfügbar/);
  await blockedPage.locator('#nap').click();
  assert.equal(await blockedPage.evaluate(()=>companionActions.size),2);
  await blockedStorage.close();
  pass("corrupt/invalid save recovery and fully playable with storage blocked");
  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => i.decode())),
  );
  await ctx.setOffline(true);
  await page.reload();
  await click("refill");
  assert.equal(await state("water"), 100);
  await click("food-menu");
  await page.locator('[data-food="Heu"]').click();
  assert.ok((await state("feedings.size")) > 0);
  pass("offline reload and gameplay from same-origin cache");
  await ctx.setOffline(false);
  // Exercise the update handshake rather than forcing a reload mid-session.
  workerRevision=1;
  await page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    await registration.update();
    if(registration.waiting)return;
    await new Promise(resolve=>{
      const watch=()=>{
        const worker=registration.installing;
        if(!worker)return;
        if(worker.state==='installed'){resolve();return;}
        worker.addEventListener('statechange',()=>{if(worker.state==='installed')resolve();});
      };
      registration.addEventListener('updatefound',watch);watch();
    });
  });
  await click('companion-menu');
  await page.locator('#update-game').waitFor({state:'visible'});
  await Promise.all([page.waitForEvent('load'),click('update-game')]);
  assert.equal(await state('world.baby'),true);
  assert.equal(await state('feedings.size'),0);
  pass('explicit offline-version update preserves saved family and never restores in-flight actions');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  pass(
    "zero JavaScript/Promise/console/HTTP errors and zero third-party requests",
  );
  fs.writeFileSync(
    path.join(results, "report.json"),
    JSON.stringify({ passed: report, errors, external }, null, 2),
  );
  await browser.close();
  server.close();
})().catch(async (error) => {
  if (page)
    await page
      .screenshot({ path: path.join(results, "failure.png") })
      .catch(() => {});
  fs.writeFileSync(path.join(results, "failure.txt"), error.stack);
  console.error(error);
  if (browser) await browser.close();
  server.close();
  process.exitCode = 1;
});
function FOOD_VALUE(type) {
  return { Karotte: 9, Gurke: 12, Paprika: 16, Salat: 13, Heu: 18 }[type];
}
