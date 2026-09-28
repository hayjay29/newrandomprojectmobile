// =============================================================
//  Bag: SPACE is the firm limit, WEIGHT can be exceeded
//  (overload slows you and makes noise). Coins stack in a purse.
// =============================================================
import { BAGS, COINS, UPGRADES } from "./config.js";

export class Inventory {
  constructor(state) {
    this.state = state; // shared progression state (bag level, upgrades)
    this.items = []; // carried non-coin items
    this.coins = 0;
  }

  get bag() {
    return BAGS[this.state.bag];
  }

  get spaceCap() {
    return this.bag.space;
  }

  get weightCap() {
    return this.bag.weight * UPGRADES.strength.values[this.state.upgrades.strength];
  }

  get spaceUsed() {
    let s = this.coins * COINS.spacePer;
    for (const it of this.items) s += it.space;
    return s;
  }

  get weightUsed() {
    let w = this.coins * COINS.weightPer;
    for (const it of this.items) w += it.weight;
    return w;
  }

  get overload() {
    return Math.max(0, this.weightUsed / this.weightCap - 1);
  }

  get freeSpace() {
    return Math.max(0, this.spaceCap - this.spaceUsed);
  }

  // Hard stop at double the weight limit: you physically can't lift more.
  canTake(space, weight) {
    if (space > this.freeSpace + 1e-6) return "space";
    if (this.weightUsed + weight > this.weightCap * 2) return "weight";
    return null;
  }

  addItem(entry) {
    this.items.push(entry);
  }

  addCoins(n) {
    this.coins += n;
  }

  totalValue() {
    let v = this.coins;
    for (const it of this.items) v += it.value;
    return v;
  }

  clear() {
    this.items = [];
    this.coins = 0;
  }

  // Group the haul the way the Merchant pays out.
  summary() {
    const cats = new Map();
    if (this.coins) cats.set("Coins", { value: this.coins, count: this.coins });
    const specials = [];
    for (const it of this.items) {
      if (it.special) {
        specials.push(it);
        continue;
      }
      const c = cats.get(it.cat) || { value: 0, count: 0 };
      c.value += it.value;
      c.count += 1;
      cats.set(it.cat, c);
    }
    return { cats, specials };
  }
}
