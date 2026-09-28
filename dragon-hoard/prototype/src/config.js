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
  itemCount: 700, // hidden + visible interactive items inside the mound
  surfaceCoins: 5200, // purely visual instanced coins
  reposeSlope: 0.9, // max height difference per metre before treasure slides
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
  dig: {
    name: "Digging Tool",
    tiers: ["Bare Hands", "Coin Scoop", "Hoard Shovel", "Excavator's Rake", "Delver's Spade"],
    desc: "Excavate treasure faster. Louder tools disturb more.",
    costs: [200, 1200, 7000, 35000],
    values: [1, 1.7, 2.7, 4.2, 6.5], // dig-rate multiplier
    fmt: (v) => `${v}x dig rate`,
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

export const DIG = {
  baseRate: 0.55, // metres/second of lowering at brush centre
  radius: 1.25,
  coinsPerCubicMetre: 110,
  coinSpacePer: 1 / 25, // 25 coins per 1 space: bulky for their value
  coinWeight: 0.02, // kg per coin
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
  digPerSec: 5.5, // scaled by sqrt(dig tool multiplier)
  overloadMovePerSec: 3.5,
  sprintPerSec: 0.8,
  pullBonus: 2.5,
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
