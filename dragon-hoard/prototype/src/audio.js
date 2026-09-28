// =============================================================
//  Synthesised sound. No audio files: every clink, rumble and roar
//  is built from oscillators and noise with WebAudio.
// =============================================================

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.lastClink = 0;
  }

  // Must be called from a user gesture.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    this.startAmbience();
  }

  noise(dur, { freq = 1000, q = 1, type = "bandpass", gain = 0.3, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    return { f, g, src };
  }

  tone(freq, dur, { type = "sine", gain = 0.2, delay = 0, slide = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  clink(vol = 1) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastClink < 35) return;
    this.lastClink = now;
    const f = 2600 + Math.random() * 2600;
    this.tone(f, 0.12, { gain: 0.05 * vol });
    this.tone(f * 1.51, 0.08, { gain: 0.025 * vol });
  }

  dig() {
    this.noise(0.22, { freq: 3200, q: 0.7, gain: 0.12 });
    for (let k = 0; k < 3; k++) setTimeout(() => this.clink(0.8), k * 40 + Math.random() * 40);
  }

  pickup(value = 10) {
    const base = 520 + Math.min(900, Math.log10(value + 1) * 260);
    this.tone(base, 0.18, { type: "triangle", gain: 0.12 });
    this.tone(base * 1.5, 0.22, { type: "triangle", gain: 0.08, delay: 0.06 });
  }

  heavy() {
    this.noise(0.35, { freq: 400, q: 0.8, gain: 0.25 });
    this.tone(140, 0.25, { type: "triangle", gain: 0.12, slide: 0.6 });
  }

  special() {
    [0, 0.12, 0.24, 0.4].forEach((d, k) =>
      this.tone([392, 494, 587, 784][k], 0.9, { type: "sine", gain: 0.12, delay: d })
    );
  }

  deny() {
    this.tone(200, 0.15, { type: "square", gain: 0.05, slide: 0.7 });
  }

  rumble(strength = 1) {
    this.noise(2.2 * strength, { freq: 70, q: 0.5, type: "lowpass", gain: 0.5 * strength, attack: 0.4 });
  }

  breath() {
    const n = this.noise(2.8, { freq: 260, q: 0.4, type: "lowpass", gain: 0.3, attack: 1.2 });
    if (n) n.f.frequency.linearRampToValueAtTime(120, this.ctx.currentTime + 2.8);
  }

  roar() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(62, t + 2.6);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(260, t + 2.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.9);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 3);
    this.noise(2.8, { freq: 500, q: 0.6, gain: 0.3, attack: 0.3 });
  }

  sale(total) {
    const notes = Math.min(8, 2 + Math.floor(Math.log10(total + 1) * 1.5));
    for (let k = 0; k < notes; k++) {
      setTimeout(() => this.clink(1.4), k * 70);
    }
    this.tone(784, 0.5, { type: "triangle", gain: 0.1, delay: notes * 0.07 });
    this.tone(1175, 0.7, { type: "triangle", gain: 0.08, delay: notes * 0.07 + 0.08 });
  }

  startAmbience() {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    const o = this.ctx.createOscillator();
    o.frequency.value = 55;
    const og = this.ctx.createGain();
    og.gain.value = 0.015;
    o.connect(og).connect(this.master);
    o.start(t);
  }
}
