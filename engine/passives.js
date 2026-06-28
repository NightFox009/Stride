// Passive skills. Unlike active skills, passives are always-on: each grants a
// flat stat bonus that flows through every derived formula (HP, crit, dodge, …)
// because it's added to the effective stat block before combat math runs.

export const PASSIVES = {
  // Lv1 minor passives — an early skill-point sink, +3 to the class stat.
  brute_force:  { id: "brute_force",  name: "Brute Force",   describe: "+3 Strength",  mods: { STR: 3 } },
  hardy:        { id: "hardy",        name: "Hardy",         describe: "+3 Vitality",  mods: { VIT: 3 } },
  toughened:    { id: "toughened",    name: "Toughened",     describe: "+3 Endurance", mods: { END: 3 } },
  nimble:       { id: "nimble",       name: "Nimble",        describe: "+3 Agility",   mods: { AGI: 3 } },
  focused:      { id: "focused",      name: "Focused",       describe: "+3 Intellect", mods: { INT: 3 } },
  charismatic:  { id: "charismatic",  name: "Charismatic",   describe: "+3 Charisma",  mods: { CHA: 3 } },
  fortunate:    { id: "fortunate",    name: "Fortunate",     describe: "+3 Luck",      mods: { LUK: 3 } },

  // Knight
  iron_grip:    { id: "iron_grip",    name: "Iron Grip",     describe: "+6 Strength",  mods: { STR: 6 } },
  unbreakable:  { id: "unbreakable",  name: "Unbreakable",   describe: "+8 Endurance", mods: { END: 8 } },
  // Sentinel
  thick_hide:   { id: "thick_hide",   name: "Thick Hide",    describe: "+8 Vitality",  mods: { VIT: 8 } },
  fortified:    { id: "fortified",    name: "Fortified",     describe: "+6 Endurance", mods: { END: 6 } },
  // Monk
  conditioning: { id: "conditioning", name: "Conditioning",  describe: "+8 Endurance", mods: { END: 8 } },
  inner_peace:  { id: "inner_peace",  name: "Inner Peace",   describe: "+6 Vitality",  mods: { VIT: 6 } },
  // Ranger
  fleet_footed: { id: "fleet_footed", name: "Fleet-Footed",  describe: "+8 Agility",   mods: { AGI: 8 } },
  eagle_eye:    { id: "eagle_eye",    name: "Eagle Eye",     describe: "+6 Luck",      mods: { LUK: 6 } },
  // Scholar
  arcane_mind:  { id: "arcane_mind",  name: "Arcane Mind",   describe: "+8 Intellect", mods: { INT: 8 } },
  mana_well:    { id: "mana_well",    name: "Mana Well",     describe: "+6 Vitality",  mods: { VIT: 6 } },
  // Herald
  commanding:   { id: "commanding",   name: "Commanding",    describe: "+8 Charisma",  mods: { CHA: 8 } },
  silver_tongue:{ id: "silver_tongue",name: "Silver Tongue", describe: "+6 Luck",      mods: { LUK: 6 } },
  // Wanderer
  lucky_charm:  { id: "lucky_charm",  name: "Lucky Charm",   describe: "+8 Luck",      mods: { LUK: 8 } },
  windfall:     { id: "windfall",     name: "Windfall",      describe: "+6 Agility",   mods: { AGI: 6 } },
};

// Sum the stat mods from a list of learned passive ids.
export function passiveMods(passiveIds = []) {
  const total = {};
  for (const id of passiveIds) {
    const p = PASSIVES[id];
    if (!p) continue;
    for (const [stat, v] of Object.entries(p.mods)) {
      total[stat] = (total[stat] || 0) + v;
    }
  }
  return total;
}
