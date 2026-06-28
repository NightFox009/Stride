// Loot: equippable items that drop in the dungeon. Each item has a rarity (which
// scales its bonus), a slot (weapon / armor / accessory), and 1-3 stat bonuses
// that fold into combat stats when equipped. Drop quality rises with floor depth
// and the player's Luck ("magic find").

import { STATS } from "./stats.js";

export const SLOTS = ["weapon", "armor", "accessory"];

// Skewed hard toward common; legendary is exceptionally scarce, so a good drop
// feels like a real achievement.
export const RARITIES = {
  common:    { id: "common", name: "Common", mult: 1.0, stats: 1, weight: 72, color: "#9aa7b4" },
  uncommon:  { id: "uncommon", name: "Uncommon", mult: 1.6, stats: 2, weight: 20, color: "#5ad1a0" },
  rare:      { id: "rare", name: "Rare", mult: 2.5, stats: 2, weight: 6, color: "#6ea8fe" },
  epic:      { id: "epic", name: "Epic", mult: 3.8, stats: 3, weight: 1.8, color: "#c792ea" },
  legendary: { id: "legendary", name: "Legendary", mult: 5.5, stats: 3, weight: 0.2, color: "#e3b341" },
};

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

// Base item names per slot (a random one is chosen for flavor).
const SLOT_NAMES = {
  weapon: ["Sword", "Axe", "Bow", "Staff", "Spear", "Dagger", "Mace"],
  armor: ["Mail", "Plate", "Robe", "Hauberk", "Cuirass", "Garb"],
  accessory: ["Ring", "Amulet", "Charm", "Band", "Talisman", "Pendant"],
};

// Chance that clearing a floor of this type drops an item at all — low, so most
// floors give none. Bosses are the reliable source.
export function dropChance(floorType) {
  return { combat: 0.15, elite: 0.35, boss: 1.0, treasure: 0.6 }[floorType] || 0;
}

// Weighted rarity roll, shifted toward rarer tiers by depth + Luck ("magic
// find") plus a per-source bonus (bosses/elites yield better quality). Kept
// gentle so legendary stays scarce even deep and lucky.
function rollRarity(rng, floor, luck, bonusFind = 0) {
  const find = floor * 0.3 + luck * 0.2 + bonusFind; // percentage-point shift
  const weights = {
    common: Math.max(8, RARITIES.common.weight - find),
    uncommon: RARITIES.uncommon.weight + find * 0.55,
    rare: RARITIES.rare.weight + find * 0.3,
    epic: RARITIES.epic.weight + find * 0.12,
    legendary: RARITIES.legendary.weight + find * 0.03,
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

// Generate one item appropriate to a floor (item level ≈ floor). bonusFind
// raises the quality (used by boss/elite drops).
export function generateItem(floor, luck, rng, bonusFind = 0) {
  const rarityId = rollRarity(rng, floor, luck, bonusFind);
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
    base: baseName, // slot base noun, kept so rarity crafting can rename cleanly
    name: `${rarity.name} ${baseName}`,
    level: floor, // item level ≈ floor found (sets stat magnitude)
    upgrade: 0, // +0..+30 enhancement level
    mods, // BASE stat bonuses; scaled by upgrade via itemMods()
  };
}

// Enhancement multiplier: +4% of base stats per upgrade level (so +30 ≈ ×2.2).
export function itemPower(item) {
  return 1 + 0.04 * (item.upgrade || 0);
}

// An item's effective stat bonuses after its upgrade level.
export function itemMods(item) {
  const f = itemPower(item);
  const out = {};
  for (const [k, v] of Object.entries(item.mods || {})) out[k] = Math.round(v * f);
  return out;
}

// Roll the loot dropped by clearing a floor (at most one item). Bosses and
// elites grant a quality bonus so their drops are worth the fight.
export function rollLoot(floorType, floor, luck, rng) {
  const chance = dropChance(floorType);
  if (chance <= 0 || rng.next() >= chance) return [];
  const bonusFind = floorType === "boss" ? 22 : floorType === "elite" ? 8 : 0;
  return [generateItem(floor, luck, rng, bonusFind)];
}

// Total stat bonuses from a set of equipped items (an { slot: item } map),
// including each item's upgrade level.
export function equipmentMods(equipment = {}) {
  const total = {};
  for (const slot of SLOTS) {
    const it = equipment[slot];
    if (it) for (const [k, v] of Object.entries(itemMods(it))) total[k] = (total[k] || 0) + v;
  }
  return total;
}
