// Starter enemy roster for early floors + a boss. Pure data templates.
// scale() lets the same template grow with floor/wave depth.

// `hp` is authored per template (decoupled from the player HP formula) so
// enemy durability can be balanced independently. `stats` still drives their
// damage, speed, crit, and dodge.
export const ENEMIES = {
  cave_rat: {
    id: "cave_rat", name: "Cave Rat", kind: "normal",
    hp: 14,
    stats: { STR: 3, END: 2, AGI: 6, VIT: 2, INT: 1, CHA: 1, LUK: 3 },
    xp: 4, gold: 2,
  },
  goblin: {
    id: "goblin", name: "Goblin Skirmisher", kind: "normal",
    hp: 22,
    stats: { STR: 5, END: 3, AGI: 5, VIT: 3, INT: 2, CHA: 2, LUK: 3 },
    xp: 6, gold: 4,
  },
  slime: {
    id: "slime", name: "Cave Slime", kind: "normal",
    hp: 30,
    stats: { STR: 4, END: 6, AGI: 2, VIT: 5, INT: 1, CHA: 1, LUK: 2 },
    xp: 6, gold: 3,
  },
  goblin_brute: {
    id: "goblin_brute", name: "Goblin Brute", kind: "elite",
    hp: 90,
    stats: { STR: 8, END: 7, AGI: 4, VIT: 6, INT: 2, CHA: 2, LUK: 3 },
    xp: 18, gold: 14,
  },
  goblin_warlord: {
    id: "goblin_warlord", name: "Goblin Warlord", kind: "boss",
    hp: 200,
    stats: { STR: 8, END: 10, AGI: 6, VIT: 9, INT: 4, CHA: 5, LUK: 5 },
    xp: 60, gold: 50,
  },
};

export const EARLY_POOL = ["cave_rat", "goblin", "slime"];

// Scale a template by depth. ~6% stat growth per floor; waves nudge it up too.
export function spawn(templateId, { floor = 1, wave = 1 } = {}) {
  const tpl = ENEMIES[templateId];
  if (!tpl) throw new Error(`Unknown enemy: ${templateId}`);
  const depth = (floor - 1) + (wave - 1) * 0.1;
  const mult = 1 + depth * 0.06;
  const stats = {};
  for (const [k, v] of Object.entries(tpl.stats)) stats[k] = Math.round(v * mult);
  return {
    templateId,
    name: tpl.name,
    kind: tpl.kind,
    hp: Math.round(tpl.hp * mult),
    stats,
    xp: Math.round(tpl.xp * mult),
    gold: Math.round(tpl.gold * mult),
  };
}
