"use strict";

// =============================================================
//  DRIFT — synthwave one-stick asteroids w/ combo + roguelite
// =============================================================

// ---------- Config ----------
const C = {
  ship: {
    radius: 12,
    accel: 720,
    maxSpeed: 360,
    friction: 0.985,
    turnSpeed: 12, // rad/s (visual smoothing)
    invulnTime: 2.0,
    fireCooldown: 0.22,
    bulletSpeed: 720,
    bulletTtl: 0.95,
    aimLockRange: 520,
    autoFireRange: 600,
  },
  bullet: { radius: 3 },
  asteroid: {
    sizes: {
      3: { r: 42, vMin: 40, vMax: 90, score: 25, vertices: 12 },
      2: { r: 24, vMin: 70, vMax: 130, score: 50, vertices: 10 },
      1: { r: 12, vMin: 110, vMax: 190, score: 100, vertices: 8 },
    },
  },
  saucer: {
    r: 16,
    speed: 110,
    score: 250,
    fireInterval: 1.4,
    bulletSpeed: 280,
    bulletTtl: 3.0,
  },
  combo: {
    orbRadius: 7,
    orbTtl: 4.0,
    magnetBase: 32,
    magnetPerLv: 60,
    decayBase: 5.0,
    decayPerLv: 1.0,
    multStep: 0.04,
  },
  wave: {
    baseAsteroids: 3,
    perWave: 1,
    saucerStartWave: 4,
    saucerEveryWaves: 3,
  },
};

// ---------- Utils ----------
const TAU = Math.PI * 2;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU) - Math.PI;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
};
const dist2 = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
const wrap = (v, max) => (v < 0 ? v + max : v >= max ? v - max : v);
const wrapEntity = (e, w, h) => {
  const pad = (e.r || 16) + 8;
  if (e.x < -pad) e.x = w + pad;
  else if (e.x > w + pad) e.x = -pad;
  if (e.y < -pad) e.y = h + pad;
  else if (e.y > h + pad) e.y = -pad;
};

// ---------- Audio (synth-only, lazy) ----------
class SFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }
  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.45;
    this.master.connect(this.ctx.destination);
  }
  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
  _tone(freq, dur, type = "square", gain = 0.2, sweepTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo !== null) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  _noise(dur, gain = 0.25, lowpass = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  shoot() {
    this._tone(880, 0.07, "square", 0.07, 420);
  }
  hitSmall() {
    this._noise(0.12, 0.18, 1800);
    this._tone(220, 0.08, "triangle", 0.08, 110);
  }
  hitBig() {
    this._noise(0.35, 0.3, 900);
    this._tone(120, 0.25, "sawtooth", 0.12, 50);
  }
  pickup() {
    if (!this.ctx) return;
    this._tone(660, 0.06, "sine", 0.12, 1200);
  }
  comboBreak() {
    this._tone(440, 0.25, "sawtooth", 0.12, 110);
  }
  hurt() {
    this._noise(0.25, 0.25, 600);
    this._tone(90, 0.2, "sawtooth", 0.16, 40);
  }
  waveClear() {
    [523, 659, 784, 988].forEach((f, i) => setTimeout(() => this._tone(f, 0.12, "triangle", 0.1), i * 70));
  }
  upgrade() {
    [659, 784, 988, 1175].forEach((f, i) => setTimeout(() => this._tone(f, 0.1, "sine", 0.12), i * 50));
  }
  gameOver() {
    [330, 277, 220, 165].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, "sawtooth", 0.14), i * 130));
  }
}

// ---------- Input ----------
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.stick = { active: false, ox: 0, oy: 0, dx: 0, dy: 0, mag: 0, touchId: null };
    this.maxRadius = 70;
    this.kb = { up: false, down: false, left: false, right: false };
    this._bind();
  }
  _bind() {
    const c = this.canvas;
    const handleStart = (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.stick.active = true;
      this.stick.touchId = t.identifier;
      this.stick.ox = t.clientX;
      this.stick.oy = t.clientY;
      this.stick.dx = 0;
      this.stick.dy = 0;
      this.stick.mag = 0;
    };
    const handleMove = (e) => {
      e.preventDefault();
      if (!this.stick.active) return;
      let t = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.stick.touchId) {
          t = e.changedTouches[i];
          break;
        }
      }
      if (!t) return;
      let dx = t.clientX - this.stick.ox;
      let dy = t.clientY - this.stick.oy;
      const mag = Math.hypot(dx, dy);
      if (mag > this.maxRadius) {
        // drift the origin so stick stays at edge — feels better
        const k = (mag - this.maxRadius) / mag;
        this.stick.ox += dx * k;
        this.stick.oy += dy * k;
        dx *= this.maxRadius / mag;
        dy *= this.maxRadius / mag;
      }
      this.stick.dx = dx / this.maxRadius;
      this.stick.dy = dy / this.maxRadius;
      this.stick.mag = clamp(mag / this.maxRadius, 0, 1);
    };
    const handleEnd = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.stick.touchId) {
          this.stick.active = false;
          this.stick.touchId = null;
          this.stick.dx = 0;
          this.stick.dy = 0;
          this.stick.mag = 0;
          return;
        }
      }
    };
    c.addEventListener("touchstart", handleStart, { passive: false });
    c.addEventListener("touchmove", handleMove, { passive: false });
    c.addEventListener("touchend", handleEnd, { passive: false });
    c.addEventListener("touchcancel", handleEnd, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) this.kb.up = true;
      else if (["ArrowDown", "s", "S"].includes(e.key)) this.kb.down = true;
      else if (["ArrowLeft", "a", "A"].includes(e.key)) this.kb.left = true;
      else if (["ArrowRight", "d", "D"].includes(e.key)) this.kb.right = true;
    });
    window.addEventListener("keyup", (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) this.kb.up = false;
      else if (["ArrowDown", "s", "S"].includes(e.key)) this.kb.down = false;
      else if (["ArrowLeft", "a", "A"].includes(e.key)) this.kb.left = false;
      else if (["ArrowRight", "d", "D"].includes(e.key)) this.kb.right = false;
    });
  }
  vector() {
    // combine keyboard + touch; return normalized direction + magnitude
    let dx = 0,
      dy = 0;
    if (this.kb.up) dy -= 1;
    if (this.kb.down) dy += 1;
    if (this.kb.left) dx -= 1;
    if (this.kb.right) dx += 1;
    const kmag = Math.hypot(dx, dy);
    if (kmag > 0) {
      dx /= kmag;
      dy /= kmag;
    }
    if (this.stick.active && this.stick.mag > 0.1) {
      // touch wins when active
      return { x: this.stick.dx, y: this.stick.dy, mag: this.stick.mag };
    }
    return { x: dx, y: dy, mag: kmag > 0 ? 1 : 0 };
  }
  reset() {
    this.stick.active = false;
    this.stick.touchId = null;
    this.stick.dx = 0;
    this.stick.dy = 0;
    this.stick.mag = 0;
    this.kb.up = this.kb.down = this.kb.left = this.kb.right = false;
  }
}

// ---------- Backdrop ----------
class Backdrop {
  constructor() {
    this.stars = [];
    this.gridOffset = 0;
    this.scanOffset = 0;
    this.w = 0;
    this.h = 0;
  }
  resize(w, h) {
    this.w = w;
    this.h = h;
    this.stars = [];
    const n = Math.floor((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: rand(w),
        y: rand(h * 0.55),
        r: rand(0.4, 1.8),
        tw: rand(0, TAU),
        twSpeed: rand(0.5, 2.0),
        drift: rand(2, 8),
      });
    }
  }
  update(dt) {
    this.gridOffset = (this.gridOffset + dt * 60) % 60;
    this.scanOffset = (this.scanOffset + dt * 30) % 4;
    for (const s of this.stars) {
      s.tw += dt * s.twSpeed;
      s.x -= s.drift * dt * 0.05;
      if (s.x < 0) s.x += this.w;
    }
  }
  draw(ctx) {
    const { w, h } = this;
    const horizonY = h * 0.55;

    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#0a0418");
    sky.addColorStop(0.55, "#1c0640");
    sky.addColorStop(1, "#48105c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY);

    // stars
    for (const s of this.stars) {
      const a = 0.5 + Math.sin(s.tw) * 0.4;
      ctx.fillStyle = `rgba(246,232,255,${a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    // sun (semicircle w/ horizontal scan lines)
    const sunR = Math.min(w * 0.35, 220);
    const sunX = w / 2;
    const sunY = horizonY;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY);
    sunGrad.addColorStop(0, "#ffd84d");
    sunGrad.addColorStop(0.5, "#ff7733");
    sunGrad.addColorStop(1, "#ff3df0");
    // sun gradient fill (with outer glow)
    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, Math.PI, TAU);
    ctx.closePath();
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = "#ff3df0";
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.restore();
    // scan lines: clipped to the sun semicircle so we don't carve the sky
    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, Math.PI, TAU);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    const scanH = 3;
    const scanGap = 6;
    for (let y = sunY - sunR + ((this.scanOffset * 0.5) % scanGap); y < sunY; y += scanGap) {
      const thick = scanH * (0.6 + ((sunY - y) / sunR) * 0.8);
      ctx.fillRect(sunX - sunR, y, sunR * 2, thick);
    }
    ctx.restore();

    // ground gradient
    const ground = ctx.createLinearGradient(0, horizonY, 0, h);
    ground.addColorStop(0, "#3a0a52");
    ground.addColorStop(0.4, "#1a0633");
    ground.addColorStop(1, "#05020e");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // perspective grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,61,240,0.55)";
    ctx.lineWidth = 1;
    ctx.shadowColor = "#ff3df0";
    ctx.shadowBlur = 8;

    // horizontal lines (closer = denser & brighter)
    const vp = horizonY;
    const groundH = h - horizonY;
    for (let i = 0; i < 18; i++) {
      const t = (i + this.gridOffset / 60) / 18;
      const y = vp + Math.pow(t, 1.8) * groundH;
      if (y > h) break;
      const alpha = lerp(0.15, 0.7, t);
      ctx.strokeStyle = `rgba(255,61,240,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // vertical converging lines
    const cols = 24;
    for (let i = -cols; i <= cols; i++) {
      const xBottom = w / 2 + (i / cols) * w * 1.4;
      ctx.strokeStyle = "rgba(37,230,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(w / 2, vp);
      ctx.lineTo(xBottom, h);
      ctx.stroke();
    }
    ctx.restore();

    // horizon line glow
    ctx.save();
    ctx.shadowColor = "#25e6ff";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(37,230,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Entities ----------
class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.aim = -Math.PI / 2;
    this.r = C.ship.radius;
    this.fireTimer = 0;
    this.invuln = 2.0;
    this.thrustVisual = 0;
  }
  update(dt, input) {
    const v = input.vector();
    if (v.mag > 0) {
      const m = clamp(v.mag, 0, 1);
      this.vx += v.x * C.ship.accel * m * dt;
      this.vy += v.y * C.ship.accel * m * dt;
      this.thrustVisual = lerp(this.thrustVisual, m, 0.25);
    } else {
      this.thrustVisual = lerp(this.thrustVisual, 0, 0.2);
    }
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > C.ship.maxSpeed) {
      this.vx = (this.vx / speed) * C.ship.maxSpeed;
      this.vy = (this.vy / speed) * C.ship.maxSpeed;
    }
    this.vx *= Math.pow(C.ship.friction, dt * 60);
    this.vy *= Math.pow(C.ship.friction, dt * 60);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    // smooth body rotation toward aim
    this.angle = lerpAngle(this.angle, this.aim, clamp(dt * C.ship.turnSpeed, 0, 1));
  }
  draw(ctx) {
    const alpha =
      this.invuln > 0 ? 0.45 + (Math.sin(this.invuln * 18) + 1) * 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // thruster flame
    if (this.thrustVisual > 0.05) {
      const fl = this.thrustVisual * (12 + Math.random() * 6);
      ctx.beginPath();
      ctx.moveTo(-this.r * 0.6, this.r * 0.5);
      ctx.lineTo(-this.r - fl, 0);
      ctx.lineTo(-this.r * 0.6, -this.r * 0.5);
      ctx.closePath();
      const flameGrad = ctx.createLinearGradient(-this.r, 0, -this.r - fl, 0);
      flameGrad.addColorStop(0, "#ffd84d");
      flameGrad.addColorStop(0.5, "#ff7733");
      flameGrad.addColorStop(1, "rgba(255,61,240,0)");
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = "#ff7733";
      ctx.shadowBlur = 18;
      ctx.fill();
    }

    // body
    ctx.strokeStyle = "#25e6ff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#25e6ff";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(this.r * 1.3, 0);
    ctx.lineTo(-this.r * 0.8, this.r * 0.85);
    ctx.lineTo(-this.r * 0.4, 0);
    ctx.lineTo(-this.r * 0.8, -this.r * 0.85);
    ctx.closePath();
    ctx.stroke();
    // inner magenta
    ctx.strokeStyle = "rgba(255,61,240,0.9)";
    ctx.shadowColor = "#ff3df0";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.r * 0.6, 0);
    ctx.lineTo(-this.r * 0.4, this.r * 0.4);
    ctx.lineTo(-this.r * 0.2, 0);
    ctx.lineTo(-this.r * 0.4, -this.r * 0.4);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

class Asteroid {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    const spec = C.asteroid.sizes[size];
    this.r = spec.r;
    const a = rand(TAU);
    const s = rand(spec.vMin, spec.vMax);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.rot = 0;
    this.rotSpeed = rand(-0.8, 0.8);
    this.verts = [];
    const n = spec.vertices;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU;
      const rad = spec.r * rand(0.78, 1.15);
      this.verts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
    }
    this.hue = rand() < 0.5 ? "magenta" : "cyan";
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.rotSpeed * dt;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    const colorStroke = this.hue === "magenta" ? "#ff3df0" : "#25e6ff";
    const colorFill = this.hue === "magenta" ? "rgba(255,61,240,0.12)" : "rgba(37,230,255,0.12)";
    ctx.strokeStyle = colorStroke;
    ctx.fillStyle = colorFill;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = colorStroke;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    this.verts.forEach((v, i) => (i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, vx, vy, pierce = 0, hostile = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ttl = hostile ? C.saucer.bulletTtl : C.ship.bulletTtl;
    this.r = C.bullet.radius;
    this.pierce = pierce; // extra enemies it can pass through
    this.hostile = hostile;
    this.hit = new Set();
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
  }
  draw(ctx) {
    const color = this.hostile ? "#ff3a6a" : "#25e6ff";
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fill();
    // trail
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.025, this.y - this.vy * 0.025);
    ctx.stroke();
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, vx, vy, color, ttl, size = 2) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.ttl = ttl;
    this.maxTtl = ttl;
    this.size = size;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.ttl -= dt;
  }
  draw(ctx) {
    const t = clamp(this.ttl / this.maxTtl, 0, 1);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class ComboOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = rand(-30, 30);
    this.vy = rand(-30, 30);
    this.ttl = C.combo.orbTtl;
    this.maxTtl = C.combo.orbTtl;
    this.r = C.combo.orbRadius;
    this.phase = rand(TAU);
  }
  update(dt, ship, magnetR) {
    this.phase += dt * 6;
    if (ship) {
      const dx = ship.x - this.x;
      const dy = ship.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < magnetR) {
        const pull = 360 * (1 - d / magnetR);
        this.vx += (dx / d) * pull * dt;
        this.vy += (dy / d) * pull * dt;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.ttl -= dt;
  }
  draw(ctx) {
    const t = clamp(this.ttl / this.maxTtl, 0, 1);
    const pulse = 1 + Math.sin(this.phase) * 0.18;
    const blink = this.ttl < 1.2 ? Math.floor(this.ttl * 10) % 2 === 0 : false;
    if (blink) return;
    ctx.save();
    ctx.globalAlpha = clamp(t * 1.3, 0.2, 1);
    ctx.shadowColor = "#ffd84d";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff7d5";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.5 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

class Saucer {
  constructor(w, h) {
    const side = randi(0, 3);
    if (side === 0) {
      this.x = -30;
      this.y = rand(h * 0.15, h * 0.85);
    } else if (side === 1) {
      this.x = w + 30;
      this.y = rand(h * 0.15, h * 0.85);
    } else if (side === 2) {
      this.x = rand(w);
      this.y = -30;
    } else {
      this.x = rand(w);
      this.y = h + 30;
    }
    const ang = Math.atan2(h / 2 - this.y, w / 2 - this.x);
    this.vx = Math.cos(ang) * C.saucer.speed;
    this.vy = Math.sin(ang) * C.saucer.speed;
    this.r = C.saucer.r;
    this.fireT = C.saucer.fireInterval * 0.6;
    this.zigT = 0;
  }
  update(dt) {
    this.zigT += dt;
    const perp = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    const wob = Math.sin(this.zigT * 2.4) * 60;
    this.x += (this.vx + Math.cos(perp) * wob) * dt;
    this.y += (this.vy + Math.sin(perp) * wob) * dt;
    this.fireT -= dt;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = "#ff3a6a";
    ctx.fillStyle = "rgba(255,58,106,0.18)";
    ctx.shadowColor = "#ff3a6a";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    // dome
    ctx.beginPath();
    ctx.ellipse(0, -3, this.r * 0.65, this.r * 0.55, 0, Math.PI, TAU);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(0, 2, this.r, this.r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Upgrades ----------
const UPGRADES = [
  {
    id: "spread",
    name: "SPREAD",
    desc: "+1 bullet per shot, wider arc",
    max: 3,
  },
  {
    id: "rapid",
    name: "RAPID",
    desc: "+25% fire rate",
    max: 3,
  },
  {
    id: "pierce",
    name: "PIERCE",
    desc: "Bullets pass through +1 enemy",
    max: 3,
  },
  {
    id: "magnet",
    name: "MAGNET",
    desc: "Combo orbs pulled from farther",
    max: 3,
  },
  {
    id: "shield",
    name: "SHIELD",
    desc: "Absorb a hit. +1 charge, refills each wave",
    max: 3,
  },
  {
    id: "life",
    name: "BACKUP DRIVE",
    desc: "Gain +1 life",
    max: 3,
  },
  {
    id: "keeper",
    name: "COMBO KEEPER",
    desc: "Combo decays slower, orbs linger",
    max: 3,
  },
  {
    id: "ghost",
    name: "GHOST DRIFT",
    desc: "Longer i-frames after a hit",
    max: 2,
  },
];

// ---------- Game ----------
class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;
    this.sfx = new SFX();
    this.input = new Input(this.canvas);
    this.backdrop = new Backdrop();
    this.state = "menu";
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.timeScale = 1;
    this.lastT = 0;
    this._bestRead = this._loadBest();
    this._initDOM();
    this._resize();
    window.addEventListener("resize", () => this._resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this._resize(), 100));
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _initDOM() {
    this.elScore = document.getElementById("score");
    this.elWave = document.getElementById("wave");
    this.elBest = document.getElementById("best");
    this.elLives = document.getElementById("lives");
    this.elCombo = document.getElementById("combo");
    this.elComboX = document.getElementById("combo-x");
    this.elComboFill = document.getElementById("combo-fill");
    this.elOverlay = document.getElementById("overlay");
    this.elUpgrade = document.getElementById("upgrade-screen");
    this.elUpgradeWave = document.getElementById("upgrade-wave");
    this.elUpgradeCards = document.getElementById("upgrade-cards");
    this.elGameOver = document.getElementById("gameover-screen");
    this.elGoScore = document.getElementById("go-score");
    this.elGoWave = document.getElementById("go-wave");
    this.elGoCombo = document.getElementById("go-combo");
    this.elNewRecord = document.getElementById("new-record");
    this.elHud = document.getElementById("hud");
    this.elBestScoreMenu = document.getElementById("best-score-menu");
    this.elBestWaveMenu = document.getElementById("best-wave-menu");
    this.elBestComboMenu = document.getElementById("best-combo-menu");

    document.getElementById("start").addEventListener("click", () => this.start());
    document.getElementById("retry").addEventListener("click", () => this.start());

    this._renderMenuStats();
  }

  _renderMenuStats() {
    const b = this._bestRead;
    this.elBestScoreMenu.textContent = b.score.toLocaleString();
    this.elBestWaveMenu.textContent = b.wave;
    this.elBestComboMenu.textContent = b.combo;
    this.elBest.textContent = b.score.toLocaleString();
  }

  _loadBest() {
    try {
      const raw = localStorage.getItem("drift_best");
      if (!raw) return { score: 0, wave: 0, combo: 0 };
      const j = JSON.parse(raw);
      return {
        score: j.score | 0,
        wave: j.wave | 0,
        combo: j.combo | 0,
      };
    } catch {
      return { score: 0, wave: 0, combo: 0 };
    }
  }
  _saveBest() {
    try {
      localStorage.setItem("drift_best", JSON.stringify(this._bestRead));
    } catch {}
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.backdrop.resize(w, h);
  }

  start() {
    this.sfx.init();
    this.sfx.resume();
    this.state = "playing";
    this.elOverlay.classList.remove("visible");
    this.elGameOver.classList.remove("visible");
    this.elUpgrade.classList.remove("visible");
    this.elHud.classList.remove("hidden");
    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboDecay = 0;
    this.lives = 3;
    this.upgrades = {};
    this.shieldCharges = 0;
    this.ship = new Ship(this.w / 2, this.h / 2);
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.orbs = [];
    this.saucers = [];
    this.popups = [];
    this.shake = 0;
    this.input.reset();
    this._nextWave();
    this._updateHUD();
  }

  _nextWave() {
    this.wave++;
    this.elWave.textContent = this.wave;
    const n = C.wave.baseAsteroids + (this.wave - 1) * C.wave.perWave;
    for (let i = 0; i < n; i++) this._spawnAsteroidEdge(3);
    // refill shield charges if owned
    if (this.upgrades.shield) {
      this.shieldCharges = this.upgrades.shield;
    }
    this._addPopup(`WAVE ${this.wave}`, this.w / 2, this.h / 2 - 40, "#25e6ff", 1.3);
  }

  _spawnAsteroidEdge(size) {
    // spawn at edge, moving INTO the screen.
    // (must spawn inside the wrap zone, so x/y within +/- (r+8) of edge)
    const spec = C.asteroid.sizes[size];
    const sp = rand(spec.vMin, spec.vMax);
    const side = randi(0, 3);
    let x, y, vx, vy;
    const spread = Math.PI / 3; // +/- 60deg cone into screen
    if (side === 0) {
      x = 0;
      y = rand(this.h);
      const a = rand(-spread, spread);
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    } else if (side === 1) {
      x = this.w;
      y = rand(this.h);
      const a = Math.PI + rand(-spread, spread);
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    } else if (side === 2) {
      x = rand(this.w);
      y = 0;
      const a = Math.PI / 2 + rand(-spread, spread);
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    } else {
      x = rand(this.w);
      y = this.h;
      const a = -Math.PI / 2 + rand(-spread, spread);
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    }
    // avoid spawning right on top of the ship
    if (this.ship && Math.hypot(x - this.ship.x, y - this.ship.y) < 160) {
      x = this.w - x;
      y = this.h - y;
      vx = -vx;
      vy = -vy;
    }
    const a = new Asteroid(x, y, size);
    a.x = x;
    a.y = y;
    a.vx = vx;
    a.vy = vy;
    this.asteroids.push(a);
  }

  _fireBullets() {
    const spread = this.upgrades.spread || 0;
    const count = 1 + spread;
    const arcDeg = 6 + spread * 6;
    const arc = (arcDeg * Math.PI) / 180;
    const base = this.ship.aim;
    const pierce = this.upgrades.pierce || 0;
    const start = -(count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const a = base + (start + i) * (arc / Math.max(1, count - 1 || 1));
      const vx = Math.cos(a) * C.ship.bulletSpeed + this.ship.vx * 0.4;
      const vy = Math.sin(a) * C.ship.bulletSpeed + this.ship.vy * 0.4;
      this.bullets.push(
        new Bullet(
          this.ship.x + Math.cos(this.ship.aim) * (this.ship.r + 4),
          this.ship.y + Math.sin(this.ship.aim) * (this.ship.r + 4),
          vx,
          vy,
          pierce,
          false
        )
      );
    }
    this.sfx.shoot();
  }

  _findNearestTarget() {
    let best = null;
    let bestD = Infinity;
    const checks = [this.asteroids, this.saucers];
    for (const arr of checks) {
      for (const e of arr) {
        const d = dist2(this.ship, e);
        if (d < bestD && d < C.ship.aimLockRange * C.ship.aimLockRange) {
          bestD = d;
          best = e;
        }
      }
    }
    return best ? { e: best, d: Math.sqrt(bestD) } : null;
  }

  _explosion(x, y, color, count, speed, ttl, size = 2) {
    for (let i = 0; i < count; i++) {
      const a = rand(TAU);
      const s = rand(speed * 0.4, speed);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, ttl * rand(0.7, 1.2), size));
    }
  }

  _addPopup(text, x, y, color, ttl = 0.8) {
    this.popups.push({ text, x, y, color, ttl, maxTtl: ttl });
  }

  _onAsteroidDeath(a, byBullet) {
    const spec = C.asteroid.sizes[a.size];
    const baseScore = spec.score;
    const mult = 1 + this.combo * C.combo.multStep;
    const gained = Math.round(baseScore * mult);
    this.score += gained;
    this._addPopup(`+${gained}`, a.x, a.y - 14, "#ffd84d", 0.7);
    this._explosion(a.x, a.y, a.hue === "magenta" ? "#ff3df0" : "#25e6ff", 14 + a.size * 6, 220, 0.9, 2);
    if (a.size > 1) {
      this.sfx.hitBig();
      for (let i = 0; i < 2; i++) {
        const child = new Asteroid(a.x, a.y, a.size - 1);
        const ang = rand(TAU);
        const sp = rand(C.asteroid.sizes[a.size - 1].vMin, C.asteroid.sizes[a.size - 1].vMax);
        child.vx = Math.cos(ang) * sp + a.vx * 0.3;
        child.vy = Math.sin(ang) * sp + a.vy * 0.3;
        this.asteroids.push(child);
      }
    } else {
      this.sfx.hitSmall();
    }
    // drop combo orb
    if (byBullet) this.orbs.push(new ComboOrb(a.x, a.y));
    this.shake = Math.min(1.0, this.shake + 0.15 + a.size * 0.08);
  }

  _onSaucerDeath(s) {
    const baseScore = C.saucer.score;
    const mult = 1 + this.combo * C.combo.multStep;
    const gained = Math.round(baseScore * mult);
    this.score += gained;
    this._addPopup(`+${gained}`, s.x, s.y - 14, "#ffd84d", 0.8);
    this._explosion(s.x, s.y, "#ff3a6a", 30, 280, 1.0, 2);
    this.orbs.push(new ComboOrb(s.x, s.y));
    this.orbs.push(new ComboOrb(s.x + rand(-12, 12), s.y + rand(-12, 12)));
    this.shake = Math.min(1.2, this.shake + 0.35);
    this.sfx.hitBig();
  }

  _hitShip() {
    if (this.ship.invuln > 0) return;
    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      this.ship.invuln = 1.0;
      this._explosion(this.ship.x, this.ship.y, "#25e6ff", 24, 220, 0.8);
      this._addPopup("SHIELD", this.ship.x, this.ship.y - 22, "#25e6ff", 0.8);
      this.shake = Math.min(1.0, this.shake + 0.3);
      this.sfx.hurt();
      return;
    }
    this.lives--;
    this.combo = 0;
    this.comboDecay = 0;
    this._updateCombo();
    this._updateHUD();
    this._explosion(this.ship.x, this.ship.y, "#ff3a6a", 50, 320, 1.2, 3);
    this.shake = 1.0;
    this.sfx.hurt();
    if (this.lives <= 0) {
      this._gameOver();
      return;
    }
    const iframes = 2.0 + (this.upgrades.ghost || 0) * 0.8;
    this.ship.x = this.w / 2;
    this.ship.y = this.h / 2;
    this.ship.vx = 0;
    this.ship.vy = 0;
    this.ship.invuln = iframes;
  }

  _gameOver() {
    this.state = "gameover";
    this.sfx.gameOver();
    let isRecord = false;
    if (this.score > this._bestRead.score) {
      this._bestRead.score = this.score;
      isRecord = true;
    }
    if (this.wave > this._bestRead.wave) {
      this._bestRead.wave = this.wave;
      isRecord = true;
    }
    if (this.maxCombo > this._bestRead.combo) {
      this._bestRead.combo = this.maxCombo;
      isRecord = true;
    }
    this._saveBest();
    this._renderMenuStats();
    setTimeout(() => {
      this.elGoScore.textContent = this.score.toLocaleString();
      this.elGoWave.textContent = this.wave;
      this.elGoCombo.textContent = this.maxCombo;
      this.elNewRecord.classList.toggle("hidden", !isRecord);
      this.elGameOver.classList.add("visible");
      this.elHud.classList.add("hidden");
    }, 800);
  }

  _availableUpgrades() {
    return UPGRADES.filter((u) => (this.upgrades[u.id] || 0) < u.max);
  }

  _openUpgradeScreen() {
    const pool = this._availableUpgrades();
    if (pool.length === 0) {
      this._nextWave();
      return;
    }
    const picks = [];
    const copy = pool.slice();
    for (let i = 0; i < 3 && copy.length > 0; i++) {
      const idx = randi(0, copy.length - 1);
      picks.push(copy.splice(idx, 1)[0]);
    }
    this.state = "upgrade";
    this.elUpgradeWave.textContent = this.wave;
    this.elUpgradeCards.innerHTML = "";
    picks.forEach((u) => {
      const lv = this.upgrades[u.id] || 0;
      const card = document.createElement("button");
      card.className = "upgrade-card";
      card.innerHTML = `
        <div class="upg-level">LV ${lv + 1}/${u.max}</div>
        <div class="upg-name">${u.name}</div>
        <div class="upg-desc">${u.desc}</div>
      `;
      card.addEventListener("click", () => this._pickUpgrade(u.id));
      this.elUpgradeCards.appendChild(card);
    });
    this.elUpgrade.classList.add("visible");
    this.elHud.classList.add("hidden");
  }

  _pickUpgrade(id) {
    this.upgrades[id] = (this.upgrades[id] || 0) + 1;
    if (id === "life") this.lives++;
    if (id === "shield") this.shieldCharges = this.upgrades.shield;
    this.sfx.upgrade();
    this.elUpgrade.classList.remove("visible");
    this.elHud.classList.remove("hidden");
    this.state = "playing";
    this._nextWave();
    this._updateHUD();
  }

  _updateHUD() {
    this.elScore.textContent = this.score.toLocaleString();
    this.elBest.textContent = Math.max(this.score, this._bestRead.score).toLocaleString();
    this.elLives.innerHTML = "";
    const total = Math.max(this.lives, 0);
    for (let i = 0; i < total; i++) {
      const d = document.createElement("div");
      d.className = "life";
      this.elLives.appendChild(d);
    }
    // shield indicator: extra cyan ticks
    if (this.shieldCharges > 0) {
      for (let i = 0; i < this.shieldCharges; i++) {
        const d = document.createElement("div");
        d.className = "life";
        d.style.background = "#25e6ff";
        d.style.boxShadow = "0 0 8px #25e6ff";
        d.style.clipPath = "circle(50%)";
        d.style.width = "12px";
        d.style.height = "12px";
        d.style.alignSelf = "center";
        this.elLives.appendChild(d);
      }
    }
  }

  _updateCombo() {
    if (this.combo > 0) {
      this.elCombo.classList.remove("hidden");
      const mult = (1 + this.combo * C.combo.multStep).toFixed(2);
      this.elComboX.textContent = `x${mult}  •  ${this.combo}`;
      const decayMax = C.combo.decayBase + (this.upgrades.keeper || 0) * C.combo.decayPerLv;
      const pct = clamp(this.comboDecay / decayMax, 0, 1) * 100;
      this.elComboFill.style.width = pct + "%";
    } else {
      this.elCombo.classList.add("hidden");
    }
  }

  _maybeSpawnSaucer(dt) {
    if (this.wave < C.wave.saucerStartWave) return;
    if (this.saucers.length >= 1 + Math.floor((this.wave - C.wave.saucerStartWave) / C.wave.saucerEveryWaves)) return;
    if (!this._saucerCooldown) this._saucerCooldown = rand(8, 14);
    this._saucerCooldown -= dt;
    if (this._saucerCooldown <= 0) {
      this.saucers.push(new Saucer(this.w, this.h));
      this._saucerCooldown = rand(10, 18);
    }
  }

  _loop(t) {
    const now = t / 1000;
    let dt = Math.min(0.05, now - this.lastT || 0);
    this.lastT = now;
    if (this.state === "playing") this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    this.backdrop.update(dt);
    // ship
    this.ship.update(dt, this.input);
    wrapEntity(this.ship, this.w, this.h);

    // aim
    const tgt = this._findNearestTarget();
    if (tgt) {
      const desired = Math.atan2(tgt.e.y - this.ship.y, tgt.e.x - this.ship.x);
      this.ship.aim = lerpAngle(this.ship.aim, desired, clamp(dt * 14, 0, 1));
      if (this.ship.fireTimer <= 0 && tgt.d < C.ship.autoFireRange) {
        const rate = C.ship.fireCooldown / (1 + (this.upgrades.rapid || 0) * 0.25);
        this.ship.fireTimer = rate;
        this._fireBullets();
      }
    } else {
      // drift aim slightly with movement direction
      const v = this.input.vector();
      if (v.mag > 0.2) {
        const a = Math.atan2(v.y, v.x);
        this.ship.aim = lerpAngle(this.ship.aim, a, clamp(dt * 6, 0, 1));
      }
    }

    // asteroids
    for (const a of this.asteroids) {
      a.update(dt);
      wrapEntity(a, this.w, this.h);
    }

    // saucers
    this._maybeSpawnSaucer(dt);
    for (const s of this.saucers) {
      s.update(dt);
      if (s.fireT <= 0) {
        s.fireT = C.saucer.fireInterval;
        // fire bullet toward ship w/ small inaccuracy
        const a = Math.atan2(this.ship.y - s.y, this.ship.x - s.x) + rand(-0.18, 0.18);
        const vx = Math.cos(a) * C.saucer.bulletSpeed;
        const vy = Math.sin(a) * C.saucer.bulletSpeed;
        this.bullets.push(new Bullet(s.x, s.y, vx, vy, 0, true));
        this.sfx.shoot();
      }
    }
    // cull saucers off-screen far
    this.saucers = this.saucers.filter(
      (s) => s.x > -120 && s.x < this.w + 120 && s.y > -120 && s.y < this.h + 120
    );

    // bullets
    for (const b of this.bullets) b.update(dt);

    // bullet vs asteroids/saucers (player bullets) — collisions
    for (const b of this.bullets) {
      if (b.ttl <= 0 || b.hostile) continue;
      // asteroid hits
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        const a = this.asteroids[i];
        if (b.hit.has(a)) continue;
        const rr = (a.r + b.r) * (a.r + b.r);
        if (dist2(b, a) < rr) {
          b.hit.add(a);
          this.asteroids.splice(i, 1);
          this._onAsteroidDeath(a, true);
          if (b.pierce > 0) {
            b.pierce--;
          } else {
            b.ttl = 0;
            break;
          }
        }
      }
      if (b.ttl <= 0) continue;
      // saucer hits
      for (let i = this.saucers.length - 1; i >= 0; i--) {
        const s = this.saucers[i];
        if (b.hit.has(s)) continue;
        const rr = (s.r + b.r) * (s.r + b.r);
        if (dist2(b, s) < rr) {
          b.hit.add(s);
          this.saucers.splice(i, 1);
          this._onSaucerDeath(s);
          if (b.pierce > 0) b.pierce--;
          else {
            b.ttl = 0;
            break;
          }
        }
      }
    }

    // hostile bullets vs ship
    for (const b of this.bullets) {
      if (!b.hostile || b.ttl <= 0) continue;
      const rr = (this.ship.r + b.r + 2) * (this.ship.r + b.r + 2);
      if (dist2(b, this.ship) < rr) {
        b.ttl = 0;
        this._hitShip();
      }
    }

    // ship vs asteroid
    for (const a of this.asteroids) {
      if (this.ship.invuln > 0) break;
      const rr = (this.ship.r + a.r - 4) * (this.ship.r + a.r - 4);
      if (dist2(a, this.ship) < rr) {
        this._hitShip();
        break;
      }
    }
    // ship vs saucer
    for (const s of this.saucers) {
      if (this.ship.invuln > 0) break;
      const rr = (this.ship.r + s.r) * (this.ship.r + s.r);
      if (dist2(s, this.ship) < rr) {
        this._hitShip();
        // also remove saucer & explode
        this.saucers.splice(this.saucers.indexOf(s), 1);
        this._onSaucerDeath(s);
        break;
      }
    }

    // cull bullets
    this.bullets = this.bullets.filter((b) => b.ttl > 0 && b.x > -20 && b.x < this.w + 20 && b.y > -20 && b.y < this.h + 20);

    // particles
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => p.ttl > 0);

    // popups
    for (const p of this.popups) {
      p.ttl -= dt;
      p.y -= 24 * dt;
    }
    this.popups = this.popups.filter((p) => p.ttl > 0);

    // combo orbs
    const magnetR = C.combo.magnetBase + (this.upgrades.magnet || 0) * C.combo.magnetPerLv;
    for (const o of this.orbs) o.update(dt, this.ship, magnetR);
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      const rr = (o.r + this.ship.r) * (o.r + this.ship.r);
      if (dist2(o, this.ship) < rr) {
        this.orbs.splice(i, 1);
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.comboDecay = C.combo.decayBase + (this.upgrades.keeper || 0) * C.combo.decayPerLv;
        this.sfx.pickup();
        this._addPopup(`+${this.combo}`, this.ship.x, this.ship.y - 24, "#ffd84d", 0.5);
        this._updateCombo();
        this._updateHUD();
      } else if (o.ttl <= 0) {
        this.orbs.splice(i, 1);
      }
    }

    // combo decay
    if (this.combo > 0) {
      this.comboDecay -= dt;
      if (this.comboDecay <= 0) {
        this.combo = 0;
        this.comboDecay = 0;
        this.sfx.comboBreak();
        this._updateCombo();
      } else {
        this._updateCombo();
      }
    }

    this._updateHUD();

    // shake decay
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const s = this.shake * 14;
      this.shakeX = rand(-s, s);
      this.shakeY = rand(-s, s);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // wave clear
    if (this.asteroids.length === 0 && this.saucers.length === 0 && this.state === "playing") {
      this.sfx.waveClear();
      this._openUpgradeScreen();
    }
  }

  _draw() {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // backdrop (no shake on backdrop for crispness)
    this.backdrop.draw(ctx);

    ctx.translate(this.shakeX, this.shakeY);

    // orbs
    for (const o of this.orbs) o.draw(ctx);

    // bullets
    for (const b of this.bullets) b.draw(ctx);

    // asteroids
    for (const a of this.asteroids) a.draw(ctx);

    // saucers
    for (const s of this.saucers) s.draw(ctx);

    // ship
    if (this.state === "playing" || this.state === "upgrade") this.ship.draw(ctx);

    // shield ring
    if (this.shieldCharges > 0 && this.ship) {
      ctx.save();
      ctx.translate(this.ship.x, this.ship.y);
      ctx.strokeStyle = "rgba(37,230,255,0.6)";
      ctx.shadowColor = "#25e6ff";
      ctx.shadowBlur = 14;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < this.shieldCharges; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, this.ship.r + 6 + i * 5, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // particles
    for (const p of this.particles) p.draw(ctx);

    // popups
    for (const p of this.popups) {
      const t = clamp(p.ttl / p.maxTtl, 0, 1);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.font = "bold 14px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // joystick UI (on top, world transform)
    if (this.input.stick.active) {
      const s = this.input.stick;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // base
      ctx.strokeStyle = "rgba(255,61,240,0.45)";
      ctx.shadowColor = "#ff3df0";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, this.input.maxRadius, 0, TAU);
      ctx.stroke();
      // thumb
      ctx.fillStyle = "rgba(37,230,255,0.85)";
      ctx.shadowColor = "#25e6ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(s.ox + s.dx * this.input.maxRadius, s.oy + s.dy * this.input.maxRadius, 22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}

// ---------- Boot ----------
window.addEventListener("load", () => {
  const game = new Game();
  // expose for debugging
  window.GAME = game;
});
