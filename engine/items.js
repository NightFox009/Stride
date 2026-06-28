// Loot: equippable items that drop in the dungeon. Gear is generated themed to
// the player's class — class-named (e.g. "Rogue Gloves"), with a class-specific
// main stat per slot — so every drop is recognisably for you. Rarity scales the
// bonuses; depth + Luck ("magic find") tilt the odds.

import { STATS } from "./stats.js";
import { classWeaponTypes } from "./jobs.js";

// Equip slots, grouped into UI categories.
export const SLOTS = ["weapon", "subweapon", "helm", "armor", "gloves", "boots", "accessory"];
export const CATEGORIES = [
  { id: "weapon", name: "Weapons", slots: ["weapon", "subweapon"] },
  { id: "armor", name: "Armor", slots: ["helm", "armor", "gloves", "boots"] },
  { id: "accessory", name: "Accessories", slots: ["accessory"] },
];

export const RARITIES = {
  common:    { id: "common", name: "Common", mult: 1.0, stats: 1, weight: 72, color: "#9aa7b4" },
  uncommon:  { id: "uncommon", name: "Uncommon", mult: 1.6, stats: 2, weight: 20, color: "#5ad1a0" },
  rare:      { id: "rare", name: "Rare", mult: 2.5, stats: 2, weight: 6, color: "#6ea8fe" },
  epic:      { id: "epic", name: "Epic", mult: 3.8, stats: 3, weight: 1.8, color: "#c792ea" },
  legendary: { id: "legendary", name: "Legendary", mult: 5.5, stats: 3, weight: 0.2, color: "#e3b341" },
};
export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

// Weapon TYPES (a weapon's base noun). Jobs restrict which a class may use.
export const WEAPON_TYPES = [
  "Sword", "Greatsword", "Mace", "Spear", "Hammer", "Staff",
  "Wand", "Bow", "Crossbow", "Dagger", "Fist", "Scepter",
];

// Per-class gear flavour: the set name shown on every piece + the class's
// sub-weapon type.
export const CLASS_GEAR = {
  knight:   { set: "Vanguard", sub: "Shield" },
  sentinel: { set: "Bulwark", sub: "Greatshield" },
  monk:     { set: "Ascetic", sub: "Talisman" },
  ranger:   { set: "Rogue", sub: "Quiver" },
  scholar:  { set: "Sage", sub: "Tome" },
  herald:   { set: "Regal", sub: "Banner" },
};

// SPD is a gear-only stat (not one of the 7 allocatable stats): it adds to
// combat initiative so you act first.
export const SPD_STAT = "SPD";
export function statLabel(stat) {
  return stat === SPD_STAT ? "Speed" : stat;
}

const CLASSES = Object.keys(CLASS_GEAR);
// Pick the class an item is themed for: usually the player's (so suitable gear
// is more common), sometimes another's (off-class loot you can use or trade).
function rollItemClass(rng, playerClass) {
  if (playerClass && rng.next() < 0.72) return playerClass;
  const others = CLASSES.filter((c) => c !== playerClass);
  return others.length ? rng.pick(others) : playerClass || rng.pick(CLASSES);
}

// Per-class main stat for each slot. Gloves grant SPD (Attack/Cast Speed) so
// they decide who strikes first; the rest favour the class's core stats.
export const CLASS_FOCUS = {
  knight:   { weapon: "STR", subweapon: "STR", helm: "VIT", armor: "VIT", gloves: "SPD", boots: "END", accessory: "LUK" },
  sentinel: { weapon: "VIT", subweapon: "VIT", helm: "END", armor: "VIT", gloves: "SPD", boots: "END", accessory: "CHA" },
  monk:     { weapon: "END", subweapon: "END", helm: "VIT", armor: "END", gloves: "SPD", boots: "AGI", accessory: "LUK" },
  ranger:   { weapon: "AGI", subweapon: "AGI", helm: "END", armor: "VIT", gloves: "SPD", boots: "AGI", accessory: "LUK" },
  scholar:  { weapon: "INT", subweapon: "INT", helm: "INT", armor: "VIT", gloves: "SPD", boots: "AGI", accessory: "LUK" },
  herald:   { weapon: "CHA", subweapon: "CHA", helm: "VIT", armor: "VIT", gloves: "SPD", boots: "AGI", accessory: "LUK" },
};

const SLOT_NOUN = { helm: "Helm", armor: "Armor", gloves: "Gloves", boots: "Boots" };
const ACCESSORY_NAMES = ["Ring", "Amulet", "Charm", "Band", "Pendant"];

export function dropChance(floorType) {
  return { combat: 0.15, elite: 0.35, boss: 1.0, treasure: 0.6 }[floorType] || 0;
}

function rollRarity(rng, floor, luck, bonusFind = 0) {
  const find = floor * 0.3 + luck * 0.2 + bonusFind;
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

// Generate one item for a floor. opts: { playerClass, playerWeaponTypes,
// bonusFind }. The item is themed to a class — usually the player's, sometimes
// another's. A player-class weapon is biased to the player's usable types.
export function generateItem(floor, luck, rng, opts = {}) {
  const { playerClass = "knight", playerWeaponTypes = null, bonusFind = 0 } = opts;
  const itemClass = rollItemClass(rng, playerClass);
  const rarityId = rollRarity(rng, floor, luck, bonusFind);
  const rarity = RARITIES[rarityId];
  const slot = rng.pick(SLOTS);
  const gear = CLASS_GEAR[itemClass] || CLASS_GEAR.knight;
  const focus = (CLASS_FOCUS[itemClass] || CLASS_FOCUS.knight)[slot];

  const base = 2 + Math.floor(floor * 0.4);
  const mods = {};
  // Main stat = the slot's class focus (the bigger bonus).
  mods[focus] = Math.max(1, Math.round(base * rarity.mult * (0.9 + rng.next() * 0.3)));
  // Extra stats by rarity, smaller, from the remaining pool.
  const pool = STATS.filter((s) => s !== focus);
  for (let i = 0; i < rarity.stats - 1 && pool.length; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    const st = pool.splice(idx, 1)[0];
    mods[st] = Math.max(1, Math.round(base * rarity.mult * 0.55 * (0.8 + rng.next() * 0.4)));
  }

  let noun, weaponType, subType;
  if (slot === "weapon") {
    const wpool =
      itemClass === playerClass && playerWeaponTypes && playerWeaponTypes.length
        ? playerWeaponTypes
        : classWeaponTypes(itemClass);
    weaponType = rng.pick(wpool && wpool.length ? wpool : WEAPON_TYPES);
    noun = weaponType;
  } else if (slot === "subweapon") {
    subType = gear.sub;
    noun = subType;
  } else if (slot === "accessory") {
    noun = rng.pick(ACCESSORY_NAMES);
  } else {
    noun = SLOT_NOUN[slot];
  }

  const item = {
    id: uid(),
    slot,
    rarity: rarityId,
    forClass: itemClass,
    base: noun, // noun kept so rarity crafting can rename cleanly
    name: `${rarity.name} ${gear.set} ${noun}`,
    level: floor,
    upgrade: 0,
    mods,
  };
  if (weaponType) item.weaponType = weaponType;
  if (subType) item.subType = subType;
  return item;
}

export function itemPower(item) {
  return 1 + 0.04 * (item.upgrade || 0);
}

export function itemMods(item) {
  const f = itemPower(item);
  const out = {};
  for (const [k, v] of Object.entries(item.mods || {})) out[k] = Math.round(v * f);
  return out;
}

// Roll the loot from clearing a floor (at most one item). Bosses/elites grant a
// quality bonus. opts threads { classId, weaponTypes }.
export function rollLoot(floorType, floor, luck, rng, opts = {}) {
  const chance = dropChance(floorType);
  if (chance <= 0 || rng.next() >= chance) return [];
  const bonusFind = floorType === "boss" ? 22 : floorType === "elite" ? 8 : 0;
  return [generateItem(floor, luck, rng, { ...opts, bonusFind })];
}

// Total stat bonuses from all equipped items (an { slot: item } map), including
// each item's upgrade level.
export function equipmentMods(equipment = {}) {
  const total = {};
  for (const slot of SLOTS) {
    const it = equipment[slot];
    if (it) for (const [k, v] of Object.entries(itemMods(it))) total[k] = (total[k] || 0) + v;
  }
  return total;
}
