// =============================================================
//  Treasure catalog, low-poly item shapes, and the few special
//  one-off objects (the spellbook, a dropped pack) that are always
//  real authored objects (design doc 107). The ordinary hoard items
//  are managed by treasure.js.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { COINS } from "./config.js";
import { range, weightedPick } from "./rng.js";

// ---------- colours ----------
const C = {
  gold: [0.98, 0.72, 0.24],
  silver: [0.8, 0.82, 0.88],
  bronze: [0.72, 0.43, 0.2],
  wood: [0.42, 0.25, 0.13],
  darkwood: [0.3, 0.17, 0.09],
  clay: [0.66, 0.35, 0.2],
  claydark: [0.45, 0.22, 0.13],
  ivory: [0.92, 0.88, 0.76],
  ruby: [0.9, 0.08, 0.18],
  emerald: [0.06, 0.75, 0.38],
  sapphire: [0.12, 0.3, 0.95],
  star: [0.86, 0.8, 1.0],
  tome: [0.1, 0.22, 0.62],
  leather: [0.36, 0.24, 0.14],
  red: [0.55, 0.1, 0.1],
};

export const METALS = [
  { id: "gold", label: "Gold", mult: 1, w: 4 },
  { id: "silver", label: "Silver", mult: 0.4, w: 4 },
  { id: "bronze", label: "Bronze", mult: 0.15, w: 3 },
];
export const GEMS = [
  { id: "ruby", label: "Ruby", look: "Red Gem" },
  { id: "emerald", label: "Emerald", look: "Green Gem" },
  { id: "sapphire", label: "Sapphire", look: "Blue Gem" },
];

// ---------- catalog ----------
// base: value range for the best material, before the depth bonus.
// h: effective height used to decide how buried the item is.
export const CATALOG = {
  coins: { label: "Coin Heap", cat: "Coins", mat: "metal", h: 0.13, noise: 0.5, spawn: 30, stack: [12, 40] },
  ring: { label: "Ring", cat: "Jewelry", metal: true, base: [25, 60], space: 0.1, weight: 0.02, h: 0.04, noise: 0.2, spawn: 9 },
  necklace: { label: "Necklace", cat: "Jewelry", metal: true, base: [40, 110], space: 0.2, weight: 0.08, h: 0.04, noise: 0.3, spawn: 6 },
  goblet: { label: "Goblet", cat: "Tableware", metal: true, base: [30, 90], space: 1, weight: 0.6, h: 0.26, noise: 1, spawn: 12 },
  plate: { label: "Plate", cat: "Tableware", metal: true, base: [20, 60], space: 1.2, weight: 1.1, h: 0.05, noise: 1, spawn: 8 },
  pottery: { label: "Old Urn", cat: "Misc", mat: "matte", base: [4, 18], space: 2.2, weight: 1.6, h: 0.42, noise: 1.5, spawn: 2.5 },
  gem: { label: "Gem", cat: "Gems", mat: "gem", gem: true, base: [110, 380], space: 0.1, weight: 0.03, h: 0.1, noise: 0.2, spawn: 8, minDepth: 0.4 },
  sword: { label: "Sword", cat: "Weapons & Armor", metal: true, base: [40, 150], space: 2.5, weight: 2.4, h: 1.0, noise: 3, spawn: 9 },
  helmet: { label: "Helm", cat: "Weapons & Armor", metal: true, base: [50, 140], space: 2, weight: 2.2, h: 0.22, noise: 3, spawn: 7 },
  shield: { label: "Shield", cat: "Weapons & Armor", metal: true, base: [60, 190], space: 3, weight: 4.5, h: 0.64, noise: 4, spawn: 6 },
  crown: { label: "Crown", cat: "Jewelry", metal: true, base: [260, 700], space: 1.5, weight: 1.2, h: 0.2, noise: 1, spawn: 2.2, minDepth: 1.5 },
  jewelBox: { label: "Jewel Box", cat: "Jewelry", mat: "matte", base: [180, 480], space: 1.5, weight: 1.6, h: 0.2, noise: 1, spawn: 2.5, minDepth: 1 },
  chest: { label: "Small Chest", cat: "Misc", mat: "matte", base: [160, 460], space: 4, weight: 9, h: 0.52, noise: 5, spawn: 3, minDepth: 1 },
  statuette: { label: "Statuette", cat: "Art & Relics", metal: true, base: [160, 520], space: 3, weight: 5, h: 0.55, noise: 4, spawn: 3, minDepth: 1 },
  jewel: { label: "Starheart Jewel", cat: "Gems", mat: "gem", base: [3500, 6500], space: 0.1, weight: 0.05, h: 0.14, noise: 0.2, spawn: 0.25, minDepth: 3 },
  // special, never spawned randomly
  tome: { label: "Tome of the Reaching Hand", cat: "Special", mat: "matte", special: true, space: 0.5, weight: 1, h: 0.2, noise: 0.5 },
  pack: { label: "Previous Hunter's Pack", cat: "Recovered", mat: "matte", h: 0.4, noise: 1 },
};

// ---------- geometry helpers ----------
function part(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  return { geo, color, p, r, s };
}

function merge(parts) {
  const pos = [], nor = [], col = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (const pt of parts) {
    let g = pt.geo.index ? pt.geo.toNonIndexed() : pt.geo.clone();
    q.setFromEuler(new THREE.Euler(...pt.r));
    m.compose(new THREE.Vector3(...pt.p), q, new THREE.Vector3(...pt.s));
    g.applyMatrix4(m);
    const pa = g.attributes.position.array;
    const na = g.attributes.normal.array;
    for (let k = 0; k < pa.length; k++) {
      pos.push(pa[k]);
      nor.push(na[k]);
    }
    for (let k = 0; k < pa.length / 3; k++) col.push(...pt.color);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

const lathe = (pts, seg = 10) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

export function buildGeometry(type, v) {
  const metal = C[v] || C.gold;
  switch (type) {
    case "coins": {
      // a low heap with a few flat coins lying on it (coins are one-sided discs)
      const parts = [part(new THREE.ConeGeometry(0.24, 0.11, 7, 1, true), C.gold, [0, 0.055, 0])];
      for (let k = 0; k < 4; k++) {
        const a = k * 2.4;
        parts.push(part(new THREE.CircleGeometry(0.065, 6), C.gold,
          [Math.cos(a) * 0.13, 0.05 + (k % 2) * 0.03, Math.sin(a) * 0.13], [-Math.PI / 2 + 0.5 * Math.sin(k), 0, 0.4 * Math.cos(k)]));
      }
      return merge(parts);
    }
    case "ring":
      return merge([
        part(new THREE.TorusGeometry(0.08, 0.025, 3, 8), metal, [0, 0.025, 0], [Math.PI / 2, 0, 0]),
        part(new THREE.OctahedronGeometry(0.04), C.ruby, [0.08, 0.055, 0]),
      ]);
    case "necklace":
      return merge([
        part(new THREE.TorusGeometry(0.17, 0.016, 3, 9), metal, [0, 0.016, 0], [Math.PI / 2, 0, 0]),
        part(new THREE.OctahedronGeometry(0.045), C.emerald, [0, 0.04, 0.2]),
      ]);
    case "goblet":
      return merge([
        part(lathe([[0, 0], [0.09, 0], [0.02, 0.04], [0.02, 0.13], [0.1, 0.26], [0.02, 0.18]], 6), metal),
        part(new THREE.OctahedronGeometry(0.02), C.ruby, [0.095, 0.2, 0]),
      ]);
    case "plate":
      return merge([part(new THREE.CylinderGeometry(0.2, 0.15, 0.035, 9), metal, [0, 0.02, 0])]);
    case "pottery":
      return merge([
        part(lathe([[0, 0], [0.12, 0], [0.18, 0.13], [0.15, 0.28], [0.08, 0.36], [0.09, 0.42], [0, 0.4]], 7), C.clay),
      ]);
    case "gem":
      return merge([part(new THREE.OctahedronGeometry(0.085), C[v] || C.ruby, [0, 0.08, 0], [0, 0, 0], [1, 1.3, 1])]);
    case "jewel":
      return merge([part(new THREE.IcosahedronGeometry(0.09), C.star, [0, 0.09, 0], [0.3, 0.4, 0])]);
    case "sword":
      return merge([
        part(new THREE.BoxGeometry(0.07, 0.72, 0.016), [0.82, 0.84, 0.88], [0, 0.36, 0]),
        part(new THREE.BoxGeometry(0.28, 0.035, 0.05), metal, [0, 0.74, 0]),
        part(new THREE.CylinderGeometry(0.02, 0.02, 0.17, 4, 1, true), C.leather, [0, 0.84, 0]),
        part(new THREE.OctahedronGeometry(0.035), metal, [0, 0.94, 0]),
      ]);
    case "helmet":
      return merge([
        part(new THREE.SphereGeometry(0.17, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), metal, [0, 0.03, 0]),
        part(new THREE.BoxGeometry(0.03, 0.12, 0.03), metal, [0, 0.02, 0.17]),
        part(new THREE.ConeGeometry(0.03, 0.08, 5), C.red, [0, 0.22, 0]),
      ]);
    case "shield":
      return merge([
        part(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 8), metal, [0, 0.32, -0.005], [Math.PI / 2, 0, 0]),
        part(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 8, 1, true), C.darkwood, [0, 0.32, 0.01], [Math.PI / 2, 0, 0]),
        part(new THREE.CircleGeometry(0.27, 8), C.darkwood, [0, 0.32, 0.031]),
        part(new THREE.OctahedronGeometry(0.07), metal, [0, 0.32, 0.04], [0, 0, 0], [1, 1, 0.6]),
      ]);
    case "crown": {
      const parts = [part(new THREE.CylinderGeometry(0.15, 0.14, 0.09, 8), metal, [0, 0.045, 0])];
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        parts.push(part(new THREE.ConeGeometry(0.03, 0.1, 4), metal, [Math.cos(a) * 0.14, 0.14, Math.sin(a) * 0.14]));
        if (k % 2 === 0) parts.push(part(new THREE.OctahedronGeometry(0.025), k % 4 ? C.sapphire : C.ruby, [Math.cos(a) * 0.155, 0.05, Math.sin(a) * 0.155]));
      }
      return merge(parts);
    }
    case "jewelBox":
      return merge([
        part(new THREE.BoxGeometry(0.28, 0.14, 0.2), C.darkwood, [0, 0.07, 0]),
        part(new THREE.BoxGeometry(0.3, 0.04, 0.22), C.gold, [0, 0.16, 0]),
        part(new THREE.OctahedronGeometry(0.03), C.emerald, [0, 0.2, 0]),
      ]);
    case "chest":
      return merge([
        part(new THREE.BoxGeometry(0.62, 0.32, 0.42), C.wood, [0, 0.16, 0]),
        part(new THREE.CylinderGeometry(0.21, 0.21, 0.62, 5, 1, false, -Math.PI / 2, Math.PI), C.wood, [0, 0.32, 0], [0, 0, Math.PI / 2]),
        part(new THREE.BoxGeometry(0.05, 0.54, 0.44), C.gold, [-0.2, 0.26, 0]),
        part(new THREE.BoxGeometry(0.05, 0.54, 0.44), C.gold, [0.2, 0.26, 0]),
        part(new THREE.BoxGeometry(0.08, 0.1, 0.03), C.gold, [0, 0.3, 0.215]),
      ]);
    case "statuette":
      return merge([
        part(new THREE.BoxGeometry(0.26, 0.08, 0.26), metal, [0, 0.04, 0]),
        part(new THREE.CylinderGeometry(0.07, 0.11, 0.3, 7), metal, [0, 0.23, 0]),
        part(new THREE.SphereGeometry(0.07, 7, 5), metal, [0, 0.45, 0]),
        part(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), metal, [0.1, 0.4, 0], [0, 0, -0.5]),
        part(new THREE.ConeGeometry(0.05, 0.08, 5), metal, [0, 0.53, 0]),
      ]);
    case "tome":
      return merge([
        part(new THREE.BoxGeometry(0.36, 0.09, 0.46), C.tome, [0, 0.045, 0]),
        part(new THREE.BoxGeometry(0.33, 0.07, 0.43), C.ivory, [0.02, 0.045, 0]),
        part(new THREE.BoxGeometry(0.06, 0.1, 0.06), C.gold, [0.16, 0.045, 0.21]),
        part(new THREE.BoxGeometry(0.06, 0.1, 0.06), C.gold, [0.16, 0.045, -0.21]),
        part(new THREE.OctahedronGeometry(0.04), C.sapphire, [0, 0.1, 0]),
      ]);
    case "pack":
      return merge([
        part(new THREE.SphereGeometry(0.26, 8, 6), C.leather, [0, 0.2, 0], [0, 0, 0], [1, 0.8, 0.8]),
        part(new THREE.TorusGeometry(0.1, 0.02, 4, 8), C.darkwood, [0, 0.42, 0]),
      ]);
  }
  return merge([part(new THREE.BoxGeometry(0.2, 0.2, 0.2), C.gold, [0, 0.1, 0])]);
}

// ---------- materials ----------
export function makeMaterials() {
  return {
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.75, roughness: 0.32 }),
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.15, roughness: 0.7 }),
    gem: new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, metalness: 0.2, roughness: 0.08,
      emissive: 0x221018, envMapIntensity: 2.2,
    }),
    tome: new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, metalness: 0.2, roughness: 0.6,
      emissive: 0x0a1a55, emissiveIntensity: 0.9,
    }),
  };
}

// ---------- shared item rules ----------
// Roll the details of one ordinary treasure item. depth = metres below
// the original top of the pile; deeper treasure is worth more.
export function rollTreasure(type, rng, depth) {
  const d = CATALOG[type];
  const it = { type, yaw: rng() * Math.PI * 2, tilt: 0 };
  const depthMult = 1 + depth * 0.14;
  if (type === "coins") {
    it.coins = Math.round(range(rng, ...d.stack) * depthMult);
  } else if (d.metal) {
    const m = weightedPick(rng, METALS);
    it.variant = m.id;
    it.value = Math.round(range(rng, ...d.base) * m.mult * depthMult);
  } else if (d.gem) {
    const g = GEMS[Math.floor(rng() * GEMS.length)];
    it.variant = g.id;
    it.glass = rng() < 0.4;
    it.value = it.glass ? Math.round(range(rng, 2, 6)) : Math.round(range(rng, ...d.base) * depthMult);
  } else {
    it.value = Math.round(range(rng, ...d.base) * depthMult);
  }
  if (type === "sword") it.tilt = rng() < 0.25 ? 0.3 + rng() * 0.6 : 1.25 + rng() * 0.3;
  else if (type === "shield") it.tilt = 0.5 + rng() * 1.0;
  else it.tilt = (rng() - 0.5) * 0.6;
  return it;
}

// Human-readable name. Without appraisal, gems only show their colour.
export function displayName(it, appraisal) {
  const d = CATALOG[it.type];
  if (it.type === "coins") return `${d.label} (${it.coins} coins)`;
  if (d.metal) return `${METALS.find((m) => m.id === it.variant).label} ${d.label}`;
  if (d.gem) {
    const g = GEMS.find((g) => g.id === it.variant);
    if (!appraisal) return g.look;
    return it.glass ? `Glass Bead (${g.look.split(" ")[0].toLowerCase()})` : g.label;
  }
  return d.label;
}

export function itemSpace(it) {
  if (it.type === "coins") return it.coins * COINS.spacePer;
  return it.space ?? CATALOG[it.type].space ?? 0;
}

export function itemWeight(it) {
  if (it.type === "coins") return it.coins * COINS.weightPer;
  return it.weight ?? CATALOG[it.type].weight ?? 0;
}

export function itemValue(it) {
  return it.type === "coins" ? it.coins : it.value || 0;
}

// ---------- special one-off objects ----------
// Authored objects placed by hand: individual meshes that sink into or
// fall with the pile. Few enough that separate meshes are fine.
export class Specials {
  constructor(scene, hoard, mats) {
    this.scene = scene;
    this.hoard = hoard;
    this.mats = mats;
    this.geoCache = new Map();
    this.list = [];
  }

  geometry(type) {
    if (!this.geoCache.has(type)) this.geoCache.set(type, buildGeometry(type));
    return this.geoCache.get(type);
  }

  // The one hidden special item for Prototype 0.1: its blue corner pokes
  // out of a side slope near the entrance.
  generate() {
    const tx = 8.5, tz = 16;
    const th = this.hoard.originalHeightAt(tx, tz);
    this.add({ type: "tome", x: tx, y: th - 0.15, z: tz, yaw: 0.6, tilt: 0.75, value: 0 });
  }

  add(data) {
    const d = CATALOG[data.type];
    const mesh = new THREE.Mesh(this.geometry(data.type), data.type === "tome" ? this.mats.tome : this.mats.matte);
    mesh.rotation.set(data.tilt || 0, data.yaw || 0, 0, "YXZ");
    mesh.position.set(data.x, data.y, data.z);
    mesh.visible = false;
    this.scene.add(mesh);
    const it = { vy: 0, buried: 1, special: true, ...data, def: d, mesh };
    this.list.push(it);
    return it;
  }

  remove(it) {
    this.scene.remove(it.mesh);
    const k = this.list.indexOf(it);
    if (k >= 0) this.list.splice(k, 1);
  }

  // Fall when the pile under them is removed; show once exposed enough.
  update(dt) {
    for (const it of this.list) {
      const surf = Math.max(0, this.hoard.heightAt(it.x, it.z));
      if (it.y > surf + 0.005) {
        it.vy -= 14 * dt;
        it.y = Math.max(surf, it.y + it.vy * dt);
        if (it.y === surf) it.vy = 0;
        it.mesh.position.y = it.y;
      }
      it.buried = Math.min(1, Math.max(0, (surf - it.y) / it.def.h));
      it.mesh.visible = it.buried < 0.92;
    }
  }

  serialize() {
    return this.list.map((it) => ({
      t: it.type, x: +it.x.toFixed(3), y: +it.y.toFixed(3), z: +it.z.toFixed(3),
      yw: +(it.yaw || 0).toFixed(2), tl: +(it.tilt || 0).toFixed(2),
      val: it.value || 0, sp: it.space || 0, wt: it.weight || 0,
    }));
  }

  load(arr) {
    for (const it of [...this.list]) this.remove(it);
    for (const o of arr) {
      if (!CATALOG[o.t]) continue;
      this.add({ type: o.t, x: o.x, y: o.y, z: o.z, yaw: o.yw, tilt: o.tl, value: o.val, space: o.sp, weight: o.wt });
    }
  }
}
