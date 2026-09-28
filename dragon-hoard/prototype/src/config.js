// =============================================================
//  Dragon Hoard — Prototype 0.1 tuning
//  Every number here is a placeholder meant to be changed after
//  playtesting. Nothing in this file is locked design.
// =============================================================

export const WORLD = {
  seed: 1337,
  gridSize: 64, // metres covered by the hoard heightfield (square)
  cell: 0.5, // metres per heightfield cell
  roomRadius: 30.5, // walkable radius of the chamber
  hoardRadius: 28, // treasure never piles past this radius
  entrance: { x: 0, z: 29.2 }, // the tunnel back to camp
  exitRadius: 2.4,
  start: { x: 0, z: 26.5 },
};

// The hoard is made only of items. Each 0.5 m column of the grid is a
// stack of layers; each layer holds a few real items. Only the top layer
// of each column exists as objects.
export const TREASURE = {
  layer: 0.15, // metres of pile per layer
  itemsPerLayer: [2, 3], // min / max items in one layer of one column
  maxStep: 3, // layers a column may stand above a neighbour before it slides
};

export const PLAYER = {
  eyeHeight: 1.62,
  walkSpeed: 4.2,
  sprintSpeed: 6.8,
  treasureWadeMult: 0.8, // walking on loose treasure is slower
  reach: 3.3, // metres for grab / dig
  lookSensitivity: 0.0022,
  touchLookSensitivity: 0.0048,
};

// Space is the firm limit. Weight can be exceeded (overload).
export const BAGS = [
  { id: "pouch", name: "Tiny Pouch", space: 6, weight: 10, cost: 0,
    blurb: "Barely holds a fistful." },
  { id: "explorer", name: "Explorer Pack", space: 14, weight: 20, cost: 250,
    blurb: "A proper pack. More than double the room." },
  { id: "reinforced", name: "Reinforced Pack", space: 26, weight: 40, cost: 1500,
    blurb: "Stitched leather and iron rings. Built for armour." },
  { id: "hauler", name: "Hauler Pack", space: 50, weight: 70, cost: 12000,
    blurb: "A frame pack for serious expeditions." },
  { id: "holding", name: "Bag of Holding", space: 250, weight: 150, cost: 1000000,
    blurb: "Legendary. The inside is larger than the outside." },
];

// Levelled upgrades. costs[i] buys level i+1. values[level] is the effect.
export const UPGRADES = {
  handling: {
    name: "Nimble Gloves",
    desc: "Grab and pull items free faster.",
    costs: [120, 700, 4000, 22000],
    values: [1, 0.7, 0.5, 0.36, 0.25], // pickup-time multiplier
    fmt: (v) => `${Math.round((1 / v) * 100)}% grab speed`,
  },
  shovel: {
    name: "Shovel",
    tiers: ["Bare Hands", "Coin Scoop", "Hoard Shovel", "Excavator's Rake", "Delver's Spade"],
    desc: "Toss more treasure aside in one go. Bigger scoops are louder.",
    costs: [200, 1200, 7000, 35000],
    values: [1, 2, 3, 5, 8], // items moved per toss
    fmt: (v) => (v === 1 ? "1 item per toss" : `${v} items per toss`),
  },
  strength: {
    name: "Strength Training",
    desc: "Carry more weight before you're overloaded.",
    costs: [150, 900, 5000, 25000],
    values: [1, 1.25, 1.55, 1.9, 2.4], // carry-weight multiplier
    fmt: (v) => `${v}x carry weight`,
  },
  boots: {
    name: "Delver's Boots",
    desc: "Move faster, loaded or not.",
    costs: [300, 2200, 14000],
    values: [1, 1.15, 1.3, 1.45],
    fmt: (v) => `${Math.round(v * 100)}% move speed`,
  },
  appraisal: {
    name: "Appraisal Glasses",
    desc: "See exact values. Tell real gems from glass.",
    costs: [400],
    values: [0, 1],
    fmt: (v) => (v ? "Exact appraisal" : "Rough guesses"),
  },
};

export const COINS = {
  spacePer: 1 / 25, // 25 coins per 1 space: bulky for their value
  weightPer: 0.02, // kg per coin
};

export const TOSS = {
  time: 0.4, // seconds of hold per toss (scaled by Nimble Gloves)
  reach: 0.8, // extra items for a bigger shovel come from this radius
  distance: 2.3, // how far to the side items land
  flight: 0.45,
};

export const TELEKINESIS = {
  range: 9,
  maxSpace: 1,
  maxWeight: 1.5,
  flyTime: 0.45,
};

export const DISTURBANCE = {
  max: 100,
  decayPerSec: 2.6,
  decayDelay: 1.8, // seconds of quiet before it starts to fall
  tossBase: 0.6, // per tossed item, plus 60% of the item's own noise
  overloadMovePerSec: 3.5,
  sprintPerSec: 0.8,
  warn: 40,
  danger: 70,
  escapeTime: 28, // seconds to get out once the dragon wakes
};

// Sale categories shown on the return-to-camp summary.
export const CATEGORIES = [
  "Coins",
  "Jewelry",
  "Gems",
  "Tableware",
  "Weapons & Armor",
  "Art & Relics",
  "Misc",
];
