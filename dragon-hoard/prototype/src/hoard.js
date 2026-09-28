// =============================================================
//  Hoard Layers 1 & 2 (design doc sections 104, 105, 108)
//  - Layer 1: a heightfield mound mesh that holds most of the mass.
//  - Layer 2: thousands of instanced coins riding on its surface.
//  Excavation lowers the heightfield; the saved state is just the
//  heights, never individual coins.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD } from "./config.js";
import { mulberry32, fbm2 } from "./rng.js";

const GOLD = [0.97, 0.71, 0.25];
const OLD = [0.6, 0.36, 0.15];
const SILVER = [0.78, 0.8, 0.86];

export class Hoard {
  constructor(scene) {
    this.cell = WORLD.cell;
    this.n = Math.round(WORLD.gridSize / this.cell) + 1;
    this.half = WORLD.gridSize / 2;
    const count = this.n * this.n;
    this.h = new Float32Array(count);
    this.h0 = new Float32Array(count);
    this.tint = new Float32Array(count); // per-vertex brightness jitter
    this.fleck = new Uint8Array(count); // 1 = silver-tinted vertex
    this.generate();
    this.buildMesh(scene);
    this.buildCoins(scene);
    this.total0 = this.sum(this.h0);
  }

  // ---------- generation ----------
  generate() {
    const rng = mulberry32(WORLD.seed);
    const seed = WORLD.seed;
    const bump = (x, z, cx, cz, r, hgt) => {
      const d = Math.hypot(x - cx, z - cz);
      return d < r ? hgt * 0.5 * (Math.cos((Math.PI * d) / r) + 1) : 0;
    };
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        const x = -this.half + i * this.cell;
        const z = -this.half + j * this.cell;
        const r = Math.hypot(x, z);
        let h = 0.55;
        h += bump(x, z, 0, -4, 17, 9.5); // the great mound
        h += bump(x, z, -14, 6, 9, 4.5);
        h += bump(x, z, 13, -12, 9.5, 5);
        h += bump(x, z, 11, 10, 7, 3);
        h += bump(x, z, -9, -17, 7, 3.2);
        h += (fbm2(x * 0.18, z * 0.18, seed) - 0.5) * 1.3;
        // fade out at the walls
        const edge = Math.min(1, Math.max(0, (WORLD.hoardRadius - r) / 3));
        h *= edge;
        // keep a thinly-covered walkway at the entrance
        const de = Math.hypot(x - WORLD.entrance.x, z - WORLD.entrance.z);
        h *= Math.min(1, Math.max(0, (de - 3) / 5));
        h = Math.max(0, h);
        const k = j * this.n + i;
        this.h[k] = this.h0[k] = h;
        this.tint[k] = 0.72 + rng() * 0.42;
        const f = rng();
        this.fleck[k] = f < 0.03 ? 1 : 0;
      }
    }
  }

  // ---------- queries ----------
  idx(i, j) {
    return j * this.n + i;
  }

  heightAt(x, z) {
    const fx = (x + this.half) / this.cell;
    const fz = (z + this.half) / this.cell;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= this.n - 1 || j >= this.n - 1) return 0;
    const tx = fx - i, tz = fz - j;
    const h = this.h, n = this.n;
    const a = h[j * n + i], b = h[j * n + i + 1];
    const c = h[(j + 1) * n + i], d = h[(j + 1) * n + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  originalHeightAt(x, z) {
    const i = Math.round((x + this.half) / this.cell);
    const j = Math.round((z + this.half) / this.cell);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return 0;
    return this.h0[j * this.n + i];
  }

  sum(arr) {
    let s = 0;
    for (let k = 0; k < arr.length; k++) s += arr[k];
    return s;
  }

  remainingFraction() {
    return this.sum(this.h) / this.total0;
  }

  // March a ray against the treasure surface. Returns the first point
  // where the ray dips under the pile, or null.
  raycast(origin, dir, maxDist) {
    const step = 0.06;
    for (let t = 0.2; t <= maxDist; t += step) {
      const x = origin.x + dir.x * t;
      const y = origin.y + dir.y * t;
      const z = origin.z + dir.z * t;
      const h = this.heightAt(x, z);
      if (y <= h && h > 0.04) return { x, y: h, z, t };
      if (y < 0) return null;
    }
    return null;
  }

  // ---------- excavation ----------
  // Lowers the pile around (x,z). Returns cubic metres removed.
  dig(x, z, depth, radius) {
    const c = this.cell;
    const i0 = Math.max(1, Math.floor((x - radius + this.half) / c));
    const i1 = Math.min(this.n - 2, Math.ceil((x + radius + this.half) / c));
    const j0 = Math.max(1, Math.floor((z - radius + this.half) / c));
    const j1 = Math.min(this.n - 2, Math.ceil((z + radius + this.half) / c));
    let vol = 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const px = -this.half + i * c, pz = -this.half + j * c;
        const d = Math.hypot(px - x, pz - z) / radius;
        if (d >= 1) continue;
        const w = (1 - d * d) * (1 - d * d);
        const k = j * this.n + i;
        const dh = Math.min(this.h[k], depth * w);
        this.h[k] -= dh;
        vol += dh * c * c;
      }
    }
    this.relax(x, z, radius + 2.5);
    this.markDirty(x, z, radius + 3);
    return vol;
  }

  // Treasure slides downhill when a slope gets steeper than the angle
  // of repose. Mass is conserved, so digging into the side of a big
  // mound pulls more treasure down on top of you.
  relax(x, z, radius, passes = 4) {
    const c = this.cell;
    const n = this.n;
    const limit = WORLD.reposeSlope * c;
    const i0 = Math.max(1, Math.floor((x - radius + this.half) / c));
    const i1 = Math.min(n - 2, Math.ceil((x + radius + this.half) / c));
    const j0 = Math.max(1, Math.floor((z - radius + this.half) / c));
    const j1 = Math.min(n - 2, Math.ceil((z + radius + this.half) / c));
    const h = this.h;
    let moved = 0;
    for (let p = 0; p < passes; p++) {
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const a = j * n + i;
          const nb = [a + 1, a - 1, a + n, a - n];
          for (const b of nb) {
            const diff = h[a] - h[b];
            if (diff > limit) {
              const m = (diff - limit) * 0.25;
              h[a] -= m;
              h[b] += m;
              moved += m;
            }
          }
        }
      }
    }
    return moved;
  }

  // ---------- mesh ----------
  buildMesh(scene) {
    const size = WORLD.gridSize;
    const seg = this.n - 1;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2); // vertex (i,j) -> x=-half+i*cell, z=-half+j*cell
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.n * this.n * 3), 3));
    this.geo = geo;
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      metalness: 0.45,
      roughness: 0.5,
      envMapIntensity: 0.7,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = false;
    scene.add(this.mesh);
    this.writeRegion(0, 0, this.n - 1, this.n - 1);
  }

  markDirty(x, z, radius) {
    const c = this.cell;
    const i0 = Math.max(0, Math.floor((x - radius + this.half) / c));
    const i1 = Math.min(this.n - 1, Math.ceil((x + radius + this.half) / c));
    const j0 = Math.max(0, Math.floor((z - radius + this.half) / c));
    const j1 = Math.min(this.n - 1, Math.ceil((z + radius + this.half) / c));
    this.writeRegion(i0, j0, i1, j1);
    this.updateCoins(x - radius, z - radius, x + radius, z + radius);
  }

  writeRegion(i0, j0, i1, j1) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * this.n + i;
        const h = this.h[k];
        pos[k * 3 + 1] = h > 0.03 ? h - 0.03 : -0.3;
        const dug = Math.min(1, Math.max(0, (this.h0[k] - h) / 5)) * 0.85;
        let r = GOLD[0] + (OLD[0] - GOLD[0]) * dug;
        let g = GOLD[1] + (OLD[1] - GOLD[1]) * dug;
        let b = GOLD[2] + (OLD[2] - GOLD[2]) * dug;
        if (this.fleck[k] === 1) {
          // a hint of silver mixed through the gold
          r = (r + SILVER[0]) / 2;
          g = (g + SILVER[1]) / 2;
          b = (b + SILVER[2]) / 2;
        }
        const t = this.tint[k];
        col[k * 3] = r * t;
        col[k * 3 + 1] = g * t;
        col[k * 3 + 2] = b * t;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  // ---------- surface coins (instanced, visual only) ----------
  buildCoins(scene) {
    const rng = mulberry32(WORLD.seed + 7);
    const count = WORLD.surfaceCoins;
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf6c14a,
      metalness: 0.85,
      roughness: 0.3,
      flatShading: true,
    });
    this.coins = new THREE.InstancedMesh(geo, mat, count);
    this.coinData = [];
    this.bucketSize = 4;
    this.buckets = new Map();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 20) {
      const x = (rng() * 2 - 1) * WORLD.hoardRadius;
      const z = (rng() * 2 - 1) * WORLD.hoardRadius;
      if (this.originalHeightAt(x, z) < 0.12) continue;
      e.set((rng() - 0.5) * 1.2, rng() * Math.PI * 2, (rng() - 0.5) * 1.2);
      q.setFromEuler(e);
      const s = 0.8 + rng() * 0.5;
      this.coinData.push({ x, z, q: q.clone(), s });
      const key = this.bucketKey(x, z);
      if (!this.buckets.has(key)) this.buckets.set(key, []);
      this.buckets.get(key).push(placed);
      placed++;
    }
    this.coins.count = placed;
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    for (let k = 0; k < placed; k++) this.writeCoin(k);
    this.coins.instanceMatrix.needsUpdate = true;
    scene.add(this.coins);
  }

  bucketKey(x, z) {
    return `${Math.floor(x / this.bucketSize)},${Math.floor(z / this.bucketSize)}`;
  }

  writeCoin(k) {
    const c = this.coinData[k];
    const h = this.heightAt(c.x, c.z);
    if (h < 0.05) {
      this._s.set(0, 0, 0);
    } else {
      this._s.set(c.s, c.s, c.s);
    }
    this._p.set(c.x, h + 0.004, c.z);
    this._m.compose(this._p, c.q, this._s);
    this.coins.setMatrixAt(k, this._m);
  }

  updateCoins(x0, z0, x1, z1) {
    const b = this.bucketSize;
    for (let bx = Math.floor(x0 / b); bx <= Math.floor(x1 / b); bx++) {
      for (let bz = Math.floor(z0 / b); bz <= Math.floor(z1 / b); bz++) {
        const list = this.buckets.get(`${bx},${bz}`);
        if (!list) continue;
        for (const k of list) this.writeCoin(k);
      }
    }
    this.coins.instanceMatrix.needsUpdate = true;
  }

  // ---------- save / load ----------
  serialize() {
    const q = new Uint16Array(this.h.length);
    for (let k = 0; k < this.h.length; k++) q[k] = Math.min(65535, Math.round(this.h[k] * 1000));
    const bytes = new Uint8Array(q.buffer);
    let s = "";
    for (let k = 0; k < bytes.length; k += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
    }
    return btoa(s);
  }

  deserialize(str) {
    const bin = atob(str);
    if (bin.length !== this.h.length * 2) return false;
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    const q = new Uint16Array(bytes.buffer);
    for (let k = 0; k < this.h.length; k++) this.h[k] = q[k] / 1000;
    this.writeRegion(0, 0, this.n - 1, this.n - 1);
    for (let k = 0; k < this.coinData.length; k++) this.writeCoin(k);
    this.coins.instanceMatrix.needsUpdate = true;
    return true;
  }
}
