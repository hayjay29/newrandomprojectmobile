(() => {
  "use strict";

  const GEN_RANGES = {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    all: [1, 1025],
  };

  const DIFF_HINTS = {
    easy: "컬러 이미지 · 번호 표시",
    normal: "컬러 이미지 · 번호 숨김",
    hard: "실루엣 · 번호 숨김",
  };

  const LIVES_MAX = 3;
  const BASE_SCORE = 10;
  const STREAK_BONUS = 5;
  const ANSWER_DELAY = 1200;
  const STORAGE_KEY = "pokemon-guess-best";

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
    bestScore: $("#best-score"),
    diffHint: $("#diff-hint"),
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

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function getBestScore() {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  }

  function saveBestScore(val) {
    localStorage.setItem(STORAGE_KEY, String(val));
  }

  function updateBestDisplay() {
    els.bestScore.textContent = getBestScore();
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
      const points = BASE_SCORE + (streak - 1) * STREAK_BONUS;
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
    const best = getBestScore();
    const isNewRecord = score > best;

    if (isNewRecord) {
      saveBestScore(score);
      updateBestDisplay();
    }

    els.finalScore.textContent = score;
    els.finalCorrect.textContent = correctCount;
    els.finalStreak.textContent = maxStreak;
    els.newRecord.classList.toggle("hidden", !isNewRecord);

    showScreen("gameover");
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

  updateBestDisplay();
})();
