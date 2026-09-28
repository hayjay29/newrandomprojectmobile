// =============================================================
//  The hoard as nothing but items.
//  Every column of the grid (hoard.js) is a stack of layers, and each
//  layer holds 2-4 real items. Only the top layer of each column exists
//  as objects (~28k, drawn with GPU instancing). Taking or tossing
//  items clears the top layer and the next one appears. Items rolled
//  for a layer come from a seed per (column, generation), so the save
//  only needs the layer counts, never the items themselves.
//  Tossed items become "loose" items that are stored individually.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD, TREASURE } from "./config.js";
import { CATALOG, buildGeometry, rollTreasure } from "./items.js";
import { mulberry32, weightedPick } from "./rng.js";

const SPAWNABLE = Object.entries(CATALOG).filter(([, d]) => d.spawn);

function seedFor(c, gen) {
  let h = Math.imul(c + 1, 2654435761) ^ Math.imul(gen + 7, 1597334677) ^ WORLD.seed;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}

const popcount = (m) => {
  let n = 0;
  while (m) { n += m & 1; m >>= 1; }
  return n;
};

export class Treasure {
  constructor(scene, hoard, mats) {
    this.scene = scene;
    this.hoard = hoard;
    this.mats = mats;
    this.pools = new Map();
    this.dirtyPools = new Set();
    this.geo = new Map();
    this.cells = new Array(hoard.n * hoard.n).fill(null); // items drawn for each column
    this.loose = new Set();
    this.looseByCell = new Map();
    this.flights = [];
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, "YXZ");
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._zero = new THREE.Vector3(0, 0, 0);
    this._v = new THREE.Vector3();
  }

  // ---------- geometry & instancing ----------
  keyOf(it) {
    return `${it.type}:${it.variant || ""}`;
  }

  shape(key) {
    if (!this.geo.has(key)) {
      const [type, variant] = key.split(":");
      const g = buildGeometry(type, variant || undefined);
      g.computeBoundingSphere();
      this.geo.set(key, g);
    }
    return this.geo.get(key);
  }

  pool(key, want = 64) {
    let p = this.pools.get(key);
    if (!p) {
      const type = key.split(":")[0];
      const d = CATALOG[type];
      const mat = this.mats[d.mat || (d.metal ? "metal" : "matte")];
      p = { key, mat, mesh: null, cap: 0, free: [] };
      this.pools.set(key, p);
      this.grow(p, want);
    }
    if (!p.free.length) this.grow(p, p.cap * 2);
    return p;
  }

  grow(p, cap) {
    const mesh = new THREE.InstancedMesh(this.shape(p.key), p.mat, cap);
    mesh.frustumCulled = false;
    this._m.compose(this._p.set(0, -50, 0), this._q.identity(), this._zero);
    for (let k = 0; k < cap; k++) {
      if (p.mesh && k < p.cap) continue;
      mesh.setMatrixAt(k, this._m);
    }
    if (p.mesh) {
      mesh.instanceMatrix.array.set(p.mesh.instanceMatrix.array);
      this.scene.remove(p.mesh);
      p.mesh.dispose();
    }
    for (let k = cap - 1; k >= p.cap; k--) p.free.push(k);
    p.cap = cap;
    p.mesh = mesh;
    this.scene.add(mesh);
    this.dirtyPools.add(p);
  }

  show(it) {
    const p = this.pool(it.key);
    it.slot = p.free.pop();
    it.pool = p;
    this.write(it);
  }

  hide(it) {
    if (!it.pool) return;
    this._m.compose(this._p.set(0, -50, 0), this._q.identity(), this._zero);
    it.pool.mesh.setMatrixAt(it.slot, this._m);
    it.pool.free.push(it.slot);
    this.dirtyPools.add(it.pool);
    it.pool = null;
  }

  write(it) {
    this._e.set(it.tilt || 0, it.yaw || 0, 0, "YXZ");
    this._q.setFromEuler(this._e);
    this._m.compose(this._p.set(it.x, it.y, it.z), this._q, this._s);
    it.pool.mesh.setMatrixAt(it.slot, this._m);
    this.dirtyPools.add(it.pool);
  }

  flush() {
    for (const p of this.dirtyPools) p.mesh.instanceMatrix.needsUpdate = true;
    this.dirtyPools.clear();
  }

  // Precompute the picking sphere (centre offset + radius) for an item.
  prepare(it) {
    it.def = CATALOG[it.type];
    it.key = this.keyOf(it);
    const bs = this.shape(it.key).boundingSphere;
    this._e.set(it.tilt || 0, it.yaw || 0, 0, "YXZ");
    this._v.copy(bs.center).applyEuler(this._e);
    it.ox = this._v.x;
    it.oy = this._v.y;
    it.oz = this._v.z;
    it.r = Math.max(0.12, bs.radius * 0.8);
    // how tall the item actually stands once tilted
    it.eh = Math.max(0.04, it.def.h * Math.abs(Math.cos(it.tilt || 0)));
    return it;
  }

  // ---------- layers ----------
  // Items in one layer of column c. gen seeds the roll; L sets depth.
  rollLayer(c, L, gen, role) {
    if (L <= 0) return [];
    const hoard = this.hoard;
    const rng = mulberry32(seedFor(c, gen));
    const [lo, hi] = TREASURE.itemsPerLayer;
    const count = lo + Math.floor(rng() * (hi - lo + 1));
    const depth = (hoard.L0[c] - L) * hoard.T;
    const top = L * hoard.T;
    const cx = hoard.cellX(c), cz = hoard.cellZ(c);
    const allowed = SPAWNABLE
      .filter(([, d]) => (d.minDepth || 0) <= depth)
      .map(([key, d]) => ({ key, w: d.spawn * (key === "coins" ? 1 : 1 + depth * 0.05) }));
    const out = [];
    for (let k = 0; k < count; k++) {
      const { key } = weightedPick(rng, allowed);
      const it = rollTreasure(key, rng, depth);
      it.x = cx + (rng() - 0.5) * 0.55;
      it.z = cz + (rng() - 0.5) * 0.55;
      it.c = c;
      it.k = k;
      it.role = role;
      this.prepare(it);
      it.y = top - it.eh * 0.45 - rng() * 0.03;
      out.push(it);
    }
    return out;
  }

  renderCell(c) {
    const old = this.cells[c];
    if (old) for (const it of old) { this.hide(it); it.dead = true; }
    const hoard = this.hoard;
    const L = hoard.L[c];
    if (L <= 0) {
      this.cells[c] = null;
      return;
    }
    const mask = hoard.mask[c];
    const top = this.rollLayer(c, L, hoard.gen[c], "top");
    const list = top.filter((it) => !(mask & (1 << it.k)));
    // With the top layer partly taken, the layer below shows through.
    if (mask) list.push(...this.rollLayer(c, L - 1, (hoard.gen[c] + 1) & 0xffff, "under"));
    for (const it of list) this.show(it);
    this.cells[c] = list;
    this.cells[c].topCount = top.length;
  }

  buildAll() {
    const n = this.hoard.n;
    for (let c = 0; c < n * n; c++) if (this.hoard.L[c] > 0) this.renderCell(c);
    this.flush();
  }

  instanceCount() {
    let used = 0;
    for (const p of this.pools.values()) used += p.cap - p.free.length;
    return used;
  }

  // ---------- removing items ----------
  // Removes an item from the hoard. Returns column slides for effects.
  remove(it) {
    if (it.dead) return [];
    it.dead = true;
    this.hide(it);
    if (it.role === "loose") {
      this.loose.delete(it);
      const list = this.looseByCell.get(it.cell);
      if (list) list.splice(list.indexOf(it), 1);
      return [];
    }
    const hoard = this.hoard;
    const c = it.c;
    if (it.role === "under") return this.removeUnder(it);
    const wasMask = hoard.mask[c];
    hoard.mask[c] |= 1 << it.k;
    const list = this.cells[c];
    list.splice(list.indexOf(it), 1);
    const left = list.topCount - popcount(hoard.mask[c]);
    if (left <= 0) {
      // top layer cleared: the column drops and the layer below takes over
      hoard.setLayers(c, hoard.L[c] - 1);
      const slides = this.relax([c]);
      this.flush();
      return slides;
    }
    if (!wasMask) {
      for (const u of this.rollLayer(c, hoard.L[c] - 1, (hoard.gen[c] + 1) & 0xffff, "under")) {
        this.show(u);
        list.push(u);
      }
    }
    hoard.markDirty(c, 0);
    this.flush();
    return [];
  }

  // Pulling something out from under the top layer: whatever was still
  // on top settles down as loose treasure, and the layer below becomes
  // the new top (minus the item just taken).
  removeUnder(it) {
    const hoard = this.hoard;
    const c = it.c;
    const list = this.cells[c];
    for (const t of list) {
      if (t.role === "top" && !t.dead) this.addLoose(this.data(t));
    }
    hoard.setLayers(c, hoard.L[c] - 1); // top is now the old "under" layer
    hoard.mask[c] = 1 << it.k;
    this.renderCell(c);
    let start = [c];
    if (this.cells[c] && this.cells[c].topCount <= 1) hoard.setLayers(c, hoard.L[c] - 1);
    const slides = this.relax(start);
    this.flush();
    return slides;
  }

  // The parts of an item needed to recreate it somewhere else.
  data(it) {
    return {
      type: it.type, variant: it.variant, value: it.value, coins: it.coins, glass: it.glass,
      yaw: it.yaw, tilt: it.tilt, x: it.x, y: it.y, z: it.z,
    };
  }

  // Treasure slides into holes: when a column stands more than maxStep
  // layers above a neighbour, its top layer spills onto that neighbour.
  relax(start) {
    const hoard = this.hoard;
    const queue = [...start];
    const dirty = new Set(start);
    const slides = [];
    let guard = 0;
    while (queue.length && guard++ < 4000) {
      const a = queue.pop();
      for (const b of hoard.neighbours(a)) {
        const diff = hoard.L[a] - hoard.L[b];
        let from = -1, to = -1;
        if (diff > TREASURE.maxStep && hoard.inHoard(b)) { from = a; to = b; }
        else if (-diff > TREASURE.maxStep && hoard.inHoard(a)) { from = b; to = a; }
        if (from < 0) continue;
        hoard.setLayers(from, hoard.L[from] - 1);
        hoard.setLayers(to, hoard.L[to] + 1);
        slides.push([from, to]);
        for (const c of [from, to]) {
          if (!dirty.has(c)) dirty.add(c);
          queue.push(c);
        }
      }
    }
    for (const c of dirty) {
      this.renderCell(c);
      hoard.markDirty(c, 1);
    }
    return slides;
  }

  // ---------- picking ----------
  // Nearest item hit by a ray, or null. Walks the columns along the ray.
  pick(o, d, maxDist, skip) {
    const hoard = this.hoard;
    const seen = new Set();
    let best = null, bestT = Infinity;
    const test = (it) => {
      if (it.dead || it.flying || it === skip) return;
      const cx = it.x + it.ox - o.x, cy = it.y + it.oy - o.y, cz = it.z + it.oz - o.z;
      const tca = cx * d.x + cy * d.y + cz * d.z;
      if (tca < 0) return;
      const d2 = cx * cx + cy * cy + cz * cz - tca * tca;
      if (d2 > it.r * it.r) return;
      const t = tca - Math.sqrt(it.r * it.r - d2);
      if (t < bestT && t <= maxDist) { bestT = t; best = it; }
    };
    for (let t = 0; t <= maxDist + 0.5; t += 0.25) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      const ci = Math.round((x + hoard.half) / hoard.cell);
      const cj = Math.round((z + hoard.half) / hoard.cell);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= hoard.n || j >= hoard.n) continue;
          const c = j * hoard.n + i;
          if (seen.has(c)) continue;
          seen.add(c);
          const list = this.cells[c];
          if (list) for (const it of list) test(it);
          const ll = this.looseByCell.get(c);
          if (ll) for (const it of ll) test(it);
        }
      }
      if (best && t > bestT + 0.5) break;
      if (y < hoard.heightAt(x, z) - 0.7) break; // deep inside the pile
    }
    if (best) return { it: best, t: bestT, exact: true };
    // The crosshair is on the pile but between item shapes: take the item
    // closest to that spot, so aiming at treasure always finds treasure.
    const hit = hoard.raycast(o, d, maxDist);
    if (!hit) return null;
    let near = null, nearD = 0.5;
    for (const it of this.near(hit.x, hit.z, 0.5, 12, skip)) {
      const dd = Math.hypot(it.x + it.ox - hit.x, it.y + it.oy - hit.y, it.z + it.oz - hit.z);
      if (dd < nearD) { nearD = dd; near = it; }
    }
    return near ? { it: near, t: hit.t, exact: false } : null;
  }

  // Pickable items near a point (for bigger shovels).
  near(x, z, radius, max, except) {
    const hoard = this.hoard;
    const out = [];
    const r = Math.ceil(radius / hoard.cell);
    const ci = Math.round((x + hoard.half) / hoard.cell);
    const cj = Math.round((z + hoard.half) / hoard.cell);
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= hoard.n || j >= hoard.n) continue;
        const c = j * hoard.n + i;
        const lists = [this.cells[c], this.looseByCell.get(c)];
        for (const list of lists) {
          if (!list) continue;
          for (const it of list) {
            if (it === except || it.dead || it.flying) continue;
            const dd = Math.hypot(it.x - x, it.z - z);
            if (dd <= radius) out.push({ it, dd });
          }
        }
      }
    }
    out.sort((a, b) => a.dd - b.dd);
    return out.slice(0, max).map((o) => o.it);
  }

  // ---------- loose items & flights ----------
  addLoose(data, show = true) {
    const it = this.prepare({ ...data, role: "loose" });
    it.cell = this.hoard.cellOf(it.x, it.z);
    if (show) this.show(it);
    this.loose.add(it);
    if (!this.looseByCell.has(it.cell)) this.looseByCell.set(it.cell, []);
    this.looseByCell.get(it.cell).push(it);
    it.vy = 0;
    return it;
  }

  // Launch an item through the air. to() gives the target each frame.
  fly(it, to, dur, arc, onDone) {
    const f = { it, sx: it.x, sy: it.y, sz: it.z, to, dur, arc, t: 0, onDone };
    it.flying = true;
    this.flights.push(f);
    return f;
  }

  update(dt) {
    // flights
    for (let n = this.flights.length - 1; n >= 0; n--) {
      const f = this.flights[n];
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      const e = k * k * (3 - 2 * k);
      const tgt = f.to();
      const it = f.it;
      it.x = f.sx + (tgt.x - f.sx) * e;
      it.y = f.sy + (tgt.y - f.sy) * e + Math.sin(k * Math.PI) * f.arc;
      it.z = f.sz + (tgt.z - f.sz) * e;
      it.yaw += dt * 9;
      if (it.pool) this.write(it);
      if (f.t >= 1) {
        this.flights.splice(n, 1);
        it.flying = false;
        f.onDone(it);
      }
    }
    // loose items settle onto the pile as it changes under them
    for (const it of this.loose) {
      if (it.flying) continue;
      const rest = Math.max(0, this.hoard.heightAt(it.x, it.z)) - it.eh * 0.3;
      if (it.y > rest + 0.005) {
        it.vy -= 14 * dt;
        it.y = Math.max(rest, it.y + it.vy * dt);
        if (it.y === rest) it.vy = 0;
        this.write(it);
      } else if (it.y < rest - 0.01) {
        it.y = rest; // treasure slid in underneath: ride on top of it
        it.vy = 0;
        this.write(it);
      }
    }
    this.flush();
  }

  // ---------- save / load ----------
  serialize() {
    const out = [];
    for (const it of this.loose) {
      if (it.flying) continue;
      const o = { t: it.type, x: +it.x.toFixed(2), y: +it.y.toFixed(3), z: +it.z.toFixed(2), yw: +it.yaw.toFixed(2), tl: +(it.tilt || 0).toFixed(2) };
      if (it.variant) o.v = it.variant;
      if (it.value) o.val = it.value;
      if (it.coins) o.c = it.coins;
      if (it.glass) o.g = 1;
      out.push(o);
    }
    return out;
  }

  load(arr) {
    for (const o of arr || []) {
      if (!CATALOG[o.t]) continue;
      this.addLoose({ type: o.t, x: o.x, y: o.y, z: o.z, yaw: o.yw, tilt: o.tl, variant: o.v, value: o.val || 0, coins: o.c, glass: !!o.g });
    }
    this.flush();
  }
}
