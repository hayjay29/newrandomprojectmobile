"use strict";

// =============================================================
//  Phonics Quest — sound-first blending quiz for kids (Lv 1–10)
// =============================================================

const STORAGE_KEY = "phonics_quest_v1";

const LEVEL_META = [
  { name: "첫 글자 친구", hint: "첫 글자를 들었어요! 나머지를 맞춰봐요", emoji: "🌱" },
  { name: "끝 글자 힌트", hint: "앞과 뒤 글자를 봤어요! 가운데를 맞춰봐요", emoji: "🌿" },
  { name: "모음 탐정", hint: "가운데 모음이 빠졌어요! 찾아봐요", emoji: "🔍" },
  { name: "시작 소리", hint: "끝소리를 봤어요! 처음 소리를 맞춰봐요", emoji: "🎯" },
  { name: "블렌드 마스터", hint: "두 글자가 붙은 소리! 나머지를 맞춰봐요", emoji: "🧩" },
  { name: "마법의 E", hint: "긴 모음 소리! 빈칸을 채워봐요", emoji: "✨" },
  { name: "둘이 한소리", hint: "sh, ch 같은 특별한 소리! 맞춰봐요", emoji: "🎵" },
  { name: "4글자 탐험", hint: "조금 더 긴 단어예요! 도전해봐요", emoji: "🚀" },
  { name: "긴 단어 도전", hint: "멋진 긴 단어를 완성해봐요!", emoji: "🏆" },
  { name: "파닉스 챔피언", hint: "최종 보스! 모든 걸 써봐요", emoji: "👑" },
];

/** @type {{ word: string, emoji: string, revealed: number[] }[][]} */
const LEVELS = [
  // Lv1 — CVC, first letter shown (d _ _)
  [
    { word: "dog", emoji: "🐕", revealed: [0] },
    { word: "cat", emoji: "🐱", revealed: [0] },
    { word: "pig", emoji: "🐷", revealed: [0] },
    { word: "sun", emoji: "☀️", revealed: [0] },
    { word: "hat", emoji: "🎩", revealed: [0] },
  ],
  // Lv2 — first + last shown (c _ t)
  [
    { word: "bed", emoji: "🛏️", revealed: [0, 2] },
    { word: "red", emoji: "🔴", revealed: [0, 2] },
    { word: "cup", emoji: "☕", revealed: [0, 2] },
    { word: "fox", emoji: "🦊", revealed: [0, 2] },
    { word: "bus", emoji: "🚌", revealed: [0, 2] },
  ],
  // Lv3 — vowel missing (c _ t)
  [
    { word: "pen", emoji: "🖊️", revealed: [0, 2] },
    { word: "big", emoji: "🐘", revealed: [0, 2] },
    { word: "hot", emoji: "🔥", revealed: [0, 2] },
    { word: "run", emoji: "🏃", revealed: [0, 2] },
    { word: "sit", emoji: "🪑", revealed: [0, 2] },
  ],
  // Lv4 — ending shown, fill start (_ at)
  [
    { word: "bat", emoji: "🦇", revealed: [1, 2] },
    { word: "hen", emoji: "🐔", revealed: [1, 2] },
    { word: "log", emoji: "🪵", revealed: [1, 2] },
    { word: "mop", emoji: "🧹", revealed: [1, 2] },
    { word: "rug", emoji: "🟫", revealed: [1, 2] },
  ],
  // Lv5 — consonant blends
  [
    { word: "frog", emoji: "🐸", revealed: [0, 1] },
    { word: "star", emoji: "⭐", revealed: [0, 1] },
    { word: "clam", emoji: "🦪", revealed: [0, 1] },
    { word: "snap", emoji: "👆", revealed: [0, 1] },
    { word: "trip", emoji: "🧳", revealed: [0, 1] },
  ],
  // Lv6 — magic e / long vowels
  [
    { word: "cake", emoji: "🎂", revealed: [0, 3] },
    { word: "bike", emoji: "🚲", revealed: [0, 3] },
    { word: "rope", emoji: "🪢", revealed: [0, 3] },
    { word: "kite", emoji: "🪁", revealed: [0, 3] },
    { word: "cube", emoji: "🧊", revealed: [0, 3] },
  ],
  // Lv7 — digraphs
  [
    { word: "ship", emoji: "🚢", revealed: [0, 1] },
    { word: "chat", emoji: "💬", revealed: [0, 1] },
    { word: "fish", emoji: "🐟", revealed: [0, 1] },
    { word: "shop", emoji: "🏪", revealed: [0, 1] },
    { word: "thin", emoji: "📏", revealed: [0, 1] },
  ],
  // Lv8 — 4-letter words, harder blanks
  [
    { word: "jump", emoji: "🦘", revealed: [0] },
    { word: "milk", emoji: "🥛", revealed: [0] },
    { word: "nest", emoji: "🪺", revealed: [0] },
    { word: "wind", emoji: "💨", revealed: [0] },
    { word: "gift", emoji: "🎁", revealed: [0] },
  ],
  // Lv9 — longer words
  [
    { word: "train", emoji: "🚂", revealed: [0, 1] },
    { word: "plant", emoji: "🌱", revealed: [0, 1] },
    { word: "sweet", emoji: "🍬", revealed: [0, 1] },
    { word: "cloud", emoji: "☁️", revealed: [0, 1] },
    { word: "beach", emoji: "🏖️", revealed: [0, 1] },
  ],
  // Lv10 — champion mix
  [
    { word: "brush", emoji: "🖌️", revealed: [0, 1] },
    { word: "grape", emoji: "🍇", revealed: [0] },
    { word: "storm", emoji: "⛈️", revealed: [0, 1] },
    { word: "shine", emoji: "✨", revealed: [0, 4] },
    { word: "dream", emoji: "💭", revealed: [0] },
  ],
];

const PASS_SCORE = 4;
const QUESTIONS_PER_LEVEL = 5;

// ---------- Utils ----------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- Audio ----------
class SoundPlayer {
  constructor() {
    this.enabled = true;
    this.synth = window.speechSynthesis;
    this.voices = [];
    this._loadVoices();
    if (this.synth) {
      this.synth.onvoiceschanged = () => this._loadVoices();
    }
  }

  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices().filter((v) => v.lang.startsWith("en"));
  }

  _bestVoice() {
    return (
      this.voices.find((v) => v.name.includes("Samantha")) ||
      this.voices.find((v) => v.lang === "en-US") ||
      this.voices[0]
    );
  }

  speakWord(word) {
    if (!this.synth || !this.enabled) return;
    this.synth.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.82;
    u.pitch = 1.05;
    const voice = this._bestVoice();
    if (voice) u.voice = voice;
    this.synth.speak(u);
  }

  playTone(freq, dur = 0.12, type = "sine") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* no audio */
    }
  }

  correct() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 0.1), i * 80));
  }

  wrong() {
    this.playTone(220, 0.25, "sawtooth");
  }

  levelUp() {
    [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.playTone(f, 0.14), i * 100));
  }
}

// ---------- Confetti ----------
class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.running = false;
    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 80) {
    const colors = ["#fdcb6e", "#e17055", "#00b894", "#6c5ce7", "#fd79a8", "#74b9ff"];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: this.canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -12 - 4,
        r: Math.random() * 6 + 3,
        color: pick(colors),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }
    if (!this.running) {
      this.running = true;
      this._loop();
    }
  }

  _loop() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.life -= 0.012;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (this.particles.length > 0) {
      requestAnimationFrame(() => this._loop());
    } else {
      this.running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

// ---------- Progress ----------
class ProgressStore {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {
      unlockedLevel: 1,
      stars: {}, // level -> 0-3
      totalStars: 0,
      streak: 0,
      lastPlayDate: null,
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }

  getStars(level) {
    return this.data.stars[level] || 0;
  }

  setStars(level, stars) {
    const prev = this.getStars(level);
    if (stars > prev) {
      this.data.stars[level] = stars;
      this.data.totalStars = Object.values(this.data.stars).reduce((a, b) => a + b, 0);
    }
    if (level >= this.data.unlockedLevel && stars >= 2) {
      this.data.unlockedLevel = Math.min(10, level + 1);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (this.data.lastPlayDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      this.data.streak = this.data.lastPlayDate === yStr ? this.data.streak + 1 : 1;
      this.data.lastPlayDate = today;
    }
    this.save();
  }

  isUnlocked(level) {
    return level <= this.data.unlockedLevel;
  }
}

// ---------- Letter bank helpers ----------
function blankIndices(word, revealed) {
  const rev = new Set(revealed);
  const blanks = [];
  for (let i = 0; i < word.length; i++) {
    if (!rev.has(i)) blanks.push(i);
  }
  return blanks;
}

function buildLetterBank(word, revealed) {
  const blanks = blankIndices(word, revealed);
  const needed = blanks.map((i) => word[i]);
  const distractorPool = "aeioubcdfghjklmnpqrstvwxyz".split("");
  const extras = [];
  const used = new Set(needed);
  while (extras.length < Math.min(4, 8 - needed.length)) {
    const c = pick(distractorPool);
    if (!used.has(c)) {
      used.add(c);
      extras.push(c);
    }
  }
  return shuffle([...needed, ...extras]).map((ch, i) => ({ id: i, ch, used: false }));
}

// ---------- App ----------
class PhonicsQuest {
  constructor() {
    this.store = new ProgressStore();
    this.sound = new SoundPlayer();
    this.confetti = new Confetti(document.getElementById("confetti"));

    this.currentLevel = 1;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.sessionStars = 0;
    this.questions = [];
    this.currentQ = null;
    this.filled = {}; // blankIndex -> letter
    this.letterBank = [];
    this.locked = false;

    this._bindDOM();
    this._renderHome();
  }

  _bindDOM() {
    this.el = {
      screens: {
        home: document.getElementById("screen-home"),
        quiz: document.getElementById("screen-quiz"),
        result: document.getElementById("screen-result"),
      },
      totalStars: document.getElementById("total-stars"),
      streak: document.getElementById("streak"),
      levelMap: document.getElementById("level-map"),
      levelLabel: document.getElementById("level-label"),
      progressDots: document.getElementById("progress-dots"),
      quizScore: document.getElementById("quiz-score"),
      wordEmoji: document.getElementById("word-emoji"),
      levelHint: document.getElementById("level-hint"),
      wordDisplay: document.getElementById("word-display"),
      letterBank: document.getElementById("letter-bank"),
      feedback: document.getElementById("feedback"),
      resultEmoji: document.getElementById("result-emoji"),
      resultTitle: document.getElementById("result-title"),
      resultStars: document.getElementById("result-stars"),
      resultMessage: document.getElementById("result-message"),
    };

    document.getElementById("btn-back").addEventListener("click", () => this._showScreen("home"));
    document.getElementById("btn-sound").addEventListener("click", () => this._playCurrentWord());
    document.getElementById("btn-clear").addEventListener("click", () => this._clearAnswer());
    document.getElementById("btn-check").addEventListener("click", () => this._checkAnswer());
    document.getElementById("btn-retry").addEventListener("click", () => this._startLevel(this.currentLevel));
    document.getElementById("btn-next").addEventListener("click", () => {
      if (this.currentLevel < 10) this._startLevel(this.currentLevel + 1);
      else this._showScreen("home");
    });
    document.getElementById("btn-home").addEventListener("click", () => this._showScreen("home"));
  }

  _showScreen(name) {
    Object.entries(this.el.screens).forEach(([k, el]) => {
      el.classList.toggle("active", k === name);
    });
    if (name === "home") this._renderHome();
  }

  _renderHome() {
    const { data } = this.store;
    this.el.totalStars.textContent = data.totalStars;
    this.el.streak.textContent = data.streak;

    this.el.levelMap.innerHTML = "";
    for (let lv = 1; lv <= 10; lv++) {
      const meta = LEVEL_META[lv - 1];
      const stars = this.store.getStars(lv);
      const unlocked = this.store.isUnlocked(lv);
      const btn = document.createElement("button");
      btn.className = "level-node" + (unlocked ? "" : " locked");
      btn.setAttribute("role", "listitem");
      btn.innerHTML = `
        <span class="level-num">${lv}</span>
        <span class="level-emoji">${meta.emoji}</span>
        <span class="level-name">${meta.name}</span>
        <span class="level-stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>
      `;
      if (unlocked) {
        btn.addEventListener("click", () => this._startLevel(lv));
      }
      this.el.levelMap.appendChild(btn);
    }
  }

  _startLevel(level) {
    if (!this.store.isUnlocked(level)) return;
    this.currentLevel = level;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.sessionStars = 0;
    this.questions = shuffle(LEVELS[level - 1].slice());
    this.locked = false;

    const meta = LEVEL_META[level - 1];
    this.el.levelLabel.textContent = `Level ${level} · ${meta.name}`;
    this.el.levelHint.textContent = meta.hint;
    this.el.quizScore.textContent = "0";

    this._renderProgressDots();
    this._showScreen("quiz");
    this._loadQuestion();
  }

  _renderProgressDots() {
    this.el.progressDots.innerHTML = "";
    for (let i = 0; i < QUESTIONS_PER_LEVEL; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < this.questionIndex ? " done" : i === this.questionIndex ? " current" : "");
      this.el.progressDots.appendChild(dot);
    }
  }

  _loadQuestion() {
    this.currentQ = this.questions[this.questionIndex];
    this.filled = {};
    this.locked = false;
    this.letterBank = buildLetterBank(this.currentQ.word, this.currentQ.revealed);

    this.el.wordEmoji.textContent = this.currentQ.emoji;
    this._renderWordDisplay();
    this._renderLetterBank();
    this._hideFeedback();
    document.getElementById("btn-check").disabled = true;

    setTimeout(() => this._playCurrentWord(), 400);
  }

  _playCurrentWord() {
    if (this.currentQ) this.sound.speakWord(this.currentQ.word);
  }

  _renderWordDisplay() {
    const { word, revealed } = this.currentQ;
    const rev = new Set(revealed);
    this.el.wordDisplay.innerHTML = "";

    for (let i = 0; i < word.length; i++) {
      const slot = document.createElement("span");
      if (rev.has(i)) {
        slot.className = "letter-slot revealed";
        slot.textContent = word[i].toUpperCase();
      } else {
        slot.className = "letter-slot blank" + (this.filled[i] ? " filled" : "");
        slot.dataset.index = String(i);
        slot.textContent = this.filled[i] ? this.filled[i].toUpperCase() : "_";
        if (this.filled[i]) {
          slot.addEventListener("click", () => this._removeLetter(i));
        }
      }
      this.el.wordDisplay.appendChild(slot);
    }
  }

  _renderLetterBank() {
    this.el.letterBank.innerHTML = "";
    this.letterBank.forEach((tile) => {
      const btn = document.createElement("button");
      btn.className = "letter-tile" + (tile.used ? " used" : "");
      btn.textContent = tile.ch.toUpperCase();
      btn.disabled = tile.used || this.locked;
      btn.addEventListener("click", () => this._placeLetter(tile));
      this.el.letterBank.appendChild(btn);
    });
  }

  _placeLetter(tile) {
    if (tile.used || this.locked) return;
    const blanks = blankIndices(this.currentQ.word, this.currentQ.revealed);
    const nextBlank = blanks.find((i) => !this.filled[i]);
    if (nextBlank === undefined) return;

    this.filled[nextBlank] = tile.ch;
    tile.used = true;
    this._renderWordDisplay();
    this._renderLetterBank();
    this._updateCheckButton();
  }

  _removeLetter(index) {
    if (this.locked) return;
    const ch = this.filled[index];
    if (!ch) return;
    delete this.filled[index];
    const tile = this.letterBank.find((t) => t.ch === ch && t.used);
    if (tile) tile.used = false;
    this._renderWordDisplay();
    this._renderLetterBank();
    this._updateCheckButton();
  }

  _clearAnswer() {
    if (this.locked) return;
    this.filled = {};
    this.letterBank.forEach((t) => (t.used = false));
    this._renderWordDisplay();
    this._renderLetterBank();
    this._updateCheckButton();
  }

  _updateCheckButton() {
    const blanks = blankIndices(this.currentQ.word, this.currentQ.revealed);
    const complete = blanks.every((i) => this.filled[i]);
    document.getElementById("btn-check").disabled = !complete;
  }

  _checkAnswer() {
    if (this.locked) return;
    this.locked = true;

    const { word } = this.currentQ;
    const blanks = blankIndices(word, this.currentQ.revealed);
    const correct = blanks.every((i) => this.filled[i] === word[i]);

    const fb = this.el.feedback;
    fb.classList.remove("hidden", "ok", "no");

    if (correct) {
      this.correctCount++;
      this.sessionStars++;
      this.el.quizScore.textContent = String(this.correctCount);
      fb.classList.add("ok");
      fb.textContent = pick(["완벽해요! 🌟", "잘했어요! 👏", "대단해요! 🎉", "멋져요! ⭐"]);
      this.sound.correct();
      this.confetti.burst(40);
    } else {
      fb.classList.add("no");
      fb.textContent = `아쉬워요! 정답은 ${word.toUpperCase()} 예요`;
      this.sound.wrong();
      // show correct word briefly
      blanks.forEach((i) => {
        this.filled[i] = word[i];
      });
      this._renderWordDisplay();
    }

    this._renderLetterBank();
    document.getElementById("btn-check").disabled = true;

    setTimeout(() => this._nextQuestion(), correct ? 1400 : 2200);
  }

  _hideFeedback() {
    this.el.feedback.classList.add("hidden");
  }

  _nextQuestion() {
    this.questionIndex++;
    if (this.questionIndex >= QUESTIONS_PER_LEVEL) {
      this._showResult();
    } else {
      this._renderProgressDots();
      this._loadQuestion();
    }
  }

  _showResult() {
    const passed = this.correctCount >= PASS_SCORE;
    let stars = 0;
    if (this.correctCount >= 5) stars = 3;
    else if (this.correctCount >= 4) stars = 2;
    else if (this.correctCount >= 3) stars = 1;

    if (passed) {
      this.store.setStars(this.currentLevel, stars);
      this.sound.levelUp();
      this.confetti.burst(100);
    }

    const meta = LEVEL_META[this.currentLevel - 1];
    this.el.resultEmoji.textContent = passed ? "🎉" : "💪";
    this.el.resultTitle.textContent = passed ? "레벨 클리어!" : "다시 도전!";
    this.el.resultStars.innerHTML = "★".repeat(stars) + "☆".repeat(3 - stars);

    const msgs = passed
      ? [
          `${meta.name} 정복! ${this.correctCount}/${QUESTIONS_PER_LEVEL} 맞췄어요!`,
          `훌륭해요! 다음 모험이 열렸어요!`,
        ]
      : [`${PASS_SCORE}개 이상 맞춰야 다음 레벨이 열려요. (${this.correctCount}/${QUESTIONS_PER_LEVEL})`];
    this.el.resultMessage.textContent = pick(msgs);

    document.getElementById("btn-next").style.display =
      passed && this.currentLevel < 10 ? "inline-flex" : "none";
    document.getElementById("btn-next").textContent =
      passed && this.currentLevel < 10 ? `Level ${this.currentLevel + 1} →` : "다음 레벨 →";

    this._showScreen("result");
  }
}

window.addEventListener("load", () => {
  window.app = new PhonicsQuest();
});
