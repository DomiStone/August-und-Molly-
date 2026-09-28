"use strict";

// Food artwork and bite masks are independent of movement and nutrition.
// The SVG never changes size while being eaten: only its edible outline changes.
const FOOD_TYPES = Object.freeze({
  Karotte: { value: 9, bites: 8, color: "#ec8b24" },
  Gurke: { value: 12, bites: 6, color: "#a5ce70" },
  Paprika: { value: 16, bites: 7, color: "#e95838" },
  Salat: { value: 13, bites: 7, color: "#8cba45" },
  Heu: { value: 18, bites: 8, color: "#d6b663" },
});

function foodArtwork(type, key) {
  const gradients = `<defs>
    <linearGradient id="${key}-carrot" x2="0" y2="1"><stop stop-color="#ffd178"/><stop offset=".5" stop-color="#f39729"/><stop offset="1" stop-color="#ce5a17"/></linearGradient>
    <linearGradient id="${key}-pepper" x2="0" y2="1"><stop stop-color="#ffb27c"/><stop offset=".45" stop-color="#f05a38"/><stop offset="1" stop-color="#b72e21"/></linearGradient>
    <linearGradient id="${key}-leaf" x2="1" y2="1"><stop stop-color="#d3e998"/><stop offset=".5" stop-color="#8fbf4b"/><stop offset="1" stop-color="#418044"/></linearGradient>
  </defs>`;
  let shape;
  switch (type) {
    case "Karotte":
      shape = `<path d="M 0 24 Q 28 18 71 10 Q 87 8 88 22 Q 90 35 74 36 Q 29 30 0 24" fill="url(#${key}-carrot)" stroke="#c36a23" stroke-width="1"/>
        <path d="M82 17 Q95 -2 106 7 M85 21 Q105 7 116 15 M86 26 Q105 24 115 32" fill="none" stroke="#52853b" stroke-width="5" stroke-linecap="round"/>
        <path d="M30 22 l-2 4 M49 18 l-2 5 M65 15 l-3 6 M77 28 l-4 4" stroke="#c77429" stroke-width="1.5" opacity=".7"/>`;
      break;
    case "Gurke":
      shape = Array.from({ length: 6 }, (_, i) => `<g><ellipse cx="${8+i*15}" cy="24" rx="10" ry="16" fill="#3e773c"/><ellipse cx="${6+i*15}" cy="22" rx="8" ry="13" fill="#bfde8b"/><path d="M${5+i*15} 16 v4 m2 4 v5" stroke="#eaf0b3" stroke-width="2" stroke-linecap="round"/></g>`).join("");
      break;
    case "Paprika":
      shape = `<path d="M0 24 Q12 2 37 8 Q57 2 86 13 L85 35 Q60 28 37 39 Q16 43 0 24" fill="url(#${key}-pepper)" stroke="#b44428"/>
        <path d="M6 24 Q20 10 37 15 Q59 9 82 17" fill="none" stroke="#ffd895" stroke-width="4"/><path d="M19 26 Q47 31 72 22" fill="none" stroke="#f68451" stroke-width="2"/>`;
      break;
    case "Salat":
      shape = `<path d="M0 24 Q-1 12 12 13 Q9 1 23 8 Q29 -2 40 9 Q49 0 58 10 Q75 1 78 14 Q96 12 86 24 Q99 37 79 35 Q74 48 61 39 Q46 51 36 40 Q22 49 19 37 Q1 40 0 24" fill="url(#${key}-leaf)" stroke="#5d963d"/>
        <path d="M4 24 Q50 25 84 24 M22 24 l9 -12 M41 24 l13 -11 M57 24 l13 -8 M28 25 l9 11 M52 25 l12 10" fill="none" stroke="#d5e8a3" stroke-width="1.8"/>`;
      break;
    case "Heu":
      shape = Array.from({ length: 16 }, (_, i) => `<path data-straw="${i}" d="M${i%3} ${16+i%7*2} Q${35+i%4*4} ${6+i%5*7} ${82+i%4*3} ${11+i%6*5}" fill="none" stroke="${i%2 ? '#dfc57a' : '#a88c43'}" stroke-width="2" stroke-linecap="round"/>`).join("");
      break;
  }
  return `<svg viewBox="0 0 120 48" aria-hidden="true">${gradients}<g class="food-edible">${shape}</g></svg>`;
}

function createFoodView(id, type) {
  const el = document.createElement("div");
  el.className = "food-object";
  el.dataset.pet = id;
  el.dataset.food = type;
  el.dataset.bite = "0";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = foodArtwork(type, `food-${id}`);
  $("#food-layer").append(el);
  return { el, edible: el.querySelector(".food-edible"), crumbs: [] };
}

function renderFoodBite(action) {
  const { view, bite, config, type } = action;
  view.el.dataset.bite = String(bite);
  if (type === "Heu") {
    view.el.querySelectorAll("[data-straw]").forEach((straw, i) => {
      straw.style.display = i < bite * 2 ? "none" : "";
    });
    return;
  }
  // Small scallops at the new cut edge, never proportional shrinking.
  const x = bite / config.bites * 88;
  view.edible.style.clipPath = `polygon(${x}% 0,100% 0,100% 100%,${x}% 100%,${x+1.8}% 78%,${x-1}% 66%,${x+2}% 50%,${x-1}% 34%,${x+1.8}% 22%)`;
}

function spawnFoodCrumbs(action) {
  for (let i = 0; i < 2; i++) {
    const el = document.createElement("i");
    el.className = "food-crumb";
    el.style.background = action.config.color;
    action.view.el.append(el);
    action.view.crumbs.push({ el, age: 0, side: i ? 1 : -1, x: action.edge });
  }
}

function stepFoodCrumbs(action, dt) {
  action.view.crumbs = action.view.crumbs.filter(crumb => {
    crumb.age += dt;
    if (crumb.age >= .8) { crumb.el.remove(); return false; }
    crumb.el.style.left = (crumb.x * 100) + "%";
    crumb.el.style.transform = `translate(${crumb.side * crumb.age * 13}px,${crumb.age * 22}px)`;
    crumb.el.style.opacity = String(1 - crumb.age / .8);
    return true;
  });
}
