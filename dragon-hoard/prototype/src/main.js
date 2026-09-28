// =============================================================
//  Dragon Hoard — Prototype 0.1
//  One chamber. Question under test: is searching a treasure hoard
//  in first person fun? (design doc 111, 112, 123)
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD, PLAYER, BAGS, UPGRADES, DIG, TELEKINESIS, DISTURBANCE, CATEGORIES } from "./config.js";
import { Hoard } from "./hoard.js";
import { Items, CATALOG } from "./items.js";
import { buildCave } from "./cave.js";
import { Input } from "./input.js";
import { Inventory } from "./inventory.js";
import { Sfx } from "./audio.js";
import { CoinSpray } from "./fx.js";
import { UI, fmt } from "./ui.js";

const SAVE_KEY = "dragonhoard.proto01.v1";

// ---------- progression state ----------
function freshState() {
  return {
    gold: 0,
    bag: 0,
    upgrades: { handling: 0, dig: 0, strength: 0, boots: 0, appraisal: 0 },
    telekinesis: false,
    expeditions: 0,
    bestHaul: 0,
    lifetimeGold: 0,
    deaths: 0,
    coinsOn: true,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ state, heights: hoard.serialize(), items: items.serialize() }));
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

const hoard = new Hoard(scene);
const items = new Items(scene, hoard);
const cave = buildCave(scene, renderer, camera);
const spray = new CoinSpray(scene, hoard);
const sfx = new Sfx();
const ui = new UI();
const input = new Input(canvas);
if (input.isTouch) document.body.classList.add("touch");

const saved = readSave();
const state = Object.assign(freshState(), saved ? saved.state : {});
state.upgrades = Object.assign(freshState().upgrades, state.upgrades);
if (saved && saved.heights && hoard.deserialize(saved.heights) && saved.items) {
  items.load(saved.items);
} else {
  items.generate();
}
if (location.hash === "#rich") state.gold += 100000; // playtest shortcut

const inv = new Inventory(state);

const player = { x: WORLD.start.x, z: WORLD.start.z, y: 2, yaw: 0, pitch: -0.12, vx: 0, vz: 0, bob: 0, stepT: 0 };
const dist = { value: 0, quiet: 0, stage: 0, awake: false, timer: 0, nextBreath: 0, nextRumble: 0 };
let mode = "intro";
let shake = 0;
let hold = { target: null, t: 0 };
let digAccum = 0;
let digSound = 0;
let spillWarned = 0;
let lastTime = performance.now();
let elapsed = 0;

// ---------- helpers ----------
const up = (key) => UPGRADES[key].values[state.upgrades[key]];
const hasAppraisal = () => state.upgrades.appraisal > 0;

function valueText(it) {
  const d = it.def;
  if (it.type === "coins") return `<span class="v">${it.coins}g</span>`;
  if (it.type === "pack") return `<span class="v">about ${fmt(it.value)}g inside</span>`;
  if (d.special) return `<span class="v">Not for sale</span>`;
  if (hasAppraisal()) return `<span class="v">${fmt(it.value)}g</span>`;
  if (d.gem) return `<span class="v">could be precious, could be glass</span>`;
  const v = it.value;
  const look = v < 20 ? "looks cheap" : v < 80 ? "looks modest" : v < 300 ? "looks valuable" : "looks very valuable";
  return `<span class="v">${look}</span>`;
}

function entryFor(it) {
  const d = it.def;
  return {
    name: items.displayName(it, true),
    cat: d.cat,
    value: it.value || 0,
    space: items.itemSpace(it),
    weight: items.itemWeight(it),
    type: it.type,
  };
}

function grabTime(it) {
  const w = items.itemWeight(it);
  const base = 0.28 + Math.min(1, w * 0.09);
  const pull = it.buried > 0.3 ? 1 + it.buried * 3.5 : 1;
  return base * pull * up("handling");
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

function findTarget() {
  camera.getWorldDirection(_dir);
  camera.getWorldPosition(_pos);
  const pileHit = hoard.raycast(_pos, _dir, Math.max(PLAYER.reach, state.telekinesis ? TELEKINESIS.range : 0));
  let best = null, bestT = Infinity;
  const tkRange = state.telekinesis ? TELEKINESIS.range : 0;
  for (const it of items.list) {
    if (!it.mesh.visible || it.flying) continue;
    const dx = it.x - _pos.x, dz = it.z - _pos.z;
    if (dx * dx + dz * dz > 100) continue;
    const r = Math.max(0.22, Math.min(0.55, it.def.h * 0.7));
    const t = raySphere(_pos, _dir, it.x, it.y + Math.max(0.05, it.def.h * 0.4), it.z, r);
    if (t < 0 || t > Math.max(PLAYER.reach, tkRange)) continue;
    if (pileHit && pileHit.t < t - 0.45) continue; // hidden behind the pile
    if (t < bestT) { bestT = t; best = it; }
  }
  if (best) {
    const small = items.itemSpace(best) <= TELEKINESIS.maxSpace && items.itemWeight(best) <= TELEKINESIS.maxWeight;
    if (bestT > PLAYER.reach && !(state.telekinesis && small && best.type !== "pack")) best = null;
    else return { kind: "item", it: best, t: bestT, tk: bestT > PLAYER.reach };
  }
  for (const s of cave.colossus.spots) {
    const t = raySphere(_pos, _dir, s.x, s.y, s.z, s.r);
    if (t > 0 && t < 7 && hoard.heightAt(s.x, s.z) < s.y + s.r && (!pileHit || pileHit.t > t - 0.5)) {
      return { kind: "colossus", t };
    }
  }
  if (pileHit && pileHit.t <= PLAYER.reach) return { kind: "pile", hit: pileHit, t: pileHit.t };
  return null;
}

// ---------- actions ----------
function take(it, viaTk) {
  const d = it.def;
  if (it.type === "coins") {
    const got = inv.addCoins(it.coins);
    if (!got) return deny(`No space left in your ${inv.bag.name}.`);
    it.coins -= got;
    ui.toast(`+ ${got} coins`, "gold");
    sfx.clink(1.2);
    sfx.clink(1);
    if (it.coins <= 0) removeTaken(it);
    addDisturbance(d.noise);
    return;
  }
  const space = items.itemSpace(it), weight = items.itemWeight(it);
  if (it.type !== "tome") {
    const why = inv.canTake(space, weight);
    if (why === "space") return deny(`No space left in your ${inv.bag.name}.`);
    if (why === "weight") return deny("Too heavy to lift with everything you're carrying.");
  }
  if (it.type === "tome") {
    // Finding a spellbook unlocks its base spell at once (design doc 47).
    state.telekinesis = true;
    state.pendingSpecials.push("tome");
    sfx.special();
    ui.toast("You found a spellbook: Tome of the Reaching Hand", "special");
    setTimeout(() => ui.toast("Telekinesis learned. Pull small treasure to you from up to 9 metres.", "special"), 900);
    removeTaken(it);
    writeSave();
    return;
  }
  if (it.type === "pack") {
    inv.addItem({ name: "Previous hunter's pack", cat: "Recovered haul", value: it.value, space, weight });
    ui.toast(`Recovered your old pack (${fmt(it.value)}g)`, "gold");
  } else {
    inv.addItem(entryFor(it));
    const shown = items.displayName(it, hasAppraisal());
    ui.toast(hasAppraisal() ? `+ ${shown}  ${fmt(it.value)}g` : `+ ${shown}`, "gold");
  }
  weight >= 4 ? sfx.heavy() : sfx.pickup(it.value);
  addDisturbance(d.noise + (it.buried > 0.3 ? DISTURBANCE.pullBonus : 0) * (viaTk ? 0.5 : 1));
  if (it.buried > 0.3 && !viaTk) {
    // pulling something free makes the treasure around it shift
    hoard.dig(it.x, it.z, d.h * 0.6, 0.7);
    spray.emit(it.x, it.y + d.h, it.z, 6, 0.6);
  }
  removeTaken(it);
}

function removeTaken(it) {
  items.remove(it);
  hold = { target: null, t: 0 };
}

function deny(msg) {
  ui.toast(msg, "warn");
  sfx.deny();
  hold = { target: null, t: 0 };
}

function startTelekinesis(it) {
  const space = items.itemSpace(it), weight = items.itemWeight(it);
  if (it.type !== "coins" && it.type !== "tome") {
    const why = inv.canTake(space, weight);
    if (why) return deny(why === "space" ? `No space left in your ${inv.bag.name}.` : "Too heavy with everything you're carrying.");
  }
  it.flying = { t: 0, x: it.x, y: it.y, z: it.z };
  sfx.tone(300, 0.45, { type: "sine", gain: 0.08, slide: 2.4 });
  hold = { target: null, t: 0 };
}

function updateFlying(dt) {
  for (const it of [...items.list]) {
    if (!it.flying) continue;
    const f = it.flying;
    f.t += dt / TELEKINESIS.flyTime;
    camera.getWorldPosition(_pos);
    const k = Math.min(1, f.t);
    const e = k * k * (3 - 2 * k);
    it.mesh.position.set(
      f.x + (_pos.x - f.x) * e,
      f.y + (_pos.y - 0.4 - f.y) * e + Math.sin(k * Math.PI) * 0.8,
      f.z + (_pos.z - f.z) * e
    );
    it.mesh.rotation.y += dt * 8;
    if (f.t >= 1) {
      it.flying = null;
      take(it, true);
    }
  }
}

function dig(hit, dt) {
  const rate = DIG.baseRate * up("dig") * dt;
  const vol = hoard.dig(hit.x, hit.z, rate, DIG.radius);
  if (vol <= 0.0001) return;
  digAccum += vol * DIG.coinsPerCubicMetre;
  const whole = Math.floor(digAccum);
  digAccum -= whole;
  if (whole > 0 && state.coinsOn) {
    const got = inv.addCoins(whole);
    if (got < whole && elapsed - spillWarned > 6) {
      spillWarned = elapsed;
      ui.toast("Your bag is full. Coins spill back into the pile.", "quiet");
    }
  }
  addDisturbance(DISTURBANCE.digPerSec * Math.sqrt(up("dig")) * dt);
  if (Math.random() < dt * 22) spray.emit(hit.x, hit.y, hit.z, 1, 0.8);
  digSound -= dt;
  if (digSound <= 0) {
    sfx.dig();
    digSound = 0.2;
  }
  shake = Math.max(shake, 0.012);
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
  // chamber wall
  const r = Math.hypot(nx, nz);
  if (r > WORLD.roomRadius) {
    nx *= WORLD.roomRadius / r;
    nz *= WORLD.roomRadius / r;
  }
  // solid things: the colossus and the ruined columns
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
function updateInteraction(dt) {
  const target = findTarget();
  const grabbing = input.grab;
  const digging = input.dig;

  if (!target) {
    ui.prompt(input.isTouch ? "" : "");
    hold = { target: null, t: 0 };
    ui.hold(0);
    return;
  }

  if (target.kind === "item") {
    const it = target.it;
    const d = it.def;
    const name = items.displayName(it, hasAppraisal());
    const limit = d.maxPullBuried ?? 0.8;
    const bits = [valueText(it)];
    if (it.type !== "coins" && it.type !== "tome") {
      bits.push(`${items.itemSpace(it)} space`, `${items.itemWeight(it)} kg`);
    }
    const takeKey = input.isTouch ? "Hold Take" : "E";
    if (it.buried > limit) {
      ui.prompt(`<b>${name}</b>`, `<span class="warn">Buried. Dig around it to free it.</span>`);
      hold = { target: null, t: 0 };
      ui.hold(0);
    } else {
      const verb = target.tk ? "Pull with Telekinesis" : it.buried > 0.3 ? "Pull free" : "Take";
      ui.prompt(`<b>[${takeKey}]</b> ${verb}: <b>${name}</b>`, bits.join(" · "));
      if (grabbing) {
        if (hold.target !== it) hold = { target: it, t: 0 };
        hold.t += dt / (target.tk ? 0.35 * up("handling") : grabTime(it));
        ui.hold(hold.t);
        if (hold.t >= 1) {
          ui.hold(0);
          if (target.tk) startTelekinesis(it);
          else take(it, false);
        }
      } else {
        hold = { target: null, t: 0 };
        ui.hold(0);
      }
    }
    if (digging && !grabbing) {
      const hit = hoard.raycast(_pos, _dir, PLAYER.reach + 0.5);
      if (hit) dig(hit, dt);
    }
    return;
  }

  hold = { target: null, t: 0 };
  ui.hold(0);

  if (target.kind === "colossus") {
    ui.prompt(
      "<b>Golden Colossus</b>",
      hasAppraisal()
        ? `<span class="v">About 250,000g.</span> Far too large for any bag. It needs straps, a wagon or Featherweight.`
        : "Enormous. Far too large for any bag. It needs straps, a wagon or Featherweight."
    );
    return;
  }

  if (target.kind === "pile") {
    const digKey = input.isTouch ? "Hold Dig" : "F / Right click";
    ui.prompt(`<b>[${digKey}]</b> Dig into the hoard`, state.coinsOn ? "Loose coins go into your bag" : "Loose coins are left behind");
    if (digging) dig(target.hit, dt);
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
  for (const key of ["handling", "dig", "strength", "boots", "appraisal"]) {
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
  const specials = [];
  for (const s of info.specials || []) {
    if (s === "tome") {
      specials.push({
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
      specials,
      stats: [
        { label: "Hoard left", value: `${(remaining * 100).toFixed(remaining > 0.99 ? 2 : 1)}%` },
        { label: "Expeditions", value: fmt(state.expeditions) },
        { label: "Best haul", value: `${fmt(state.bestHaul)}g` },
      ],
      shop: shopList(),
    },
    buy
  );
}

function returnToCamp() {
  const escaped = dist.awake;
  const { cats, specials } = inv.summary();
  const rows = [];
  let total = 0;
  const order = [...CATEGORIES, "Recovered haul"];
  for (const cat of order) {
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
  void specials;
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
  hold = { target: null, t: 0 };
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
    items.add({ type: "pack", x: player.x, y, z: player.z, yaw: Math.random() * 6, tilt: 0, value, space, weight });
    text = `Your pack, holding about ${fmt(value)}g, lies where you fell. You can go back for it.`;
  }
  inv.clear();
  state.deaths += 1;
  state.pendingSpecials = state.pendingSpecials.filter(Boolean);
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
input.onToggleCoins = () => {
  state.coinsOn = !state.coinsOn;
  ui.toast(state.coinsOn ? "Pocketing loose coins while digging" : "Leaving loose coins behind while digging", "quiet");
};
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
  if (saved && state.expeditions > 0) {
    sfx.unlock();
    ui.show("intro", false);
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
if (saved && state.expeditions > 0) document.getElementById("btn-start").textContent = "Continue";

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
  elapsed += dt;

  if (mode === "den") {
    updatePlayer(dt);
    if (mode === "den") {
      updateInteraction(dt);
      updateFlying(dt);
      updateDragon(dt);
    }
  } else if (mode === "intro") {
    // slow drift over the hoard behind the title screen
    const a = elapsed * 0.05;
    camera.position.set(Math.sin(a) * 20, 12 + Math.sin(elapsed * 0.1) * 1.5, Math.cos(a) * 20 + 2);
    camera.lookAt(0, 5, -4);
  }

  const { fell, revealed } = items.update(dt);
  if (mode === "den") {
    for (const it of fell) {
      if (Math.hypot(it.x - player.x, it.z - player.z) < 10) sfx.clink(0.8);
    }
    // something new surfaced where you were digging
    for (const it of revealed) {
      if (Math.hypot(it.x - player.x, it.z - player.z) < 7) {
        sfx.tone(1480, 0.35, { type: "sine", gain: 0.05 });
        sfx.tone(2217, 0.4, { type: "sine", gain: 0.03, delay: 0.05 });
        break;
      }
    }
  }
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
    coinsOn: state.coinsOn,
    disturbance: dist.awake ? 100 : dist.value,
  });

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// exposed for automated playtesting in the browser console
window.__hoard = { state, inv, hoard, items, player, dist, camera, renderer, scene, enterDen, returnToCamp, CATALOG, get mode() { return mode; } };
