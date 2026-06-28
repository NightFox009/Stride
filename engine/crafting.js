// Crafting: enhance items (+1..+30) and craft them up a rarity. Both cost gold
// and materials that drop in the dungeon — higher-tier materials are far rarer
// (mostly from bosses), so big upgrades and rarity jumps are a real investment.

import { RARITIES, RARITY_ORDER, SLOTS } from "./items.js";
import { STATS } from "./stats.js";

export const MAX_UPGRADE = 30;

export const MATERIALS = {
  shard:   { id: "shard", name: "Rough Shard", tier: 1, color: "#9aa7b4" },
  crystal: { id: "crystal", name: "Polished Crystal", tier: 2, color: "#5ad1a0" },
  core:    { id: "core", name: "Radiant Core", tier: 3, color: "#6ea8fe" },
  relic:   { id: "relic", name: "Ancient Relic", tier: 4, color: "#c792ea" },
  essence: { id: "essence", name: "Mythic Essence", tier: 5, color: "#e3b341" },
};
export const MATERIAL_ORDER = ["shard", "crystal", "core", "relic", "essence"];

// Material drops on a floor clear. Low-tier shards are common; each higher tier
// is much rarer and mostly gated behind elites/bosses ("difficult to get").
export function rollMaterials(floorType, floor, luck, rng) {
  if (floorType === "rest") return {};
  const out = {};
  const add = (id, n) => { if (n > 0) out[id] = (out[id] || 0) + n; };
  const elite = floorType === "elite";
  const boss = floorType === "boss";
  const lf = luck * 0.003; // tiny luck nudge on quantities/odds

  // Shards: frequent.
  if (rng.next() < (boss ? 1.0 : elite ? 0.8 : 0.45)) add("shard", 1 + Math.floor(rng.next() * (boss ? 4 : elite ? 3 : 2)));
  // Crystals: uncommon, better on elite/boss.
  if (rng.next() < (boss ? 0.6 : elite ? 0.25 : 0.05) + lf) add("crystal", 1 + Math.floor(rng.next() * (boss ? 2 : 1)));
  // Cores: rare, mainly bosses.
  if (rng.next() < (boss ? 0.22 : elite ? 0.05 : 0.0) + lf) add("core", 1);
  // Relics: very rare, bosses only.
  if (boss && rng.next() < 0.05 + lf) add("relic", 1);
  // Essence: exceptionally rare, bosses only.
  if (boss && rng.next() < 0.012 + lf * 0.3) add("essence", 1);
  return out;
}

// Cost to take an item from its current upgrade level to the next. Gold grows
// quadratically and rarer items cost more; materials get tougher every 10 levels.
export function upgradeCost(item) {
  const lvl = (item.upgrade || 0) + 1;
  if (lvl > MAX_UPGRADE) return null;
  const rmult = RARITIES[item.rarity]?.mult || 1;
  const gold = Math.round((15 + lvl * lvl * 1.4) * rmult);
  const mats = {};
  if (lvl <= 10) {
    mats.shard = Math.ceil(lvl / 2);
  } else if (lvl <= 20) {
    mats.shard = 5;
    mats.crystal = Math.ceil((lvl - 10) / 2);
  } else {
    mats.crystal = 4;
    mats.core = Math.ceil((lvl - 20) / 3);
  }
  return { gold, mats, level: lvl };
}

export function nextRarity(rarityId) {
  const i = RARITY_ORDER.indexOf(rarityId);
  return i >= 0 && i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null;
}

// Cost to craft an item up to the next rarity. The target tier's material is the
// gating resource.
export function rarityUpgradeCost(item) {
  const next = nextRarity(item.rarity);
  if (!next) return null;
  const table = {
    uncommon:  { gold: 200, mats: { crystal: 3 } },
    rare:      { gold: 600, mats: { core: 3 } },
    epic:      { gold: 1500, mats: { relic: 2 } },
    legendary: { gold: 4000, mats: { essence: 1 } },
  };
  return { ...table[next], target: next };
}

// Apply one enhancement level (caller deducts the cost).
export function withUpgrade(item) {
  return { ...item, upgrade: Math.min(MAX_UPGRADE, (item.upgrade || 0) + 1) };
}

// Craft an item up a rarity: KEEP its current stats and ADD one new stat, then
// rename to the new rarity. The upgrade level is preserved.
export function withRarityUp(item, rng) {
  const next = nextRarity(item.rarity);
  if (!next) return item;
  const newMods = { ...item.mods };
  const pool = STATS.filter((s) => !(s in newMods));
  if (pool.length) {
    const stat = rng.pick(pool);
    const base = 2 + Math.floor((item.level || 1) * 0.4);
    newMods[stat] = Math.max(1, Math.round(base * RARITIES[next].mult * (0.8 + rng.next() * 0.4)));
  }
  const baseName = item.base || item.name.split(" ").slice(-1)[0];
  return { ...item, rarity: next, mods: newMods, name: `${RARITIES[next].name} ${baseName}` };
}

// Helpers shared by the profile layer.
export function hasMaterials(materials = {}, need = {}) {
  return Object.entries(need).every(([k, q]) => (materials[k] || 0) >= q);
}
export { SLOTS };
