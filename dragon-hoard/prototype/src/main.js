// =============================================================
//  Dragon Hoard — Prototype 0.1
//  One chamber. Question under test: is searching a treasure hoard
//  in first person fun? (design doc 111, 112, 123)
//  The hoard is made only of items: you take them, or toss them
//  aside to get at what is underneath.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD, PLAYER, BAGS, UPGRADES, TELEKINESIS, DISTURBANCE, CATEGORIES, TOSS } from "./config.js";
import { Hoard } from "./hoard.js";
import { Treasure } from "./treasure.js";
import { Specials, makeMaterials, displayName, itemSpace, itemWeight, itemValue } from "./items.js";
import { buildCave } from "./cave.js";
import { Input } from "./input.js";
import { Inventory } from "./inventory.js";
import { Sfx } from "./audio.js";
import { CoinSpray } from "./fx.js";
import { UI, fmt } from "./ui.js";

const SAVE_KEY = "dragonhoard.proto01.v2";

// ---------- progression state ----------
function freshState() {
  return {
    gold: 0,
    bag: 0,
    upgrades: { handling: 0, shovel: 0, strength: 0, boots: 0, appraisal: 0 },
    telekinesis: false,
    expeditions: 0,
    bestHaul: 0,
    lifetimeGold: 0,
    deaths: 0,
    itemsMoved: 0,
    pendingSpecials: [],
  };
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      state, hoard: hoard.serialize(), loose: treasure.serialize(), specials: specials.serialize(),
    }));
  } catch (_) {
    /* saving is best-effort */
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (_) {}
}

// ---------- setup ----------
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 120);
camera.rotation.order = "YXZ";
scene.add(camera);

const mats = makeMaterials();
const hoard = new Hoard(scene);
const treasure = new Treasure(scene, hoard, mats);
const specials = new Specials(scene, hoard, mats);
const cave = buildCave(scene, renderer, camera);
const spray = new CoinSpray(scene, hoard);
const sfx = new Sfx();
const ui = new UI();
const input = new Input(canvas);
if (input.isTouch) document.body.classList.add("touch");

const saved = readSave();
const state = Object.assign(freshState(), saved ? saved.state : {});
state.upgrades = Object.assign(freshState().upgrades, state.upgrades);
const restored = !!(saved && hoard.deserialize(saved.hoard));
treasure.buildAll();
if (restored) {
  treasure.load(saved.loose);
  specials.load(saved.specials || []);
} else {
  specials.generate();
}
if (location.hash === "#rich") state.gold += 100000; // playtest shortcut

const inv = new Inventory(state);

const player = { x: WORLD.start.x, z: WORLD.start.z, y: 2, yaw: 0, pitch: -0.12, vx: 0, vz: 0, bob: 0, stepT: 0 };
const dist = { value: 0, quiet: 0, stage: 0, awake: false, timer: 0, nextBreath: 0, nextRumble: 0 };
let mode = "intro";
let shake = 0;
let hold = { target: null, t: 0, verb: "" };
let tossSide = 1;
let lastTime = performance.now();
let elapsed = 0;

// ---------- helpers ----------
const up = (key) => UPGRADES[key].values[state.upgrades[key]];
const hasAppraisal = () => state.upgrades.appraisal > 0;

function valueText(it) {
  if (it.type === "coins") return `<span class="v">${it.coins}g</span>`;
  if (it.type === "pack") return `<span class="v">about ${fmt(it.value)}g inside</span>`;
  if (it.def.special) return `<span class="v">Not for sale</span>`;
  if (hasAppraisal()) return `<span class="v">${fmt(it.value)}g</span>`;
  if (it.def.gem) return `<span class="v">could be precious, could be glass</span>`;
  const v = it.value;
  const look = v < 20 ? "looks cheap" : v < 80 ? "looks modest" : v < 300 ? "looks valuable" : "looks very valuable";
  return `<span class="v">${look}</span>`;
}

function nameOf(it) {
  return it.special ? it.def.label : displayName(it, hasAppraisal());
}

function grabTime(it) {
  return (0.28 + Math.min(1, itemWeight(it) * 0.09)) * up("handling");
}

function addDisturbance(n) {
  if (n <= 0 || dist.awake) return;
  dist.value = Math.min(DISTURBANCE.max, dist.value + n);
  dist.quiet = 0;
}

function haulText() {
  const v = inv.totalValue();
  if (!v) return "";
  if (hasAppraisal()) return `${fmt(v)}g`;
  return `≈ ${fmt(Math.round(v / 50) * 50 || v)}g`;
}

function spaceText(it) {
  const s = itemSpace(it);
  return `${s < 1 ? s.toFixed(1) : +s.toFixed(1)} space`;
}

// Treasure sliding into a hole: coins spill and clatter.
function slideFx(slides) {
  let n = 0;
  for (const [from, to] of slides) {
    if (n++ > 10) break;
    const x = hoard.cellX(to), z = hoard.cellZ(to);
    spray.emit(x, hoard.heightAt(x, z), z, 2, 0.35);
  }
  if (slides.length) {
    sfx.clink(1);
    if (slides.length > 3) {
      sfx.noise(0.5, { freq: 2600, q: 0.6, gain: 0.12 });
      shake = Math.max(shake, 0.02);
    }
  }
}

// ---------- targeting ----------
const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();

function raySphere(o, d, cx, cy, cz, r) {
  const lx = cx - o.x, ly = cy - o.y, lz = cz - o.z;
  const tca = lx * d.x + ly * d.y + lz * d.z;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}

function tkAllowed(it) {
  return state.telekinesis && !it.special && itemSpace(it) <= TELEKINESIS.maxSpace && itemWeight(it) <= TELEKINESIS.maxWeight;
}

function findTarget() {
  camera.updateMatrixWorld();
  camera.getWorldDirection(_dir);
  camera.getWorldPosition(_pos);
  const range = Math.max(PLAYER.reach, state.telekinesis ? TELEKINESIS.range : 0);
  let best = null, bestT = Infinity;

  const hit = treasure.pick(_pos, _dir, range);
  if (hit) { best = hit.it; bestT = hit.t; }

  // Special objects win over a loose "nearest item" guess.
  for (const it of specials.list) {
    if (!it.mesh.visible) continue;
    const t = raySphere(_pos, _dir, it.x, it.y + 0.12, it.z, it.type === "pack" ? 0.42 : 0.3);
    if (t > 0 && t <= PLAYER.reach + 0.3 && (t < bestT || (hit && !hit.exact))) { best = it; bestT = t; }
  }

  if (best) {
    const far = bestT > PLAYER.reach;
    if (!far || tkAllowed(best)) return { kind: "item", it: best, t: bestT, tk: far };
  }
  for (const s of cave.colossus.spots) {
    const t = raySphere(_pos, _dir, s.x, s.y, s.z, s.r);
    if (t > 0 && t < 7 && hoard.heightAt(s.x, s.z) < s.y + s.r && t < bestT) return { kind: "colossus", t };
  }
  return null;
}

// ---------- actions ----------
function deny(msg) {
  ui.toast(msg, "warn");
  sfx.deny();
  hold = { target: null, t: 0, verb: "" };
}

function roomFor(it) {
  if (it.type === "tome") return true;
  const why = inv.canTake(itemSpace(it), itemWeight(it));
  if (why === "space") deny(`No space left in your ${inv.bag.name}.`);
  else if (why === "weight") deny("Too heavy to lift with everything you're carrying.");
  return !why;
}

function bag(it) {
  if (it.type === "coins") {
    inv.addCoins(it.coins);
    ui.toast(`+ ${it.coins} coins`, "gold");
    sfx.clink(1.2);
    sfx.clink(1);
    return;
  }
  if (it.type === "pack") {
    inv.addItem({ name: "Previous hunter's pack", cat: "Recovered haul", value: it.value, space: itemSpace(it), weight: itemWeight(it) });
    ui.toast(`Recovered your old pack (${fmt(it.value)}g)`, "gold");
    sfx.pickup(it.value);
    return;
  }
  inv.addItem({ name: displayName(it, true), cat: it.def.cat, value: it.value || 0, space: itemSpace(it), weight: itemWeight(it) });
  ui.toast(hasAppraisal() ? `+ ${nameOf(it)}  ${fmt(it.value)}g` : `+ ${nameOf(it)}`, "gold");
  itemWeight(it) >= 4 ? sfx.heavy() : sfx.pickup(it.value);
}

function takeSpecial(it) {
  if (it.type === "tome") {
    // Finding a spellbook unlocks its base spell at once (design doc 47).
    state.telekinesis = true;
    state.pendingSpecials.push("tome");
    sfx.special();
    ui.toast("You found a spellbook: Tome of the Reaching Hand", "special");
    setTimeout(() => ui.toast("Telekinesis learned. Pull small treasure to you from up to 9 metres.", "special"), 900);
    specials.remove(it);
    writeSave();
    return;
  }
  if (!roomFor(it)) return;
  bag(it);
  specials.remove(it);
}

function take(it) {
  if (it.special) return takeSpecial(it);
  if (!roomFor(it)) return;
  const slides = treasure.remove(it);
  bag(it);
  addDisturbance(it.def.noise);
  slideFx(slides);
  state.itemsMoved += 1;
}

function pullTk(it) {
  if (!roomFor(it)) return;
  const slides = treasure.remove(it);
  slideFx(slides);
  const ghost = treasure.prepare(copyItem(it));
  treasure.show(ghost);
  sfx.tone(300, 0.45, { type: "sine", gain: 0.08, slide: 2.4 });
  treasure.fly(ghost, () => {
    camera.getWorldPosition(_pos);
    return { x: _pos.x, y: _pos.y - 0.4, z: _pos.z };
  }, TELEKINESIS.flyTime, 0.8, (g) => {
    treasure.hide(g);
    bag(it);
  });
  addDisturbance(it.def.noise * 0.5);
  state.itemsMoved += 1;
}

function copyItem(it) {
  return treasure.data(it);
}

// Throw treasure out of the way, to whichever side is lower.
function toss(first, around) {
  if (first.special && !around) return deny("Too precious to throw. Take it instead.");
  const batch = around || [first, ...treasure.near(first.x, first.z, TOSS.reach, up("shovel") - 1, first)];
  if (!batch.length) return;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const bx = Math.sin(player.yaw), bz = Math.cos(player.yaw); // behind the player
  const land = (side) => ({ x: player.x + rx * side * TOSS.distance + bx * 0.5, z: player.z + rz * side * TOSS.distance + bz * 0.5 });
  const right = land(1), left = land(-1);
  const side = hoard.heightAt(right.x, right.z) <= hoard.heightAt(left.x, left.z) ? 1 : -1;
  const spot = side === 1 ? right : left;
  let slides = [];
  let noise = 0;
  for (const it of batch) {
    if (it.dead) continue;
    const data = copyItem(it);
    slides = slides.concat(treasure.remove(it));
    const ghost = treasure.prepare({ ...data });
    treasure.show(ghost);
    let lx = spot.x + (Math.random() - 0.5) * 0.9, lz = spot.z + (Math.random() - 0.5) * 0.9;
    const r = Math.hypot(lx, lz);
    if (r > WORLD.roomRadius - 0.5) { lx *= (WORLD.roomRadius - 0.5) / r; lz *= (WORLD.roomRadius - 0.5) / r; }
    const target = { x: lx, y: Math.max(0, hoard.heightAt(lx, lz)), z: lz };
    treasure.fly(ghost, () => target, TOSS.flight * (0.85 + Math.random() * 0.3), 0.7 + Math.random() * 0.4, (g) => {
      treasure.hide(g);
      treasure.addLoose({ ...data, x: target.x, y: Math.max(0, hoard.heightAt(target.x, target.z)), z: target.z, yaw: g.yaw });
      sfx.clink(0.9);
    });
    noise += DISTURBANCE.tossBase + it.def.noise * 0.6;
    state.itemsMoved += 1;
  }
  addDisturbance(noise);
  slideFx(slides);
  sfx.noise(0.18, { freq: 1800, q: 0.8, gain: 0.08 });
}

// ---------- disturbance & the dragon ----------
function updateDragon(dt) {
  if (dist.awake) {
    dist.timer -= dt;
    ui.danger(true, dist.timer);
    dist.nextRumble -= dt;
    if (dist.nextRumble <= 0) {
      dist.nextRumble = 2.5 + Math.random() * 2.5;
      sfx.rumble(1);
      shake = 0.09;
      spray.slide(player.x, player.z, 9, 26);
    }
    if (dist.timer <= 0) die();
    return;
  }
  dist.quiet += dt;
  if (dist.quiet > DISTURBANCE.decayDelay) dist.value = Math.max(0, dist.value - DISTURBANCE.decayPerSec * dt);

  const stage = dist.value >= DISTURBANCE.max ? 3 : dist.value >= DISTURBANCE.danger ? 2 : dist.value >= DISTURBANCE.warn ? 1 : 0;
  if (stage > dist.stage) {
    if (stage === 1) {
      ui.toast("Somewhere deep in the cave, something breathes.", "quiet");
      sfx.breath();
    } else if (stage === 2) {
      ui.toast("The hoard trembles. Something enormous is stirring.", "warn");
      sfx.rumble(0.8);
      shake = 0.05;
      spray.slide(player.x, player.z, 8, 18);
    } else if (stage === 3) {
      dist.awake = true;
      dist.timer = DISTURBANCE.escapeTime;
      dist.nextRumble = 1.5;
      sfx.roar();
      shake = 0.12;
      ui.flash("#ff7040", 900);
    }
  }
  dist.stage = stage;
  if (stage >= 1) {
    dist.nextBreath -= dt;
    if (dist.nextBreath <= 0) {
      dist.nextBreath = stage === 2 ? 4 + Math.random() * 2 : 7 + Math.random() * 4;
      sfx.breath();
      if (stage === 2) {
        shake = Math.max(shake, 0.03);
        spray.slide(player.x, player.z, 7, 8);
      }
    }
  }
}

function resetDisturbance() {
  Object.assign(dist, { value: 0, quiet: 0, stage: 0, awake: false, timer: 0, nextBreath: 0, nextRumble: 0 });
  ui.danger(false);
}

// ---------- player ----------
function updatePlayer(dt) {
  const look = input.consumeLook();
  player.yaw -= look.x;
  player.pitch = Math.max(-1.45, Math.min(1.35, player.pitch - look.y));

  const mv = input.moveVector();
  const moving = Math.hypot(mv.x, mv.y) > 0.05;
  const over = inv.overload;
  const sprint = input.sprint && over < 0.3;
  const ground = Math.max(0, hoard.heightAt(player.x, player.z));
  let speed = (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * up("boots");
  if (ground > 0.15) speed *= PLAYER.treasureWadeMult;
  speed *= Math.max(0.3, 1 - over * 0.9);

  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const tx = (fx * -mv.y + rx * mv.x) * speed;
  const tz = (fz * -mv.y + rz * mv.x) * speed;
  const k = Math.min(1, dt * 10);
  player.vx += (tx - player.vx) * k;
  player.vz += (tz - player.vz) * k;

  let nx = player.x + player.vx * dt;
  let nz = player.z + player.vz * dt;
  const r = Math.hypot(nx, nz);
  if (r > WORLD.roomRadius) {
    nx *= WORLD.roomRadius / r;
    nz *= WORLD.roomRadius / r;
  }
  for (const c of cave.colliders) {
    const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz);
    if (d < c.r && d > 0.0001) {
      nx = c.x + (dx / d) * c.r;
      nz = c.z + (dz / d) * c.r;
    }
  }
  player.x = nx;
  player.z = nz;

  const g = Math.max(0, hoard.heightAt(player.x, player.z));
  const targetY = g + PLAYER.eyeHeight;
  player.y += (targetY - player.y) * Math.min(1, dt * (targetY > player.y ? 12 : 8));

  const spd = Math.hypot(player.vx, player.vz);
  if (moving && spd > 0.5) {
    player.bob += dt * spd * 2.1;
    player.stepT -= dt * spd;
    if (player.stepT <= 0) {
      player.stepT = 1.5;
      if (g > 0.15) sfx.clink(0.5);
    }
    if (over > 0) addDisturbance(DISTURBANCE.overloadMovePerSec * Math.min(2, 0.5 + over) * dt);
    if (sprint) addDisturbance(DISTURBANCE.sprintPerSec * dt);
  }

  shake *= Math.pow(0.02, dt);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  camera.position.set(player.x + sx, player.y + Math.sin(player.bob) * 0.035 + sy, player.z);
  camera.rotation.set(player.pitch + sy * 0.3, player.yaw, 0);

  const de = Math.hypot(player.x - WORLD.entrance.x, player.z - WORLD.entrance.z);
  if (de < WORLD.exitRadius) returnToCamp();
}

// ---------- interaction ----------
function resetHold() {
  hold = { target: null, t: 0, verb: "" };
  ui.hold(0);
}

function updateInteraction(dt) {
  const target = findTarget();
  if (!target) {
    ui.prompt("");
    resetHold();
    return;
  }

  if (target.kind === "colossus") {
    ui.prompt(
      "<b>Golden Colossus</b>",
      hasAppraisal()
        ? `<span class="v">About 250,000g.</span> Far too large for any bag. It needs straps, a wagon or Featherweight.`
        : "Enormous. Far too large for any bag. It needs straps, a wagon or Featherweight."
    );
    resetHold();
    return;
  }

  const it = target.it;
  const name = nameOf(it);
  const takeKey = input.isTouch ? "Take" : "E";
  const tossKey = input.isTouch ? "Toss" : "F";

  if (it.special && it.buried > 0.4) {
    ui.prompt(`<b>${name}</b>`, `<span class="warn">Stuck under treasure.</span> <b>[${tossKey}]</b> Toss aside what's around it`);
    if (!input.dig) return resetHold();
    if (hold.target !== it || hold.verb !== "around") hold = { target: it, t: 0, verb: "around" };
    hold.t += dt / (TOSS.time * up("handling"));
    ui.hold(hold.t);
    if (hold.t >= 1) {
      resetHold();
      const around = treasure.near(it.x, it.z, 0.9, up("shovel"));
      if (around.length) toss(it, around);
    }
    return;
  }

  const bits = [valueText(it)];
  if (it.type !== "tome") bits.push(spaceText(it), `${+itemWeight(it).toFixed(2)} kg`);
  if (target.tk) {
    ui.prompt(`<b>[${takeKey}]</b> Pull with Telekinesis: <b>${name}</b>`, bits.join(" · "));
  } else {
    const shovel = up("shovel");
    const tossText = it.special ? "" : ` · <b>[${tossKey}]</b> Toss aside${shovel > 1 ? ` (${shovel})` : ""}`;
    ui.prompt(`<b>[${takeKey}]</b> Take <b>${name}</b>${tossText}`, bits.join(" · "));
  }

  const verb = input.grab ? "take" : input.dig && !target.tk ? "toss" : "";
  if (!verb) return resetHold();
  if (hold.target !== it || hold.verb !== verb) hold = { target: it, t: 0, verb };
  const time = verb === "toss" ? TOSS.time * up("handling") : target.tk ? 0.35 * up("handling") : grabTime(it);
  hold.t += dt / time;
  ui.hold(hold.t);
  if (hold.t >= 1) {
    resetHold();
    if (verb === "toss") toss(it);
    else if (target.tk) pullTk(it);
    else take(it);
  }
}

// ---------- camp ----------
function shopList() {
  const list = [];
  const nextBag = BAGS[state.bag + 1];
  if (nextBag && nextBag.id !== "holding") {
    list.push({
      key: "bag", name: nextBag.name, tier: `replaces ${BAGS[state.bag].name}`,
      desc: nextBag.blurb,
      fx: `<b>${nextBag.space} space</b> · <b>${nextBag.weight} kg</b> (now ${BAGS[state.bag].space} · ${BAGS[state.bag].weight} kg)`,
      cost: nextBag.cost, afford: state.gold >= nextBag.cost,
    });
  }
  for (const key of ["handling", "shovel", "strength", "boots", "appraisal"]) {
    const u = UPGRADES[key];
    const lvl = state.upgrades[key];
    const maxed = lvl >= u.costs.length;
    const tierName = u.tiers ? u.tiers[Math.min(lvl + (maxed ? 0 : 1), u.tiers.length - 1)] : null;
    list.push({
      key,
      name: u.tiers ? tierName : u.name,
      tier: maxed ? "max" : u.costs.length > 1 ? `level ${lvl + 1} of ${u.costs.length}` : "",
      desc: u.desc,
      fx: maxed ? u.fmt(u.values[lvl]) : `${u.fmt(u.values[lvl])} → <b>${u.fmt(u.values[lvl + 1])}</b>`,
      cost: maxed ? 0 : u.costs[lvl],
      afford: !maxed && state.gold >= u.costs[lvl],
      maxed,
    });
  }
  const holding = BAGS.find((b) => b.id === "holding");
  const hasHolding = BAGS[state.bag].id === "holding";
  list.push({
    key: "holding", name: holding.name, tier: hasHolding ? "" : "the dream",
    desc: holding.blurb,
    fx: `<b>${holding.space} space</b> · <b>${holding.weight} kg</b>`,
    cost: holding.cost, afford: state.gold >= holding.cost && state.bag === BAGS.length - 2,
    maxed: hasHolding, dream: true,
  });
  return list;
}

function buy(key) {
  if (key === "bag" || key === "holding") {
    const next = BAGS[state.bag + 1];
    if (!next || state.gold < next.cost) return;
    if (key === "holding" && next.id !== "holding") return;
    state.gold -= next.cost;
    state.bag += 1;
  } else {
    const u = UPGRADES[key];
    const lvl = state.upgrades[key];
    if (lvl >= u.costs.length || state.gold < u.costs[lvl]) return;
    state.gold -= u.costs[lvl];
    state.upgrades[key] = lvl + 1;
  }
  sfx.pickup(500);
  writeSave();
  renderCamp(lastCamp);
}

let lastCamp = null;

function renderCamp(info) {
  lastCamp = info;
  const specialCards = [];
  for (const s of info.specials || []) {
    if (s === "tome") {
      specialCards.push({
        kind: "Spellbook found",
        name: "Tome of the Reaching Hand",
        text: "Telekinesis is yours. Pull small treasure to you from up to 9 metres away. In the full game the Mage would open this spell's upgrade branch.",
      });
    }
  }
  const remaining = hoard.remainingFraction();
  ui.camp(
    {
      eyebrow: info.eyebrow,
      title: info.title,
      gold: state.gold,
      rows: info.rows || [],
      total: info.total || 0,
      emptyText: info.emptyText || "Nothing sold this time.",
      specials: specialCards,
      stats: [
        { label: "Hoard left", value: `${(remaining * 100).toFixed(remaining > 0.99 ? 2 : 1)}%` },
        { label: "Items moved", value: fmt(state.itemsMoved) },
        { label: "Best haul", value: `${fmt(state.bestHaul)}g` },
      ],
      shop: shopList(),
    },
    buy
  );
}

function returnToCamp() {
  const escaped = dist.awake;
  const { cats } = inv.summary();
  const rows = [];
  let total = 0;
  for (const cat of [...CATEGORIES, "Recovered haul"]) {
    const c = cats.get(cat);
    if (!c) continue;
    rows.push({ cat, count: c.count, value: c.value });
    total += c.value;
  }
  state.gold += total;
  state.lifetimeGold += total;
  state.expeditions += 1;
  state.bestHaul = Math.max(state.bestHaul, total);
  const pending = state.pendingSpecials.splice(0);
  inv.clear();
  resetDisturbance();
  writeSave();
  if (total) sfx.sale(total);
  enterCamp({
    eyebrow: `Expedition ${state.expeditions}`,
    title: escaped ? "You made it out" : total ? "The Merchant pays out" : "Back at camp",
    rows, total, specials: pending,
    emptyText: "You came back empty-handed.",
  });
}

function enterCamp(info) {
  mode = "camp";
  input.enabled = false;
  input.reset();
  input.releaseLock();
  ui.show("hud", false);
  ui.show("pause", false);
  ui.show("death", false);
  ui.show("intro", false);
  document.getElementById("touch-layer").hidden = true;
  renderCamp(info);
  ui.show("camp", true);
  document.getElementById("camp").scrollTop = 0;
}

function enterDen() {
  sfx.unlock();
  ui.show("intro", false);
  ui.show("camp", false);
  ui.show("death", false);
  ui.show("hud", true);
  if (input.isTouch) document.getElementById("touch-layer").hidden = false;
  Object.assign(player, { x: WORLD.start.x, z: WORLD.start.z, yaw: 0, pitch: -0.12, vx: 0, vz: 0 });
  player.y = Math.max(0, hoard.heightAt(player.x, player.z)) + PLAYER.eyeHeight;
  resetDisturbance();
  resetHold();
  input.reset();
  input.enabled = true;
  input.requestLock();
  mode = "den";
}

function die() {
  mode = "death";
  input.enabled = false;
  input.reset();
  input.releaseLock();
  ui.flash("#ff9a40", 1400);
  sfx.rumble(1.4);
  const value = inv.totalValue();
  let text = "You carried nothing, so nothing was lost.";
  if (value > 0) {
    const space = Math.max(1, Math.round(inv.spaceUsed * 10) / 10);
    const weight = Math.round(inv.weightUsed * 10) / 10;
    const y = Math.max(0, hoard.heightAt(player.x, player.z));
    specials.add({ type: "pack", x: player.x, y, z: player.z, yaw: Math.random() * 6, tilt: 0, value, space, weight });
    text = `Your pack, holding about ${fmt(value)}g, lies where you fell. You can go back for it.`;
  }
  inv.clear();
  state.deaths += 1;
  resetDisturbance();
  writeSave();
  setTimeout(() => {
    ui.show("hud", false);
    document.getElementById("touch-layer").hidden = true;
    document.getElementById("death-text").textContent = text;
    ui.show("death", true);
  }, 700);
}

// ---------- wiring ----------
input.onUnlock = () => {
  if (mode === "den") {
    mode = "pause";
    ui.show("pause", true);
  }
};
document.getElementById("pause").addEventListener("click", () => {
  ui.show("pause", false);
  mode = "den";
  input.enabled = true;
  input.requestLock();
});
document.getElementById("btn-start").addEventListener("click", () => {
  if (restored && state.expeditions > 0) {
    sfx.unlock();
    enterCamp({ eyebrow: "Expedition camp", title: "Welcome back", rows: [], emptyText: "Your camp is as you left it." });
  } else {
    enterDen();
  }
});
document.getElementById("btn-enter").addEventListener("click", enterDen);
document.getElementById("btn-death").addEventListener("click", () => {
  enterCamp({ eyebrow: "A new relic hunter arrives", title: "Camp", rows: [], emptyText: "Nothing was sold." });
});
document.getElementById("btn-reset").addEventListener("click", () => {
  document.getElementById("reset-confirm").hidden = false;
  document.getElementById("btn-reset").hidden = true;
});
document.getElementById("btn-reset-no").addEventListener("click", () => {
  document.getElementById("reset-confirm").hidden = true;
  document.getElementById("btn-reset").hidden = false;
});
document.getElementById("btn-reset-yes").addEventListener("click", () => {
  clearSave();
  location.reload();
});
if (restored && state.expeditions > 0) document.getElementById("btn-start").textContent = "Continue";

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 80 : 72;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// ---------- loop ----------
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  tick(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function tick(dt) {
  elapsed += dt;

  if (mode === "den") {
    updatePlayer(dt);
    if (mode === "den") {
      updateInteraction(dt);
      updateDragon(dt);
    }
  } else if (mode === "intro") {
    // slow drift over the hoard behind the title screen
    const a = elapsed * 0.05;
    camera.position.set(Math.sin(a) * 20, 12 + Math.sin(elapsed * 0.1) * 1.5, Math.cos(a) * 20 + 2);
    camera.lookAt(0, 5, -4);
  }

  treasure.update(dt);
  specials.update(dt);
  spray.update(dt);
  cave.update(elapsed);

  ui.hud({
    gold: state.gold,
    bagName: inv.bag.name,
    haul: haulText(),
    spaceUsed: inv.spaceUsed,
    spaceCap: inv.spaceCap,
    weightUsed: inv.weightUsed,
    weightCap: inv.weightCap,
    disturbance: dist.awake ? 100 : dist.value,
  });
}
requestAnimationFrame(frame);

// exposed for automated playtesting in the browser console
window.__hoard = {
  state, inv, hoard, treasure, specials, player, dist, camera, renderer, scene,
  enterDen, returnToCamp, input, get mode() { return mode; }, get hold() { return hold; },
  // advance game logic without drawing (slow software renderers in tests)
  sim(seconds, dt = 1 / 30) { for (let t = 0; t < seconds; t += dt) tick(dt); },
};
