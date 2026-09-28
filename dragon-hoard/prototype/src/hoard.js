// =============================================================
//  The hoard's shape. The pile is a grid of 0.5 m columns; each
//  column is a stack of item layers (see TREASURE in config.js).
//  This module only tracks how many layers each column has left and
//  draws a dark "shadow" surface that shows in the gaps between the
//  items. Every visible piece of treasure is an item (treasure.js).
//  The save holds these small arrays, never individual items.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD, TREASURE } from "./config.js";
import { mulberry32, fbm2 } from "./rng.js";

export class Hoard {
  constructor(scene) {
    this.cell = WORLD.cell;
    this.n = Math.round(WORLD.gridSize / this.cell) + 1;
    this.half = WORLD.gridSize / 2;
    this.T = TREASURE.layer;
    const count = this.n * this.n;
    this.L0 = new Uint16Array(count); // original layers per column
    this.L = new Uint16Array(count); // layers left
    this.gen = new Uint16Array(count); // changes each time a new top layer appears
    this.mask = new Uint8Array(count); // which items of the top layer are gone
    this.h = new Float32Array(count); // derived: surface height in metres
    this.tint = new Float32Array(count);
    this.generate();
    this.total0 = this.sum(this.L0);
    this.buildMesh(scene);
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
        h *= Math.min(1, Math.max(0, (WORLD.hoardRadius - r) / 3)); // fade at the walls
        const de = Math.hypot(x - WORLD.entrance.x, z - WORLD.entrance.z);
        h *= Math.min(1, Math.max(0, (de - 3) / 5)); // thin walkway at the entrance
        const k = j * this.n + i;
        const edge = i === 0 || j === 0 || i === this.n - 1 || j === this.n - 1;
        const layers = edge ? 0 : Math.max(0, Math.round(h / this.T));
        this.L0[k] = this.L[k] = layers;
        this.h[k] = layers * this.T;
        this.tint[k] = 0.7 + rng() * 0.5;
      }
    }
  }

  // ---------- queries ----------
  cellOf(x, z) {
    const i = Math.round((x + this.half) / this.cell);
    const j = Math.round((z + this.half) / this.cell);
    if (i < 1 || j < 1 || i >= this.n - 1 || j >= this.n - 1) return -1;
    return j * this.n + i;
  }

  cellX(c) {
    return -this.half + (c % this.n) * this.cell;
  }

  cellZ(c) {
    return -this.half + Math.floor(c / this.n) * this.cell;
  }

  neighbours(c) {
    return [c + 1, c - 1, c + this.n, c - this.n];
  }

  inHoard(c) {
    return Math.hypot(this.cellX(c), this.cellZ(c)) < WORLD.hoardRadius;
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
    const c = this.cellOf(x, z);
    return c < 0 ? 0 : this.L0[c] * this.T;
  }

  sum(arr) {
    let s = 0;
    for (let k = 0; k < arr.length; k++) s += arr[k];
    return s;
  }

  remainingFraction() {
    return this.sum(this.L) / this.total0;
  }

  // First point where a ray dips under the pile surface, or null.
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

  // Give a column a new layer count and a fresh top layer.
  setLayers(c, L) {
    this.L[c] = L;
    this.gen[c] = (this.gen[c] + 1) & 0xffff;
    this.mask[c] = 0;
    this.h[c] = L * this.T;
  }

  // ---------- shadow surface ----------
  // A dark surface just under the item tops. It only shows as the gaps
  // and shadows between items, never as a hill of its own.
  buildMesh(scene) {
    const size = WORLD.gridSize;
    const seg = this.n - 1;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2); // vertex (i,j) -> x=-half+i*cell, z=-half+j*cell
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(this.n * this.n * 3), 3));
    this.geo = geo;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.9 });
    this.mesh = new THREE.Mesh(geo, mat);
    scene.add(this.mesh);
    this.writeRegion(0, 0, this.n - 1, this.n - 1);
  }

  markDirty(c, radius = 1) {
    const i = c % this.n, j = Math.floor(c / this.n);
    this.writeRegion(
      Math.max(0, i - radius), Math.max(0, j - radius),
      Math.min(this.n - 1, i + radius), Math.min(this.n - 1, j + radius)
    );
  }

  writeRegion(i0, j0, i1, j1) {
    const pos = this.geo.attributes.position.array;
    const col = this.geo.attributes.color.array;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * this.n + i;
        // when the top layer is partly taken, the gaps show the layer below
        const visible = this.mask[k] ? this.L[k] - 1 : this.L[k];
        pos[k * 3 + 1] = visible > 0 ? visible * this.T - 0.1 : -0.3;
        const t = this.tint[k];
        col[k * 3] = 0.2 * t;
        col[k * 3 + 1] = 0.12 * t;
        col[k * 3 + 2] = 0.045 * t;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  // ---------- save / load ----------
  serialize() {
    return { L: b64(this.L), gen: b64(this.gen), mask: b64(this.mask) };
  }

  deserialize(o) {
    if (!o || !o.L) return false;
    const L = unb64(o.L, Uint16Array), gen = unb64(o.gen, Uint16Array), mask = unb64(o.mask, Uint8Array);
    if (L.length !== this.L.length || gen.length !== this.L.length || mask.length !== this.L.length) return false;
    this.L.set(L);
    this.gen.set(gen);
    this.mask.set(mask);
    for (let k = 0; k < this.L.length; k++) this.h[k] = this.L[k] * this.T;
    this.writeRegion(0, 0, this.n - 1, this.n - 1);
    return true;
  }
}

function b64(typed) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let s = "";
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
  return btoa(s);
}

function unb64(str, Type) {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new Type(bytes.buffer);
}
