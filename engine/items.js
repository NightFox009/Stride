// Loot: equippable items that drop in the dungeon. Each item has a rarity (which
// scales its bonus), a slot (weapon / armor / accessory), and 1-3 stat bonuses
// that fold into combat stats when equipped. Drop quality rises with floor depth
// and the player's Luck ("magic find").

import { STATS } from "./stats.js";

export const SLOTS = ["weapon", "armor", "accessory"];

export const RARITIES = {
  common:    { id: "common", name: "Common", mult: 1.0, stats: 1, weight: 64, color: "#9aa7b4" },
  uncommon:  { id: "uncommon", name: "Uncommon", mult: 1.6, stats: 2, weight: 24, color: "#5ad1a0" },
  rare:      { id: "rare", name: "Rare", mult: 2.4, stats: 2, weight: 9, color: "#6ea8fe" },
  epic:      { id: "epic", name: "Epic", mult: 3.5, stats: 3, weight: 2.5, color: "#c792ea" },
  legendary: { id: "legendary", name: "Legendary", mult: 5.0, stats: 3, weight: 0.5, color: "#e3b341" },
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

// Base item names per slot (a random one is chosen for flavor).
const SLOT_NAMES = {
  weapon: ["Sword", "Axe", "Bow", "Staff", "Spear", "Dagger", "Mace"],
  armor: ["Mail", "Plate", "Robe", "Hauberk", "Cuirass", "Garb"],
  accessory: ["Ring", "Amulet", "Charm", "Band", "Talisman", "Pendant"],
};

// Chance that clearing a floor of this type drops an item (boss rolls twice).
export function dropChance(floorType) {
  return { combat: 0.5, elite: 0.8, boss: 1.0, treasure: 1.0 }[floorType] || 0;
}

// Weighted rarity roll, shifted toward rarer tiers by depth + Luck ("magic
// find"): commons get rarer, the high tiers get more likely.
function rollRarity(rng, floor, luck) {
  const find = floor * 0.5 + luck * 0.3; // percentage-point shift
  const weights = {
    common: Math.max(5, RARITIES.common.weight - find),
    uncommon: RARITIES.uncommon.weight + find * 0.5,
    rare: RARITIES.rare.weight + find * 0.3,
    epic: RARITIES.epic.weight + find * 0.15,
    legendary: RARITIES.legendary.weight + find * 0.05,
  };
  const total = RARITY_ORDER.reduce((s, r) => s + weights[r], 0);
  let roll = rng.next() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r];
    if (roll <= 0) return r;
  }
  return "common";
}

let counter = 0;
function uid() {
  counter += 1;
  return `it_${Date.now().toString(36)}_${counter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Generate one item appropriate to a floor (item level ≈ floor).
export function generateItem(floor, luck, rng) {
  const rarityId = rollRarity(rng, floor, luck);
  const rarity = RARITIES[rarityId];
  const slot = rng.pick(SLOTS);

  // Per-stat magnitude scales with depth and rarity. Tunable.
  const base = 2 + Math.floor(floor * 0.4);
  const pool = [...STATS];
  const mods = {};
  for (let i = 0; i < rarity.stats && pool.length; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    const stat = pool.splice(idx, 1)[0];
    const v = Math.max(1, Math.round(base * rarity.mult * (0.8 + rng.next() * 0.4)));
    mods[stat] = v;
  }

  const baseName = rng.pick(SLOT_NAMES[slot]);
  return {
    id: uid(),
    slot,
    rarity: rarityId,
    name: `${rarity.name} ${baseName}`,
    level: floor,
    mods,
  };
}

// Roll the loot dropped by clearing a floor. Returns 0+ items.
export function rollLoot(floorType, floor, luck, rng) {
  const chance = dropChance(floorType);
  if (chance <= 0) return [];
  const rolls = floorType === "boss" ? 2 : 1; // bosses drop twice
  const items = [];
  for (let i = 0; i < rolls; i++) {
    if (rng.next() < chance) items.push(generateItem(floor, luck, rng));
  }
  return items;
}

// Total stat bonuses from a set of equipped items (an { slot: item } map).
export function equipmentMods(equipment = {}) {
  const total = {};
  for (const slot of SLOTS) {
    const it = equipment[slot];
    if (it && it.mods) for (const [k, v] of Object.entries(it.mods)) total[k] = (total[k] || 0) + v;
  }
  return total;
}
