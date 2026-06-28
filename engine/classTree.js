// Per-class skill progression. Each class gains new active skills and passives
// at level milestones, learned by spending skill points (1 earned per level).
// Starter skills (level 1) come free with the class and are not listed here.

import { SKILLS } from "./skills.js";
import { PASSIVES, passiveMods } from "./passives.js";
import { makeStats } from "./stats.js";

export const CLASS_TREE = {
  knight: [
    { id: "power_strike", kind: "active", level: 10, cost: 1 },
    { id: "iron_grip", kind: "passive", level: 15, cost: 1 },
    { id: "whirlwind", kind: "active", level: 20, cost: 2 },
    { id: "unbreakable", kind: "passive", level: 30, cost: 2 },
  ],
  sentinel: [
    { id: "bulwark", kind: "active", level: 10, cost: 1 },
    { id: "thick_hide", kind: "passive", level: 15, cost: 1 },
    { id: "retribution", kind: "active", level: 20, cost: 2 },
    { id: "fortified", kind: "passive", level: 30, cost: 2 },
  ],
  monk: [
    { id: "iron_palm", kind: "active", level: 10, cost: 1 },
    { id: "conditioning", kind: "passive", level: 15, cost: 1 },
    { id: "thousand_fists", kind: "active", level: 20, cost: 2 },
    { id: "inner_peace", kind: "passive", level: 30, cost: 2 },
  ],
  ranger: [
    { id: "double_tap", kind: "active", level: 10, cost: 1 },
    { id: "fleet_footed", kind: "passive", level: 15, cost: 1 },
    { id: "arrow_storm", kind: "active", level: 20, cost: 2 },
    { id: "eagle_eye", kind: "passive", level: 30, cost: 2 },
  ],
  scholar: [
    { id: "frost_lance", kind: "active", level: 10, cost: 1 },
    { id: "arcane_mind", kind: "passive", level: 15, cost: 1 },
    { id: "meteor", kind: "active", level: 20, cost: 2 },
    { id: "mana_well", kind: "passive", level: 30, cost: 2 },
  ],
  herald: [
    { id: "inspire", kind: "active", level: 10, cost: 1 },
    { id: "commanding", kind: "passive", level: 15, cost: 1 },
    { id: "anthem", kind: "active", level: 20, cost: 2 },
    { id: "silver_tongue", kind: "passive", level: 30, cost: 2 },
  ],
  wanderer: [
    { id: "lucky_strike", kind: "active", level: 10, cost: 1 },
    { id: "lucky_charm", kind: "passive", level: 15, cost: 1 },
    { id: "fortunes_wheel", kind: "active", level: 20, cost: 2 },
    { id: "windfall", kind: "passive", level: 30, cost: 2 },
  ],
};

export function treeFor(classId) {
  return CLASS_TREE[classId] || [];
}

// Look up display info (name/describe/cost) for a tree entry.
export function describeEntry(entry) {
  const src = entry.kind === "passive" ? PASSIVES[entry.id] : SKILLS[entry.id];
  return {
    ...entry,
    name: src?.name ?? entry.id,
    describe: src?.describe ?? "",
    mpCost: entry.kind === "active" ? src?.cost : undefined,
  };
}

// Effective stats = base allocated stats + all learned passive bonuses.
export function effectiveStats(baseStats, passiveIds = []) {
  const mods = passiveMods(passiveIds);
  const out = makeStats(baseStats);
  for (const [stat, v] of Object.entries(mods)) {
    out[stat] = (out[stat] || 0) + v;
  }
  return out;
}
