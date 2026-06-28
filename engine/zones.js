// Biome zones across the 100-floor dungeon. Each zone spans 10 floors and has
// its own normal-enemy pool, elite, and boss, so descending changes scenery and
// foes. floors.js pulls from these to build waves.

export const ZONES = [
  { name: "Ratwarren Caves", pool: ["cave_rat", "goblin", "slime"], elite: "goblin_brute", boss: "goblin_warlord" },
  { name: "Whispering Woods", pool: ["forest_wolf", "bandit", "pixie"], elite: "dire_wolf", boss: "bandit_king" },
  { name: "Sunken Crypt", pool: ["skeleton", "ghoul", "wraith"], elite: "bone_knight", boss: "the_lich" },
  { name: "Ember Depths", pool: ["fire_imp", "magma_hound", "ash_golem"], elite: "cinder_brute", boss: "flame_tyrant" },
  { name: "Frozen Hollow", pool: ["frost_wisp", "ice_troll", "snow_stalker"], elite: "frost_giant", boss: "winter_warden" },
  { name: "Venom Mire", pool: ["swamp_lurker", "plague_bat", "basilisk"], elite: "gloom_hydra", boss: "swamp_witch" },
  { name: "Storm Spire", pool: ["storm_harpy", "thunder_brute", "arc_golem"], elite: "tempest_knight", boss: "storm_lord" },
  { name: "Shadow Reaches", pool: ["shade", "revenant", "dread_caster"], elite: "dread_knight", boss: "shadow_king" },
  { name: "Dragon's Roost", pool: ["drake", "wyvern", "dragonkin"], elite: "young_dragon", boss: "elder_dragon" },
  { name: "The Abyss", pool: ["voidspawn", "horror", "abomination"], elite: "void_titan", boss: "void_sovereign" },
];

// 10 floors per zone; floors past 100 stay in the final zone.
export function zoneForFloor(floor) {
  const i = Math.min(Math.max(0, Math.floor((floor - 1) / 10)), ZONES.length - 1);
  return ZONES[i];
}

export function zoneName(floor) {
  return zoneForFloor(floor).name;
}
