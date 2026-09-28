// =============================================================
//  Input: mouse + keyboard (pointer lock) and touch (stick + look
//  + hold buttons). Game code reads one shared state object.
// =============================================================
import { PLAYER } from "./config.js";

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookDX = 0;
    this.lookDY = 0;
    this.mouseL = false;
    this.mouseR = false;
    this.touchGrab = false;
    this.touchDig = false;
    this.stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.lookTouch = null;
    this.locked = false;
    this.enabled = false;
    this.onToggleCoins = null;
    this.onUnlock = null;
    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.bindDesktop();
    if (this.isTouch) this.bindTouch();
  }

  bindDesktop() {
    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (e.code === "KeyC" && this.onToggleCoins) this.onToggleCoins();
      if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => {
      this.keys.clear();
      this.mouseL = this.mouseR = false;
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.enabled || this.isTouch) return;
      if (!this.locked) {
        this.requestLock();
        return;
      }
      if (e.button === 0) this.mouseL = true;
      if (e.button === 2) this.mouseR = true;
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseL = false;
      if (e.button === 2) this.mouseR = false;
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.lookDX += e.movementX * PLAYER.lookSensitivity;
      this.lookDY += e.movementY * PLAYER.lookSensitivity;
    });
    document.addEventListener("pointerlockchange", () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      if (was && !this.locked) {
        this.mouseL = this.mouseR = false;
        this.keys.clear();
        if (this.onUnlock) this.onUnlock();
      }
    });
  }

  requestLock() {
    if (this.isTouch) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {
      /* pointer lock is optional */
    }
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  bindTouch() {
    const layer = document.getElementById("touch-layer");
    const knob = document.getElementById("stick-knob");
    const base = document.getElementById("stick-base");
    layer.hidden = false;
    const start = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && this.stick.id === null) {
          this.stick.id = t.identifier;
          this.stick.ox = t.clientX;
          this.stick.oy = t.clientY;
          base.style.transform = `translate(${t.clientX - 60}px, ${t.clientY - 60}px)`;
          base.classList.add("on");
        } else if (this.lookTouch === null) {
          this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          let dx = t.clientX - this.stick.ox, dy = t.clientY - this.stick.oy;
          const len = Math.hypot(dx, dy), max = 55;
          if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
          this.stick.x = dx / max;
          this.stick.y = dy / max;
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.lookDX += (t.clientX - this.lookTouch.x) * PLAYER.touchLookSensitivity;
          this.lookDY += (t.clientY - this.lookTouch.y) * PLAYER.touchLookSensitivity;
          this.lookTouch.x = t.clientX;
          this.lookTouch.y = t.clientY;
        }
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          this.stick.id = null;
          this.stick.x = this.stick.y = 0;
          knob.style.transform = "";
          base.classList.remove("on");
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.lookTouch = null;
        }
      }
    };
    layer.addEventListener("touchstart", start, { passive: false });
    layer.addEventListener("touchmove", move, { passive: false });
    layer.addEventListener("touchend", end);
    layer.addEventListener("touchcancel", end);

    const hold = (id, prop) => {
      const el = document.getElementById(id);
      const on = (e) => { e.preventDefault(); e.stopPropagation(); this[prop] = true; el.classList.add("on"); };
      const off = (e) => { e.preventDefault(); this[prop] = false; el.classList.remove("on"); };
      el.addEventListener("touchstart", on, { passive: false });
      el.addEventListener("touchend", off);
      el.addEventListener("touchcancel", off);
    };
    hold("btn-grab", "touchGrab");
    hold("btn-dig", "touchDig");
    document.getElementById("btn-coins").addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onToggleCoins) this.onToggleCoins();
    }, { passive: false });
  }

  // ---------- queries ----------
  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    x += this.stick.x;
    y += this.stick.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  get sprint() {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || Math.hypot(this.stick.x, this.stick.y) > 0.97;
  }

  get grab() {
    return this.keys.has("KeyE") || this.mouseL || this.touchGrab;
  }

  get dig() {
    return this.keys.has("KeyF") || this.keys.has("Space") || this.mouseR || this.touchDig;
  }

  consumeLook() {
    const d = { x: this.lookDX, y: this.lookDY };
    this.lookDX = this.lookDY = 0;
    return d;
  }

  reset() {
    this.keys.clear();
    this.mouseL = this.mouseR = this.touchGrab = this.touchDig = false;
    this.lookDX = this.lookDY = 0;
  }
}
