// =============================================================
//  Temporary physics (design doc 109): a small pool of coins that
//  tumble and bounce on the pile for a moment, then disappear.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";

export class CoinSpray {
  constructor(scene, hoard, max = 160) {
    this.hoard = hoard;
    this.max = max;
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf8c650, metalness: 0.85, roughness: 0.28, flatShading: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.p = [];
    for (let k = 0; k < max; k++) {
      this.p.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, rx: 0, rz: 0, sx: 0, sz: 0 });
    }
    this.cursor = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._zero = new THREE.Vector3(0, 0, 0);
    for (let k = 0; k < max; k++) this.hide(k);
    scene.add(this.mesh);
  }

  hide(k) {
    this._m.compose(this._v.set(0, -50, 0), this._q.identity(), this._zero);
    this.mesh.setMatrixAt(k, this._m);
  }

  emit(x, y, z, count, power = 1) {
    for (let n = 0; n < count; n++) {
      const c = this.p[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const s = (0.6 + Math.random() * 1.6) * power;
      c.alive = true;
      c.x = x + (Math.random() - 0.5) * 0.4;
      c.y = y + 0.1;
      c.z = z + (Math.random() - 0.5) * 0.4;
      c.vx = Math.cos(a) * s;
      c.vz = Math.sin(a) * s;
      c.vy = (1.8 + Math.random() * 2.6) * power;
      c.life = 1.6 + Math.random() * 1.2;
      c.rx = Math.random() * 6;
      c.rz = Math.random() * 6;
      c.sx = (Math.random() - 0.5) * 20;
      c.sz = (Math.random() - 0.5) * 20;
    }
  }

  // Coins slide off the pile around a point (dragon tremors, collapses).
  slide(x, z, radius, count) {
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const h = this.hoard.heightAt(px, pz);
      if (h < 0.3) continue;
      this.emit(px, h, pz, 1, 0.35);
    }
  }

  update(dt) {
    let any = false;
    for (let k = 0; k < this.max; k++) {
      const c = this.p[k];
      if (!c.alive) continue;
      any = true;
      c.life -= dt;
      c.vy -= 13 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.z += c.vz * dt;
      c.rx += c.sx * dt;
      c.rz += c.sz * dt;
      const g = Math.max(0, this.hoard.heightAt(c.x, c.z)) + 0.01;
      if (c.y < g) {
        c.y = g;
        c.vy *= -0.3;
        c.vx *= 0.6;
        c.vz *= 0.6;
        c.sx *= 0.6;
        c.sz *= 0.6;
      }
      if (c.life <= 0) {
        c.alive = false;
        this.hide(k);
        continue;
      }
      const s = Math.min(1, c.life * 2);
      this._e.set(c.rx, 0, c.rz);
      this._q.setFromEuler(this._e);
      this._m.compose(this._v.set(c.x, c.y, c.z), this._q, this._s.set(s, s, s));
      this.mesh.setMatrixAt(k, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
