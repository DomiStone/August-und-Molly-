"use strict";

// The whole family is saved; only one six-pet meadow page needs DOM/animation.
const FAMILY_PAGE_SIZE = 6;
const FAMILY_GROW_SECONDS = 480;
const family = { members: [], visible: [], page: 0, selectedId: null, nextId: 1, time: 0, paradeUntil: 0, funnyClock: 28 };
const familyNames = ["Fips", "Pünktchen", "Flocke", "Peanut", "Keks", "Pippa", "Krümel", "Lotti", "Wuschel", "Nelli"];

function familyName(member) {
  const index = member.id - 1;
  return familyNames[index % familyNames.length] + (index >= familyNames.length ? " " + (Math.floor(index / familyNames.length) + 1) : "");
}

function restoreFamily(saved, legacyBaby) {
  family.members = [];
  family.time = 0;
  const seen = new Set();
  const records = Array.isArray(saved?.members) ? saved.members : legacyBaby ? [{ id: 1, skin: "august", age: 0 }] : [];
  for (const value of records) {
    if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || value.id >= Number.MAX_SAFE_INTEGER - 1 || seen.has(value.id)) continue;
    seen.add(value.id);
    const age = Number.isFinite(value.age) ? Math.max(0, Math.min(FAMILY_GROW_SECONDS, value.age)) : 0;
    family.members.push({ id: value.id, skin: value.skin === "molly" ? "molly" : "august", trait: [0, 1, 2].includes(value.trait) ? value.trait : 0, born: -age, adult: value.adult === true || age >= FAMILY_GROW_SECONDS });
  }
  family.nextId = family.members.reduce((max, member) => Math.max(max, member.id + 1), 1);
  family.page = Number.isInteger(saved?.page) ? Math.max(0, Math.min(Math.ceil(family.members.length / FAMILY_PAGE_SIZE) - 1, saved.page)) : 0;
  family.selectedId = family.members.some(member => member.id === saved?.selectedId) ? saved.selectedId : family.members[0]?.id ?? null;
  world.baby = family.members.length > 0;
  renderFamilyPage();
}

function familySnapshot() {
  return {
    page: family.page, selectedId: family.selectedId,
    members: family.members.map(member => ({ id: member.id, skin: member.skin, trait: member.trait, adult: member.adult,
      age: Math.min(FAMILY_GROW_SECONDS, Math.max(0, family.time - member.born)) })),
  };
}

function renderFamilyPage() {
  $("#family-layer").replaceChildren();
  family.visible = [];
  $("#baby").hidden = !family.members.length;
  const members = family.members.slice(family.page * FAMILY_PAGE_SIZE, (family.page + 1) * FAMILY_PAGE_SIZE);
  members.forEach((member, index) => {
    const el = index === 0 ? $("#baby") : document.createElement("button");
    el.className = "baby-pet family-pet";
    el.innerHTML = `<img src="assets/${member.skin}.png" alt=""><span class="baby-walk" aria-hidden="true"></span><span class="family-spark" aria-hidden="true"></span>`;
    el.querySelector(".baby-walk").style.backgroundImage = `url("assets/${member.skin}-walk.webp")`;
    el.setAttribute("aria-label", familyName(member) + " begrüßen");
    el.dataset.member = String(member.id);
    if (index !== 0) {
      el.addEventListener("click", () => greetFamily(member.id));
      $("#family-layer").append(el);
    }
    const actor = index === 0 ? baby : {};
    Object.assign(actor, { member, el, x: 22 + index % 3 * 25, y: 59 + Math.floor(index / 3) * 17,
      tx: 22 + index % 3 * 25, ty: 59 + Math.floor(index / 3) * 17, parent: index % 2 ? "molly" : "august", clock: 0, hop: 0, gait: 0 });
    family.visible.push(actor);
  });
  stepFamily(0);
  refreshFamilyPicker();
}

function adoptFamilyMember() {
  if (paused || miniGame) return;
  const id = family.nextId++;
  const member = { id, skin: id % 2 ? "august" : "molly", trait: (id - 1) % 3, born: family.time, adult: false };
  family.members.push(member);
  family.selectedId = id;
  family.page = Math.floor((family.members.length - 1) / FAMILY_PAGE_SIZE);
  world.baby = true;
  renderFamilyPage();
  rememberMoment("baby");
  refreshWorldUi();
  saveCompanions();
  tone("happy");
  cozyNotice(`🐹 💛 Willkommen, ${familyName(member)}!`);
  // Stay in the picture menu so another deliberate tap can adopt another pet.
  closeCompanionPanel();
}

function growFamilyMember(id = family.selectedId) {
  if (paused || miniGame) return;
  const member = family.members.find(member => member.id === id);
  if (!member || member.adult) return;
  member.adult = true;
  member.born = family.time - FAMILY_GROW_SECONDS;
  const actor = family.visible.find(actor => actor.member === member);
  if (actor) actor.hop = 3;
  rememberMoment("grown");
  tone("favorite");
  cozyNotice(`🎂 ${familyName(member)} ist jetzt groß!`);
  refreshFamilyPicker();
  saveCompanions();
}

function greetFamily(id) {
  if (paused || miniGame) return;
  family.selectedId = id;
  const actor = family.visible.find(actor => actor.member.id === id);
  if (actor) actor.hop = 3;
  refreshFamilyPicker();
  tone("curious");
}

function changeFamilyPage(direction) {
  if (paused || miniGame) return;
  const last = Math.max(0, Math.ceil(family.members.length / FAMILY_PAGE_SIZE) - 1);
  family.page = Math.max(0, Math.min(last, family.page + direction));
  family.selectedId = family.members[family.page * FAMILY_PAGE_SIZE]?.id ?? null;
  renderFamilyPage();
  saveCompanions();
}

function refreshFamilyPicker() {
  const cards = $("#family-cards");
  cards.replaceChildren();
  for (const actor of family.visible) {
    const member = actor.member, button = document.createElement("button");
    button.dataset.family = String(member.id);
    button.setAttribute("aria-label", `${familyName(member)}: ${member.adult ? "erwachsen" : "Jungtier"}, auswählen`);
    button.setAttribute("aria-pressed", member.id === family.selectedId);
    button.innerHTML = `<img src="assets/${member.skin}.png" alt="" class="${member.adult ? "grown" : "young"}"><span>${member.adult ? "🌼" : "🌱"} ${familyName(member)}</span>`;
    button.addEventListener("click", () => greetFamily(member.id));
    cards.append(button);
  }
  $("#family-page").textContent = `${family.page + 1} / ${Math.max(1, Math.ceil(family.members.length / FAMILY_PAGE_SIZE))} · 🐹 ${family.members.length}`;
  $("#family-prev").disabled = family.page === 0;
  $("#family-next").disabled = (family.page + 1) * FAMILY_PAGE_SIZE >= family.members.length;
  if (typeof refreshPlayMenu === "function") refreshPlayMenu();
}

function startFamilyParade() {
  if (paused || miniGame || searchActive) return;
  startSocialWalk(true);
  family.paradeUntil = family.time + 12;
  cozyNotice("🐹 🐹 🐹 Alle hinterher – die Kuschel-Polonaise!");
}

function startFunnyMoment(explicit = false) {
  if (paused || miniGame || searchActive) return;
  const free = Object.keys(walkers).filter(availableForWorld);
  if (!free.length) return;
  const kind = Math.floor(Math.random() * 3);
  for (const id of free) {
    doBehavior(id, kind === 0 ? "hopping" : kind === 1 ? "dancing" : "scratching", 3);
    walkers[id].danceKind = "wiggle";
    effect(id, ["✨", "🥬", "🦋"][kind]);
    walkers[id].nextNatural = simulationTime + 20;
  }
  family.visible.forEach(actor => { actor.hop = 3; });
  tone("curious");
  if (explicit) cozyNotice(["✨ Popcorn-Welle! Alle Pfötchen wackeln.", "🥬 Der lustige Salat-Schnurrbart-Tanz!", "🦋 Huch, ein kitzeliger Wiesenbesuch!"][kind]);
}

function stepFamily(dt) {
  if (paused) return;
  family.time += dt;
  family.funnyClock -= dt;
  if (family.funnyClock <= 0) { family.funnyClock = 35 + Math.random() * 25; startFunnyMoment(); }
  if (miniGame || searchActive) return;
  family.visible.forEach((actor, index) => {
    const member = actor.member, parent = walkers[actor.parent];
    if (!member.adult && family.time - member.born >= FAMILY_GROW_SECONDS) growFamilyMember(member.id);
    actor.clock -= dt;
    actor.hop = Math.max(0, actor.hop - dt);
    const asleep = ["house-sleep", "napping", "inside", "peeking"].includes(parent.mode);
    if (actor.clock <= 0) {
      actor.clock = 5 + Math.random() * 5;
      actor.tx = 18 + index % 3 * 27 + Math.random() * 6;
      actor.ty = 55 + Math.floor(index / 3) * 20 + Math.random() * 4;
    }
    let tx = actor.tx, ty = actor.ty;
    if (family.paradeUntil > family.time) {
      const leader = index ? family.visible[index - 1] : parent;
      tx = clamp(leader.x + (leader.x > 50 ? -10 : 10), 14, 86);
      ty = clamp(leader.y + 6, 45, 84);
    } else if (!member.adult && !asleep && member.trait !== 1) {
      tx = clamp(parent.x + (index % 3 - 1) * 13, 15, 85);
      ty = clamp(parent.y + 9 + Math.floor(index / 3) * 8, 45, 84);
    }
    const dx = tx - actor.x, dy = ty - actor.y;
    const distance = Math.hypot(dx, dy * 1.5);
    const amount = Math.min(1, dt * (member.adult ? 10 : 15) / Math.max(1, distance));
    if (!actor.hop) { actor.x += dx * amount; actor.y += dy * amount; }
    actor.gait += dt * 11;
    const eating = feedings.get(actor.parent)?.phase === "eating";
    actor.el.dataset.mode = actor.hop ? "hopping" : distance > 2 ? "following" : asleep || member.trait === 2 && actor.clock < 2 ? "sleeping" : eating ? "nibbling" : "sniffing";
    actor.el.classList.toggle("family-grown", member.adult);
    actor.el.style.left = actor.x + "%";
    actor.el.style.top = actor.y + "%";
    actor.el.style.setProperty("--baby-facing", dx >= 0 ? 1 : -1);
    const frame = Math.floor(actor.gait) % 8;
    actor.el.querySelector(".baby-walk").style.backgroundPosition = `${frame % 4 * 100 / 3}% ${frame < 4 ? 0 : 100}%`;
    actor.el.querySelector(".family-spark").textContent = actor.hop ? "💛" : "";
  });
}

function initializeFamily() {
  $("#baby").addEventListener("click", () => greetFamily(baby.member?.id));
  $("#family-prev").addEventListener("click", () => changeFamilyPage(-1));
  $("#family-next").addEventListener("click", () => changeFamilyPage(1));
}
