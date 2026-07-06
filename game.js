(() => {
  "use strict";

  const GEN_RANGES = {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    all: [1, 1025],
  };

  const DIFF_HINTS = {
    easy: "컬러 이미지 · 번호 표시 · ×1",
    normal: "컬러 이미지 · 번호 숨김 · ×1.5",
    hard: "실루엣 · 번호 숨김 · ×2",
  };

  const DIFF_LABELS = { easy: "쉬움", normal: "보통", hard: "어려움" };
  const DIFF_MULTIPLIERS = { easy: 1, normal: 1.5, hard: 2 };
  const GEN_LABELS = { 1: "1세대", 2: "2세대", 3: "3세대", all: "전체" };
  const SHARE_URL = "https://brr.kr/17lhxh";

  const LIVES_MAX = 3;
  const BASE_SCORE = 10;
  const STREAK_BONUS = 5;
  const ANSWER_DELAY = 1200;
  const STORAGE_KEY_PREFIX = "pokemon-guess-best-";
  const LEGACY_STORAGE_KEY = "pokemon-guess-best";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    start: $("#start-screen"),
    loading: $("#loading-screen"),
    game: $("#game-screen"),
    gameover: $("#gameover-screen"),
  };

  const els = {
    startBtn: $("#start-btn"),
    retryBtn: $("#retry-btn"),
    menuBtn: $("#menu-btn"),
    loadingText: $("#loading-text"),
    score: $("#score"),
    streak: $("#streak"),
    lives: $("#lives"),
    pokemonImage: $("#pokemon-image"),
    pokemonImageWrap: $("#pokemon-image-wrap"),
    pokemonNumber: $("#pokemon-number"),
    imageLoader: $("#image-loader"),
    choices: $("#choices"),
    feedback: $("#feedback"),
    feedbackText: $("#feedback-text"),
    finalScore: $("#final-score"),
    finalCorrect: $("#final-correct"),
    finalStreak: $("#final-streak"),
    newRecord: $("#new-record"),
    bestEasy: $("#best-easy"),
    bestNormal: $("#best-normal"),
    bestHard: $("#best-hard"),
    diffHint: $("#diff-hint"),
    shareBtn: $("#share-btn"),
    shareModal: $("#share-modal"),
    sharePreview: $("#share-preview"),
    shareConfirmBtn: $("#share-confirm-btn"),
    shareDownloadBtn: $("#share-download-btn"),
    shareCloseBtn: $("#share-close-btn"),
    shareCanvas: $("#share-canvas"),
  };

  let difficulty = "easy";
  let generation = "1";
  let pokemonPool = [];
  let nameCache = {};
  let score = 0;
  let streak = 0;
  let maxStreak = 0;
  let correctCount = 0;
  let lives = LIVES_MAX;
  let currentPokemon = null;
  let answering = false;
  let lastResult = null;
  let shareBlob = null;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    document.body.classList.toggle("in-game", name === "game");
  }

  function getBestScore(diff) {
    return parseInt(localStorage.getItem(STORAGE_KEY_PREFIX + diff) || "0", 10);
  }

  function saveBestScore(diff, val) {
    localStorage.setItem(STORAGE_KEY_PREFIX + diff, String(val));
  }

  function migrateLegacyBest() {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !localStorage.getItem(STORAGE_KEY_PREFIX + "easy")) {
      localStorage.setItem(STORAGE_KEY_PREFIX + "easy", legacy);
    }
  }

  function updateBestDisplay() {
    els.bestEasy.textContent = getBestScore("easy");
    els.bestNormal.textContent = getBestScore("normal");
    els.bestHard.textContent = getBestScore("hard");

    $$(".best-score-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.diff === difficulty);
    });
  }

  function calcPoints(streakCount) {
    const base = BASE_SCORE + (streakCount - 1) * STREAK_BONUS;
    return Math.round(base * DIFF_MULTIPLIERS[difficulty]);
  }

  function buildPool(gen) {
    const [start, end] = GEN_RANGES[gen];
    const pool = [];
    for (let i = start; i <= end; i++) pool.push(i);
    return pool;
  }

  async function fetchKoreanName(id) {
    if (nameCache[id]) return nameCache[id];

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const ko = data.names.find((n) => n.language.name === "ko");
      const name = ko ? ko.name : data.names.find((n) => n.language.name === "en").name;
      nameCache[id] = name;
      return name;
    } catch {
      const fallback = `포켓몬 #${id}`;
      nameCache[id] = fallback;
      return fallback;
    }
  }

  async function preloadNames(pool, onProgress) {
    const batchSize = 20;
    for (let i = 0; i < pool.length; i += batchSize) {
      const batch = pool.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => fetchKoreanName(id)));
      const pct = Math.round(((i + batch.length) / pool.length) * 100);
      onProgress(pct);
    }
  }

  function getImageUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  function getFallbackImageUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  function loadImage(id) {
    return new Promise((resolve) => {
      els.imageLoader.classList.remove("hidden");
      els.pokemonImage.style.opacity = "0";

      const img = new Image();
      img.onload = () => {
        els.pokemonImage.src = img.src;
        els.pokemonImage.style.opacity = "1";
        els.imageLoader.classList.add("hidden");
        resolve();
      };
      img.onerror = () => {
        img.src = getFallbackImageUrl(id);
      };
      img.src = getImageUrl(id);
    });
  }

  function pickRandom(arr, count, exclude) {
    const available = arr.filter((x) => x !== exclude);
    const result = [];
    const copy = [...available];
    for (let i = 0; i < count && copy.length > 0; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderLives() {
    els.lives.innerHTML = "";
    for (let i = 0; i < LIVES_MAX; i++) {
      const heart = document.createElement("span");
      heart.className = "heart" + (i >= lives ? " lost" : "");
      heart.textContent = "❤️";
      els.lives.appendChild(heart);
    }
  }

  function applyDifficultyVisuals() {
    els.pokemonImageWrap.classList.remove("silhouette", "blur");

    if (difficulty === "hard") {
      els.pokemonImageWrap.classList.add("silhouette");
      els.pokemonNumber.classList.add("hidden-num");
    } else if (difficulty === "normal") {
      els.pokemonNumber.classList.add("hidden-num");
    } else {
      els.pokemonNumber.classList.remove("hidden-num");
    }
  }

  async function startRound() {
    answering = false;
    els.feedback.classList.add("hidden");
    els.choices.innerHTML = "";

    const id = pokemonPool[Math.floor(Math.random() * pokemonPool.length)];
    currentPokemon = { id, name: nameCache[id] || (await fetchKoreanName(id)) };

    els.pokemonNumber.textContent = `#${String(id).padStart(3, "0")}`;
    applyDifficultyVisuals();
    await loadImage(id);

    const wrongIds = pickRandom(pokemonPool, 3, id);
    const options = shuffle([
      { id, name: currentPokemon.name },
      ...wrongIds.map((wid) => ({ id: wid, name: nameCache[wid] })),
    ]);

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = opt.name;
      btn.dataset.id = opt.id;
      btn.addEventListener("click", () => handleAnswer(btn, opt.id));
      els.choices.appendChild(btn);
    });
  }

  function handleAnswer(btn, chosenId) {
    if (answering) return;
    answering = true;

    const isCorrect = chosenId === currentPokemon.id;
    const buttons = els.choices.querySelectorAll(".choice-btn");
    buttons.forEach((b) => (b.disabled = true));

    if (isCorrect) {
      btn.classList.add("correct");
      streak++;
      if (streak > maxStreak) maxStreak = streak;
      const points = calcPoints(streak);
      score += points;
      correctCount++;

      els.score.textContent = score;
      els.streak.textContent = streak;

      els.feedback.className = "feedback correct-fb";
      els.feedbackText.textContent =
        streak > 1 ? `정답! +${points}점 (${streak}연속!)` : `정답! +${points}점`;
      els.feedback.classList.remove("hidden");

      setTimeout(() => startRound(), ANSWER_DELAY);
    } else {
      btn.classList.add("wrong");
      buttons.forEach((b) => {
        if (parseInt(b.dataset.id, 10) === currentPokemon.id) b.classList.add("correct");
      });

      streak = 0;
      lives--;
      els.streak.textContent = streak;
      renderLives();

      els.feedback.className = "feedback wrong-fb";
      els.feedbackText.textContent = `틀렸어요! 정답은 ${currentPokemon.name}`;
      els.feedback.classList.remove("hidden");

      if (lives <= 0) {
        setTimeout(() => endGame(), ANSWER_DELAY);
      } else {
        setTimeout(() => startRound(), ANSWER_DELAY);
      }
    }
  }

  function endGame() {
    const best = getBestScore(difficulty);
    const isNewRecord = score > best;

    if (isNewRecord) {
      saveBestScore(difficulty, score);
      updateBestDisplay();
    }

    lastResult = {
      score,
      correctCount,
      maxStreak,
      isNewRecord,
      difficulty,
      generation,
    };

    els.finalScore.textContent = score;
    els.finalCorrect.textContent = correctCount;
    els.finalStreak.textContent = maxStreak;
    els.newRecord.textContent = `🏆 ${DIFF_LABELS[difficulty]} 신기록!`;
    els.newRecord.classList.toggle("hidden", !isNewRecord);

    showScreen("gameover");
  }

  function drawPokeball(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    grad.addColorStop(0, "#e94560");
    grad.addColorStop(0.46, "#e94560");
    grad.addColorStop(0.46, "#333");
    grad.addColorStop(0.54, "#333");
    grad.addColorStop(0.54, "#fff");
    grad.addColorStop(1, "#fff");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = r * 0.1;
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function generateShareImage(result) {
    const W = 600;
    const H = 800;
    const canvas = els.shareCanvas;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a1a2e");
    bg.addColorStop(0.5, "#16213e");
    bg.addColorStop(1, "#0f3460");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawPokeball(ctx, W / 2, 100, 50);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd93d";
    ctx.font = "bold 36px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    ctx.fillText("포켓몬 이름 맞히기", W / 2, 200);

    ctx.fillStyle = "#e94560";
    ctx.font = "bold 28px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    ctx.fillText("게임 종료!", W / 2, 250);

    if (result.isNewRecord) {
      ctx.fillStyle = "#ffd93d";
      ctx.font = "bold 22px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
      ctx.fillText("🏆 신기록 달성!", W / 2, 290);
    }

    const stats = [
      { label: "최종 점수", value: String(result.score) },
      { label: "맞힌 문제", value: String(result.correctCount) },
      { label: "최대 연속", value: String(result.maxStreak) },
    ];

    const cardX = 60;
    const cardW = W - 120;
    let cardY = result.isNewRecord ? 320 : 300;

    stats.forEach((stat) => {
      roundRect(ctx, cardX, cardY, cardW, 70, 14);
      ctx.fillStyle = "rgba(22, 33, 62, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(76, 201, 240, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#a0a0b8";
      ctx.font = "20px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
      ctx.fillText(stat.label, cardX + 24, cardY + 44);

      ctx.textAlign = "right";
      ctx.fillStyle = "#ffd93d";
      ctx.font = "bold 32px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
      ctx.fillText(stat.value, cardX + cardW - 24, cardY + 46);

      cardY += 86;
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#a0a0b8";
    ctx.font = "18px 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
    const diffLabel = DIFF_LABELS[result.difficulty] || result.difficulty;
    const genLabel = GEN_LABELS[result.generation] || result.generation;
    const mult = DIFF_MULTIPLIERS[result.difficulty] || 1;
    ctx.fillText(`${diffLabel} ×${mult} · ${genLabel}`, W / 2, cardY + 30);

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function openShareModal() {
    if (!lastResult) return;

    const canvas = generateShareImage(lastResult);
    els.sharePreview.src = canvas.toDataURL("image/png");

    canvasToBlob(canvas).then((blob) => {
      shareBlob = blob;
    });

    els.shareModal.classList.remove("hidden");
  }

  function closeShareModal() {
    els.shareModal.classList.add("hidden");
    shareBlob = null;
  }

  async function shareImage() {
    if (!shareBlob) return;

    const file = new File([shareBlob], "pokemon-result.png", { type: "image/png" });
    const shareData = {
      title: "포켓몬 이름 맞히기",
      text: `점수 ${lastResult.score}점! 나도 도전해보세요 👉 ${SHARE_URL}`,
      files: [file],
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        closeShareModal();
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    downloadImage();
  }

  function downloadImage() {
    if (!shareBlob) return;

    const url = URL.createObjectURL(shareBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokemon-result-${lastResult.score}점.png`;
    a.click();
    URL.revokeObjectURL(url);
    closeShareModal();
  }

  function resetGameState() {
    score = 0;
    streak = 0;
    maxStreak = 0;
    correctCount = 0;
    lives = LIVES_MAX;
    answering = false;

    els.score.textContent = "0";
    els.streak.textContent = "0";
    renderLives();
  }

  async function startGame() {
    resetGameState();
    showScreen("loading");

    pokemonPool = buildPool(generation);
    els.loadingText.textContent = "포켓몬 이름 불러오는 중... 0%";

    await preloadNames(pokemonPool, (pct) => {
      els.loadingText.textContent = `포켓몬 이름 불러오는 중... ${pct}%`;
    });

    showScreen("game");
    await startRound();
  }

  $$(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".diff-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      difficulty = btn.dataset.diff;
      els.diffHint.textContent = DIFF_HINTS[difficulty];
      updateBestDisplay();
    });
  });

  $$(".gen-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".gen-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      generation = btn.dataset.gen;
    });
  });

  els.startBtn.addEventListener("click", startGame);
  els.retryBtn.addEventListener("click", startGame);
  els.menuBtn.addEventListener("click", () => showScreen("start"));
  els.shareBtn.addEventListener("click", openShareModal);
  els.shareConfirmBtn.addEventListener("click", shareImage);
  els.shareDownloadBtn.addEventListener("click", downloadImage);
  els.shareCloseBtn.addEventListener("click", closeShareModal);
  els.shareModal.querySelector(".share-modal-backdrop").addEventListener("click", closeShareModal);

  migrateLegacyBest();
  updateBestDisplay();
})();
