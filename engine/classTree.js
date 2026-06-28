// Per-class skill progression. Each class gains new active skills and passives
// at level milestones, learned by spending skill points (1 earned per level).
// Starter skills (level 1) come free with the class and are not listed here.

import { SKILLS } from "./skills.js";
import { PASSIVES, passiveMods } from "./passives.js";
import { makeStats } from "./stats.js";

export const CLASS_TREE = {
  knight: [
    { id: "cleave", kind: "active", level: 1, cost: 1 },
    { id: "brute_force", kind: "passive", level: 1, cost: 1 },
    { id: "crushing_blow", kind: "active", level: 5, cost: 1 },
    { id: "power_strike", kind: "active", level: 10, cost: 2 },
    { id: "iron_grip", kind: "passive", level: 15, cost: 2 },
    { id: "whirlwind", kind: "active", level: 20, cost: 2 },
    { id: "unbreakable", kind: "passive", level: 30, cost: 2 },
  ],
  sentinel: [
    { id: "taunt_slam", kind: "active", level: 1, cost: 1 },
    { id: "hardy", kind: "passive", level: 1, cost: 1 },
    { id: "guardian_strike", kind: "active", level: 5, cost: 1 },
    { id: "bulwark", kind: "active", level: 10, cost: 2 },
    { id: "thick_hide", kind: "passive", level: 15, cost: 2 },
    { id: "retribution", kind: "active", level: 20, cost: 2 },
    { id: "fortified", kind: "passive", level: 30, cost: 2 },
  ],
  monk: [
    { id: "jab", kind: "active", level: 1, cost: 1 },
    { id: "toughened", kind: "passive", level: 1, cost: 1 },
    { id: "pressure_point", kind: "active", level: 5, cost: 1 },
    { id: "iron_palm", kind: "active", level: 10, cost: 2 },
    { id: "conditioning", kind: "passive", level: 15, cost: 2 },
    { id: "thousand_fists", kind: "active", level: 20, cost: 2 },
    { id: "inner_peace", kind: "passive", level: 30, cost: 2 },
  ],
  ranger: [
    { id: "aimed_shot", kind: "active", level: 1, cost: 1 },
    { id: "nimble", kind: "passive", level: 1, cost: 1 },
    { id: "piercing_shot", kind: "active", level: 5, cost: 1 },
    { id: "double_tap", kind: "active", level: 10, cost: 2 },
    { id: "fleet_footed", kind: "passive", level: 15, cost: 2 },
    { id: "arrow_storm", kind: "active", level: 20, cost: 2 },
    { id: "eagle_eye", kind: "passive", level: 30, cost: 2 },
  ],
  scholar: [
    { id: "spark", kind: "active", level: 1, cost: 1 },
    { id: "focused", kind: "passive", level: 1, cost: 1 },
    { id: "flame_burst", kind: "active", level: 5, cost: 1 },
    { id: "frost_lance", kind: "active", level: 10, cost: 2 },
    { id: "arcane_mind", kind: "passive", level: 15, cost: 2 },
    { id: "meteor", kind: "active", level: 20, cost: 2 },
    { id: "mana_well", kind: "passive", level: 30, cost: 2 },
  ],
  herald: [
    { id: "taunting_shout", kind: "active", level: 1, cost: 1 },
    { id: "charismatic", kind: "passive", level: 1, cost: 1 },
    { id: "war_cry", kind: "active", level: 5, cost: 1 },
    { id: "inspire", kind: "active", level: 10, cost: 2 },
    { id: "commanding", kind: "passive", level: 15, cost: 2 },
    { id: "anthem", kind: "active", level: 20, cost: 2 },
    { id: "silver_tongue", kind: "passive", level: 30, cost: 2 },
  ],
};

export function treeFor(classId) {
  return CLASS_TREE[classId] || [];
}

// Max rank a tree entry can reach (actives go higher than passives).
export function maxLevelFor(entry) {
  return entry.max ?? (entry.kind === "passive" ? 3 : 5);
}

// Each rank costs more character levels: rank 1 unlocks at entry.level, and
// every further rank needs +RANK_LEVEL_STEP levels. So a Lv20 skill can't be
// maxed until much later.
export const RANK_LEVEL_STEP = 5;
export function rankLevelReq(entry, rank) {
  return entry.level + Math.max(0, rank - 1) * RANK_LEVEL_STEP;
}

// Look up display info (name/describe/cost/max) for a tree entry.
export function describeEntry(entry) {
  const src = entry.kind === "passive" ? PASSIVES[entry.id] : SKILLS[entry.id];
  return {
    ...entry,
    name: src?.name ?? entry.id,
    describe: src?.describe ?? "",
    mpCost: entry.kind === "active" ? src?.cost : undefined,
    max: maxLevelFor(entry),
  };
}

// Effective stats = base allocated stats + learned passive bonuses (scaled by
// each passive's level via `skillLevels`).
export function effectiveStats(baseStats, passiveIds = [], skillLevels = {}) {
  const mods = passiveMods(passiveIds, skillLevels);
  const out = makeStats(baseStats);
  for (const [stat, v] of Object.entries(mods)) {
    out[stat] = (out[stat] || 0) + v;
  }
  return out;
}
