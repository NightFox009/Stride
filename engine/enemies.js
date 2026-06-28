// Enemy roster for the 100-floor dungeon. Enemies come in archetypes that make
// fights feel different: swift ones dodge and strike first, brutes hit hard,
// tanks soak damage, tricksters crit. The same templates scale with depth via
// spawn(), and zones.js decides which appear where.
//
// `hp` is authored per template (decoupled from the player HP formula) so enemy
// durability can be tuned independently. Stats drive damage, speed, crit, dodge.

// Archetype stat shapes. Enemy basic-attack damage scales off STR (default
// primary), so brutes hit hardest; swift/tank/trickster trade power for evasion,
// bulk, or crits.
// SPD adds to initiative (AGI + SPD); it scales with floor like other stats, so
// fast monsters increasingly act before you on deeper floors.
const ARCH = {
  swift:     { STR: 5, END: 3, AGI: 9, VIT: 3, INT: 2, CHA: 2, LUK: 4, SPD: 6 },
  brute:     { STR: 9, END: 6, AGI: 3, VIT: 5, INT: 1, CHA: 1, LUK: 2 },
  tank:      { STR: 4, END: 8, AGI: 2, VIT: 8, INT: 1, CHA: 1, LUK: 2 },
  trickster: { STR: 5, END: 4, AGI: 6, VIT: 3, INT: 3, CHA: 3, LUK: 8, SPD: 3 },
  caster:    { STR: 6, END: 4, AGI: 4, VIT: 4, INT: 8, CHA: 4, LUK: 3 },
  balanced:  { STR: 5, END: 5, AGI: 5, VIT: 5, INT: 3, CHA: 3, LUK: 3, SPD: 1 },
  elite:     { STR: 8, END: 7, AGI: 4, VIT: 6, INT: 3, CHA: 2, LUK: 3, SPD: 3 },
  boss:      { STR: 8, END: 10, AGI: 6, VIT: 9, INT: 5, CHA: 5, LUK: 5, SPD: 4 },
};

const NORMAL_BASE = {
  swift:     { hp: 14, xp: 4, gold: 2 },
  balanced:  { hp: 22, xp: 6, gold: 4 },
  tank:      { hp: 34, xp: 7, gold: 4 },
  brute:     { hp: 26, xp: 7, gold: 5 },
  trickster: { hp: 18, xp: 6, gold: 5 },
  caster:    { hp: 20, xp: 7, gold: 5 },
};

// `reward` is the stat a monster grants in the knowledge book (per tier). Default
// follows the archetype; some are overridden for flavour.
const REWARD = {
  swift: "AGI", brute: "STR", tank: "VIT", trickster: "LUK",
  caster: "INT", balanced: "END", elite: "CHA", boss: "END",
};

function norm(id, name, arch, reward = REWARD[arch]) {
  const b = NORMAL_BASE[arch];
  return { id, name, kind: "normal", hp: b.hp, xp: b.xp, gold: b.gold, stats: ARCH[arch], reward };
}
function elite(id, name, reward = REWARD.elite) {
  return { id, name, kind: "elite", hp: 90, xp: 18, gold: 14, stats: ARCH.elite, reward };
}
function boss(id, name, reward = REWARD.boss) {
  return { id, name, kind: "boss", hp: 200, xp: 60, gold: 50, stats: ARCH.boss, reward };
}

const ROSTER = [
  // Zone 1 — Ratwarren Caves
  norm("cave_rat", "Cave Rat", "swift"),
  norm("goblin", "Goblin Skirmisher", "balanced", "VIT"), // HP
  norm("slime", "Cave Slime", "tank", "STR"), // attack
  elite("goblin_brute", "Goblin Brute"),
  boss("goblin_warlord", "Goblin Warlord"),

  // Zone 2 — Whispering Woods
  norm("forest_wolf", "Forest Wolf", "swift"),
  norm("bandit", "Wood Bandit", "brute"),
  norm("pixie", "Wild Pixie", "trickster"),
  elite("dire_wolf", "Dire Wolf"),
  boss("bandit_king", "Bandit King"),

  // Zone 3 — Sunken Crypt
  norm("skeleton", "Skeleton", "balanced"),
  norm("ghoul", "Ghoul", "brute"),
  norm("wraith", "Wraith", "swift"),
  elite("bone_knight", "Bone Knight"),
  boss("the_lich", "The Lich"),

  // Zone 4 — Ember Depths
  norm("fire_imp", "Fire Imp", "swift"),
  norm("magma_hound", "Magma Hound", "brute"),
  norm("ash_golem", "Ash Golem", "tank"),
  elite("cinder_brute", "Cinder Brute"),
  boss("flame_tyrant", "Flame Tyrant"),

  // Zone 5 — Frozen Hollow
  norm("frost_wisp", "Frost Wisp", "trickster"),
  norm("ice_troll", "Ice Troll", "tank"),
  norm("snow_stalker", "Snow Stalker", "swift"),
  elite("frost_giant", "Frost Giant"),
  boss("winter_warden", "Winter Warden"),

  // Zone 6 — Venom Mire
  norm("swamp_lurker", "Swamp Lurker", "tank"),
  norm("plague_bat", "Plague Bat", "swift"),
  norm("basilisk", "Basilisk", "brute"),
  elite("gloom_hydra", "Gloom Hydra"),
  boss("swamp_witch", "Swamp Witch"),

  // Zone 7 — Storm Spire
  norm("storm_harpy", "Storm Harpy", "swift"),
  norm("thunder_brute", "Thunder Brute", "brute"),
  norm("arc_golem", "Arc Golem", "tank"),
  elite("tempest_knight", "Tempest Knight"),
  boss("storm_lord", "Storm Lord"),

  // Zone 8 — Shadow Reaches
  norm("shade", "Shade", "swift"),
  norm("revenant", "Revenant", "brute"),
  norm("dread_caster", "Dread Caster", "caster"),
  elite("dread_knight", "Dread Knight"),
  boss("shadow_king", "Shadow King"),

  // Zone 9 — Dragon's Roost
  norm("drake", "Drake", "brute"),
  norm("wyvern", "Wyvern", "swift"),
  norm("dragonkin", "Dragonkin", "balanced"),
  elite("young_dragon", "Young Dragon"),
  boss("elder_dragon", "Elder Dragon"),

  // Zone 10 — The Abyss
  norm("voidspawn", "Voidspawn", "swift"),
  norm("horror", "Crawling Horror", "tank"),
  norm("abomination", "Abomination", "brute"),
  elite("void_titan", "Void Titan"),
  boss("void_sovereign", "Void Sovereign"),
];

export const ENEMIES = Object.fromEntries(ROSTER.map((e) => [e.id, e]));

// Back-compat: the first zone's normal pool.
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
