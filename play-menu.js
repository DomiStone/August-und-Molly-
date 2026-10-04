"use strict";

// Picture shortcuts reuse the original action handlers, keeping one behavior
// implementation for care, settings and games. Text is supplementary only.
const playSections = [
  { id: "games", icon: "🎲", label: "Spiele", actions: [
    ["search", "🔎🥕", "Suchen"], ["hurdle-game", "🐹🪵", "Parcours"], ["dance-game", "🐹🎵", "Tanzen"],
    ["tunnel-game", "🌀🗝️", "Labyrinth"], ["memory", "🥕🥕", "Memory"], ["catch", "🥕🧺", "Fangen"], ["orchestra", "🌾🎶", "Orchester"] ] },
  { id: "food", icon: "🥕", label: "Futter", actions: [
    ["food-Karotte", "🥕", "Karotte"], ["food-Gurke", "🥒", "Gurke"], ["food-Paprika", "🫑", "Paprika"], ["food-Salat", "🥬", "Salat"], ["food-Heu", "🌾🐹", "Heu geben"],
    ["refill", "💧➕", "Wasser füllen"], ["drink-bowl", "🐹💧", "Trinken"], ["refill-hay", "🌾➕", "Raufe füllen"], ["hay-rack", "🧺🌾", "Zur Raufe"] ] },
  { id: "care", icon: "💛", label: "Kuscheln", actions: [
    ["cuddle", "🤚🐹", "Streicheln"], ["scratch", "🐾🐹", "Kratzen"], ["popcorn", "🐹✨", "Hüpfen"], ["nap", "🐹💤", "Dösen"],
    ["play-ball", "🐹⚽", "Ball spielen"], ["call-pets", "🐹💛", "Herkommen"], ["together", "🐹🐹", "Zusammen"], ["funny", "🐹🤪", "Quatsch"] ] },
  { id: "home", icon: "🏡", label: "Zuhause", actions: [
    ["home", "🐹🏠", "Ins Haus"], ["house-sleep", "🏠💤", "Haus schlafen"], ["clean-enclosure", "🧹✨", "Saubermachen"],
    ["move-ball", "⚽↔️", "Ball umstellen"], ["move-tunnel", "🌀↔️", "Tunnel umstellen"], ["bedding-style", "🌾🎨", "Einstreu"], ["toggle-flowers", "🌼🌼", "Blumen"] ] },
  { id: "family", icon: "🐹", label: "Familie", actions: [
    ["adopt-baby", "🐹➕", "Baby aufnehmen"], ["grow", "🌱➡️🌼", "Groß werden"], ["parade", "🐹🐹🐹", "Polonaise"],
    ["select-august", "🐹", "August"], ["select-molly", "🐹", "Molly"], ["both", "🐹🐹", "Beide"] ] },
  { id: "settings", icon: "⚙️", label: "Extras", actions: [
    ["sound", "🔊", "Ton"], ["pause", "⏸", "Pause"], ["companion-menu", "📖🌟", "Pflegealbum"], ["update-game", "🔄✨", "Neue Version"] ] },
];
let playSection = "games";
const playButtons = new Map();

function togglePlayMenu() {
  if (paused || miniGame) return;
  const open = $("#games-drawer").hidden;
  closeFood();
  closeCompanionPanel(false);
  $("#games-drawer").hidden = !open;
  $("#games").setAttribute("aria-expanded", open);
  if (open) { showPlaySection("games"); $("#play-menu-close").focus(); }
}

function showPlaySection(id) {
  if (paused || !playSections.some(section => section.id === id)) return;
  playSection = id;
  for (const section of playSections) $("#play-tab-" + section.id).setAttribute("aria-pressed", section.id === id);
  const actions = $("#play-actions");
  actions.replaceChildren();
  playButtons.clear();
  for (const [action, icon, label] of playSections.find(section => section.id === id).actions) {
    const button = document.createElement("button");
    button.id = "play-action-" + action;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="action-picture" aria-hidden="true">${icon}</span><small>${label}</small>`;
    if (action.startsWith("select-")) button.querySelector(".action-picture").innerHTML = `<img src="assets/${action.slice(7)}.png" alt="">`;
    if (action === "grow") button.querySelector(".action-picture").innerHTML = '<img class="tiny-picture" src="assets/august.png" alt="">➜<img src="assets/august.png" alt="">';
    button.addEventListener("click", () => runPlayAction(action));
    playButtons.set(action, button);
    actions.append(button);
  }
  $("#family-picker").hidden = id !== "family";
  refreshPlayMenu();
}

function refreshPlayMenu() {
  for (const [action, button] of playButtons) {
    button.disabled = paused || action === "grow" && !family.members.some(member => member.id === family.selectedId && !member.adult)
      || action === "toggle-flowers" && memories.size < 3 || action === "update-game" && $("#update-game").hidden;
    if (action === "sound") {
      button.querySelector(".action-picture").textContent = sound ? "🔊" : "🔇";
      button.setAttribute("aria-pressed", sound);
    }
    if (action === "toggle-flowers") button.setAttribute("aria-pressed", flowers);
  }
}

function runPlayAction(action) {
  if (paused || miniGame || playButtons.get(action)?.disabled) return;
  const stay = ["adopt-baby", "grow", "sound", "toggle-flowers", "bedding-style", "update-game"].includes(action);
  if (!stay) hideGames();
  if (["memory", "catch", "orchestra"].includes(action)) startMiniGame(action);
  else if (action.startsWith("food-")) {
    stopSearch();
    startFeeding([...selected], action.slice(5));
  } else if (action === "grow") growFamilyMember();
  else if (action === "parade") startFamilyParade();
  else if (action === "funny") startFunnyMoment(true);
  else $("#" + action).click();
  refreshPlayMenu();
}

for (const section of playSections) {
  const button = document.createElement("button");
  button.id = "play-tab-" + section.id;
  button.textContent = section.icon;
  button.setAttribute("aria-label", section.label);
  button.addEventListener("click", () => showPlaySection(section.id));
  $("#play-tabs").append(button);
}
$("#play-menu-close").addEventListener("click", () => { hideGames(); $("#games").focus(); });
showPlaySection("games");
