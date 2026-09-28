// =============================================================
//  The chamber: stone shell, buried floor, ruins, light, and the
//  giant statue. Stylized and cheap: flat-shaded primitives only.
// =============================================================
import * as THREE from "../vendor/three.module.min.js";
import { WORLD } from "./config.js";
import { mulberry32, fbm2 } from "./rng.js";

const STONE = new THREE.Color(0x3a4252);

export function buildCave(scene, renderer, camera) {
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x0a0c14, 0.021);
  scene.environment = buildEnvMap(renderer);

  buildFloor(scene);
  buildWalls(scene);
  const colliders = buildRuins(scene);
  colliders.push({ x: 0, z: -4, r: 2.5, colossus: true }); // the colossus
  const entrance = buildEntrance(scene);
  const colossus = buildColossus(scene);

  // ---------- light ----------
  scene.add(new THREE.HemisphereLight(0x6f80b0, 0x3a2410, 1.5));

  const shaft = new THREE.SpotLight(0xffe2b0, 420, 0, 0.5, 0.65, 1);
  shaft.position.set(-3, 21, -8);
  shaft.target.position.set(0, 6, -3);
  scene.add(shaft, shaft.target);

  const shaftGeo = new THREE.CylinderGeometry(1.4, 7.5, 20, 20, 1, true);
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffd9a0, transparent: true, opacity: 0.05,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  shaftMesh.position.set(-1.6, 11.5, -5.6);
  shaftMesh.rotation.z = 0.13;
  shaftMesh.rotation.x = -0.22;
  scene.add(shaftMesh);

  const lantern = new THREE.PointLight(0xffb465, 16, 20, 1);
  lantern.position.set(0.35, 0.1, 0.4);
  camera.add(lantern);

  const motes = buildMotes(scene);

  return {
    entrance,
    colossus,
    colliders,
    lantern,
    update(t) {
      lantern.intensity = 16 + Math.sin(t * 7.3) * 0.6 + Math.sin(t * 13.1) * 0.4;
      motes.rotation.y = t * 0.01;
      motes.position.y = Math.sin(t * 0.2) * 0.3;
    },
  };
}

// A small gradient room baked into a reflection map so metals have
// something warm to reflect. Much cheaper than real reflections.
function buildEnvMap(renderer) {
  const env = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const col = [];
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const y = p.getY(k) / 10;
    const top = new THREE.Color(0x141a2e);
    const bottom = new THREE.Color(0x8a5a1c);
    const c = bottom.clone().lerp(top, (y + 1) / 2);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
  for (const [x, y, z, s] of [[3, 6, -4, 1.4], [-5, 4, 3, 0.8], [6, 2, 6, 0.6]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), glow);
    m.position.set(x, y, z);
    env.add(m);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}

// The chamber's original floor: stone flags and an old mosaic. It is
// completely buried at the start and is revealed only by excavation.
function buildFloor(scene) {
  const size = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d");
  const rng = mulberry32(WORLD.seed + 3);
  const R = 36; // half-width of the floor square, reaching under the walls
  const px = size / (R * 2);
  g.fillStyle = "#23262e";
  g.fillRect(0, 0, size, size);
  // flagstones
  for (let y = 0; y < size; y += px * 1.5) {
    const off = (Math.round(y / (px * 1.5)) % 2) * px * 0.75;
    for (let x = -px; x < size; x += px * 1.5) {
      const l = 30 + rng() * 14;
      g.fillStyle = `hsl(222, 9%, ${l}%)`;
      g.fillRect(x + off + 2, y + 2, px * 1.5 - 4, px * 1.5 - 4);
    }
  }
  // mosaic centred under the great mound
  const cx = size / 2, cy = size / 2 + (-4 * px);
  const rings = [
    [13, "#2f6f6a"], [12.2, "#c9b58a"], [11.4, "#8e3b2a"], [8, "#1f4a5c"],
    [7.3, "#c9b58a"], [6.6, "#2f6f6a"], [3, "#8e3b2a"], [2.4, "#e0c070"],
  ];
  for (const [r, c] of rings) {
    g.beginPath();
    g.arc(cx, cy, r * px, 0, Math.PI * 2);
    g.fillStyle = c;
    g.fill();
  }
  // twelve rays between the rings
  g.fillStyle = "#e0c070";
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a - 0.08) * 7.3 * px, cy + Math.sin(a - 0.08) * 7.3 * px);
    g.lineTo(cx + Math.cos(a) * 11.2 * px, cy + Math.sin(a) * 11.2 * px);
    g.lineTo(cx + Math.cos(a + 0.08) * 7.3 * px, cy + Math.sin(a + 0.08) * 7.3 * px);
    g.fill();
  }
  // tessera grain
  for (let k = 0; k < 16000; k++) {
    const x = rng() * size, y = rng() * size;
    g.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.1})`;
    g.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2; // canvas top edge ends up at z = -R
  scene.add(floor);
}

function buildWalls(scene) {
  const geo = new THREE.SphereGeometry(33, 72, 36);
  const p = geo.attributes.position;
  const col = [];
  const v = new THREE.Vector3();
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k);
    const n = fbm2(v.x * 0.09 + v.y * 0.05, v.z * 0.09 - v.y * 0.04, 11);
    v.multiplyScalar(1 + (n - 0.5) * 0.22);
    v.y *= 0.62;
    p.setXYZ(k, v.x, v.y, v.z);
    const c = STONE.clone().multiplyScalar(0.7 + n * 0.6);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const walls = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.BackSide })
  );
  scene.add(walls);

  // stalactites
  const rng = mulberry32(WORLD.seed + 5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x323948, flatShading: true, roughness: 1 });
  for (let k = 0; k < 46; k++) {
    const a = rng() * Math.PI * 2, r = 4 + rng() * 25;
    const len = 1.5 + rng() * 4;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3 + rng() * 0.6, len, 6), mat);
    const ceil = 20.5 * Math.sqrt(Math.max(0, 1 - (r / 33) ** 2));
    cone.position.set(Math.cos(a) * r, ceil - len / 2 + 0.3, Math.sin(a) * r);
    cone.rotation.x = Math.PI;
    scene.add(cone);
  }
}

// Broken columns from whatever hall this used to be. They stick out of
// the treasure, hinting at architecture waiting underneath.
function buildRuins(scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8578, flatShading: true, roughness: 0.85 });
  const colliders = [];
  const cols = [
    [-10, -8, 11, 0], [10, -2, 9, 0.05], [-6, 8, 5, -0.1], [15, 6, 13, 0],
    [-17, -6, 8, 0.2], [4, -17, 12, 0], [-3, -14, 6.5, -0.15], [18, -16, 10, 0.1],
  ];
  for (const [x, z, h, tilt] of cols) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, h, 10), mat);
    shaft.position.y = h / 2;
    g.add(shaft);
    if (h > 8) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 2.1), mat);
      cap.position.y = h + 0.3;
      g.add(cap);
    }
    g.position.set(x, 0, z);
    g.rotation.z = tilt;
    scene.add(g);
    colliders.push({ x, z, r: 1.15 });
  }
  return colliders;
}

function buildEntrance(scene) {
  const { x, z } = WORLD.entrance;
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a4f5a, flatShading: true, roughness: 0.9 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.75, 6, 14, Math.PI), stone);
  arch.position.set(x, 0, z + 1.2);
  scene.add(arch);
  // daylight at the end of the tunnel
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 128;
  const g = cv.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "#cfe3ff");
  grad.addColorStop(0.7, "#8fb1d8");
  grad.addColorStop(1, "#56708f");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const day = new THREE.Mesh(
    new THREE.CircleGeometry(2.7, 20, 0, Math.PI),
    new THREE.MeshBasicMaterial({ map: tex, fog: false })
  );
  day.position.set(x, 0, z + 1.5);
  day.rotation.y = Math.PI;
  scene.add(day);
  const light = new THREE.PointLight(0xa8c4ff, 5, 12, 1.2);
  light.position.set(x, 2, z - 0.5);
  scene.add(light);
  // sign
  const sc = document.createElement("canvas");
  sc.width = 256; sc.height = 64;
  const sg = sc.getContext("2d");
  sg.font = "600 34px 'Barlow Semi Condensed', system-ui, sans-serif";
  sg.textAlign = "center";
  sg.fillStyle = "#e8eefc";
  sg.fillText("CAMP", 128, 44);
  const st = new THREE.CanvasTexture(sc);
  st.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, fog: false }));
  sign.scale.set(2.4, 0.6, 1);
  sign.position.set(x, 3.9, z + 0.4);
  scene.add(sign);
  return { x, z };
}

// A giant gold statue, mostly buried. Only its crown and raised hand
// show at the start. Too big for any bag: an aspiration for later.
function buildColossus(scene) {
  const parts = [];
  const add = (geo, pos, rot = [0, 0, 0]) => {
    geo.rotateX(rot[0]); geo.rotateY(rot[1]); geo.rotateZ(rot[2]);
    geo.translate(...pos);
    parts.push(geo.index ? geo.toNonIndexed() : geo);
  };
  add(new THREE.CylinderGeometry(1.7, 2.4, 7, 10), [0, 3.5, 0]);
  add(new THREE.SphereGeometry(1.25, 10, 8), [0, 8.1, 0]);
  add(new THREE.CylinderGeometry(1.1, 1.05, 0.6, 10), [0, 9.1, 0]);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add(new THREE.ConeGeometry(0.28, 0.9, 5), [Math.cos(a) * 1, 9.8, Math.sin(a) * 1]);
  }
  add(new THREE.CylinderGeometry(0.42, 0.5, 4.2, 8), [2.5, 8.6, 0], [0, 0, -0.45]);
  add(new THREE.SphereGeometry(0.62, 8, 6), [3.4, 10.7, 0]);
  add(new THREE.CylinderGeometry(0.42, 0.5, 3.8, 8), [-2.1, 5.2, 0.3], [0.1, 0, -0.2]);
  let count = 0;
  for (const p of parts) count += p.attributes.position.count;
  const pos = new Float32Array(count * 3);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o);
    o += p.attributes.position.array.length;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0xf0b545, metalness: 0.85, roughness: 0.28, flatShading: true })
  );
  mesh.position.set(0, 0, -4);
  scene.add(mesh);
  return {
    mesh,
    // interaction points (world space) with a pick radius
    spots: [
      { x: 3.4, y: 10.7, z: -4, r: 1.1 },
      { x: 0, y: 9.3, z: -4, r: 1.6 },
      { x: 0, y: 6.5, z: -4, r: 2.2 },
    ],
  };
}

function buildMotes(scene) {
  const rng = mulberry32(WORLD.seed + 21);
  const n = 400;
  const pos = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    pos[k * 3] = -2 + (rng() - 0.5) * 9;
    pos[k * 3 + 1] = 3 + rng() * 16;
    pos[k * 3 + 2] = -5 + (rng() - 0.5) * 9;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffe6b0, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false })
  );
  scene.add(pts);
  return pts;
}
