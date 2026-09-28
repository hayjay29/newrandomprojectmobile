// =============================================================
//  DOM UI: minimal in-den HUD (design doc 102) and the camp screen
//  with the sale summary (23) and Merchant (43).
// =============================================================
const $ = (id) => document.getElementById(id);
export const fmt = (n) => Math.round(n).toLocaleString("en-US");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export class UI {
  constructor() {
    this.el = {
      hud: $("hud"), gold: $("hud-gold"), bagName: $("hud-bagname"), haul: $("hud-haul"),
      barSpace: $("bar-space"), txtSpace: $("txt-space"),
      barWeight: $("bar-weight"), txtWeight: $("txt-weight"),
      over: $("hud-over"), barDist: $("bar-dist"),
      cross: $("crosshair"), ring: $("hold-ring"),
      prompt: $("prompt"), promptMain: $("prompt-main"), promptSub: $("prompt-sub"),
      toasts: $("toasts"), danger: $("danger-banner"), dangerTime: $("danger-time"),
      vignette: $("vignette"), flash: $("flash"),
    };
    this.lastPrompt = "";
    this.ringLen = 2 * Math.PI * 17;
  }

  show(id, on = true) {
    $(id).hidden = !on;
  }

  hud(d) {
    const e = this.el;
    e.gold.textContent = fmt(d.gold);
    e.bagName.textContent = d.bagName;
    e.haul.textContent = d.haul;
    const sp = d.spaceUsed / d.spaceCap;
    e.barSpace.style.width = `${Math.min(100, sp * 100)}%`;
    e.barSpace.classList.toggle("full", sp >= 0.999);
    e.txtSpace.textContent = `${d.spaceUsed.toFixed(1)} / ${d.spaceCap}`;
    const wt = d.weightUsed / d.weightCap;
    e.barWeight.style.width = `${Math.min(100, wt * 100)}%`;
    e.barWeight.classList.toggle("full", wt > 1);
    e.txtWeight.textContent = `${d.weightUsed.toFixed(1)} / ${Math.round(d.weightCap)} kg`;
    e.over.hidden = !(wt > 1);
    e.barDist.style.width = `${Math.min(100, d.disturbance)}%`;
  }

  prompt(main, sub = "") {
    const key = main + "|" + sub;
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    if (!main) {
      this.el.prompt.hidden = true;
      this.el.cross.classList.remove("active");
      return;
    }
    this.el.prompt.hidden = false;
    this.el.cross.classList.add("active");
    this.el.promptMain.innerHTML = main;
    this.el.promptSub.innerHTML = sub;
  }

  hold(frac) {
    this.el.ring.style.strokeDashoffset = `${this.ringLen * (1 - Math.min(1, frac))}`;
  }

  toast(text, kind = "") {
    const t = document.createElement("div");
    t.className = `toast ${kind}`;
    t.textContent = text;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 3300);
  }

  danger(on, seconds = 0) {
    this.el.danger.hidden = !on;
    this.el.vignette.classList.toggle("danger", on);
    if (on) this.el.dangerTime.textContent = Math.max(0, Math.ceil(seconds));
  }

  flash(color = "#ffb060", ms = 250) {
    const f = this.el.flash;
    f.style.background = color;
    f.style.transition = "none";
    f.style.opacity = "0.85";
    requestAnimationFrame(() => {
      f.style.transition = `opacity ${ms}ms ease`;
      f.style.opacity = "0";
    });
  }

  // ---------- camp ----------
  camp(d, onBuy) {
    $("camp-eyebrow").textContent = d.eyebrow;
    $("camp-title").textContent = d.title;
    $("camp-gold").textContent = fmt(d.gold);

    const rows = d.rows
      .map((r) => `<div class="lrow"><span>${esc(r.cat)}<span class="c">${r.cat === "Coins" ? "" : `× ${r.count}`}</span></span><span class="v">${fmt(r.value)}g</span></div>`)
      .join("");
    $("ledger-rows").innerHTML = d.rows.length
      ? rows + `<div class="lrow total"><span>Total</span><span class="v">${fmt(d.total)}g</span></div>`
      : `<p class="empty">${esc(d.emptyText)}</p>`;

    $("ledger-special").innerHTML = d.specials
      .map((s) => `<div class="special-card"><div class="k">${esc(s.kind)}</div><div class="n">${esc(s.name)}</div><p>${esc(s.text)}</p></div>`)
      .join("");

    $("ledger-stats").innerHTML = d.stats
      .map((s) => `<div class="stat"><span class="lbl">${esc(s.label)}</span><span class="v">${esc(s.value)}</span></div>`)
      .join("");

    $("shop-list").innerHTML = d.shop
      .map((s) => {
        const cls = ["item-row", s.dream ? "dream" : "", s.maxed ? "maxed" : ""].join(" ");
        const btn = s.maxed
          ? `<button class="buy" type="button" disabled>Owned</button>`
          : `<button class="buy" type="button" data-key="${s.key}" ${s.afford ? "" : "disabled"}>${fmt(s.cost)}g${s.afford ? "" : `<span class="need">need ${fmt(s.cost - d.gold)} more</span>`}</button>`;
        return `<div class="${cls}">
          <div class="name">${esc(s.name)}${s.tier ? `<span class="tier">${esc(s.tier)}</span>` : ""}</div>
          ${btn}
          <div class="desc">${esc(s.desc)}</div>
          <div class="fx">${s.fx}</div>
        </div>`;
      })
      .join("");
    for (const b of $("shop-list").querySelectorAll("button[data-key]")) {
      b.addEventListener("click", () => onBuy(b.dataset.key));
    }
  }
}
