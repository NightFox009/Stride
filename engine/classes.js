// Base classes (permanent pick) and hidden classes (auto-unlock at thresholds).

import { makeStats } from "./stats.js";

// Each base class: all stats 5, +1 to its signature stat (= 6), plus a skill.
export const BASE_CLASSES = {
  knight:   { id: "knight",   name: "Knight",   boost: "STR", skills: ["shield_bash"] },
  sentinel: { id: "sentinel", name: "Sentinel", boost: "VIT", skills: ["aegis_strike"] },
  monk:     { id: "monk",     name: "Monk",     boost: "END", skills: ["flurry"] },
  ranger:   { id: "ranger",   name: "Ranger",   boost: "AGI", skills: ["quick_shot"] },
  scholar:  { id: "scholar",  name: "Scholar",  boost: "INT", skills: ["arcane_bolt"] },
  herald:   { id: "herald",   name: "Herald",   boost: "CHA", skills: ["cutting_words", "rally"] },
  wanderer: { id: "wanderer", name: "Wanderer", boost: "LUK", skills: ["wild_gamble"] },
};

export function startingStatsFor(classId) {
  const cls = BASE_CLASSES[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  return makeStats({ [cls.boost]: 6 });
}

// Hidden classes — single-stat unlocks at 1000, combos at 750+750.
// `requires` is a map of stat -> threshold; ALL must be met.
export const HIDDEN_CLASSES = {
  juggernaut: { id: "juggernaut", name: "Juggernaut", requires: { STR: 1000 }, skills: ["earthshatter", "iron_march"] },
  immortal:   { id: "immortal",   name: "Immortal",   requires: { VIT: 1000 }, skills: ["undying", "regenesis"] },
  marathoner: { id: "marathoner", name: "Marathoner", requires: { END: 1000 }, skills: ["second_wind", "deep_delve"] },
  phantom:    { id: "phantom",    name: "Phantom",    requires: { AGI: 1000 }, skills: ["afterimage", "flicker_strike"] },
  archon:     { id: "archon",     name: "Archon",     requires: { INT: 1000 }, skills: ["overclock", "insight"] },
  sovereign:  { id: "sovereign",  name: "Sovereign",  requires: { CHA: 1000 }, skills: ["conscript", "royal_decree"] },
  fatebinder: { id: "fatebinder", name: "Fatebinder", requires: { LUK: 1000 }, skills: ["jackpot", "loaded_dice"] },
  // combos
  spellblade: { id: "spellblade", name: "Spellblade", requires: { STR: 750, INT: 750 }, skills: ["spellstrike"] },
  trickster:  { id: "trickster",  name: "Trickster",  requires: { AGI: 750, LUK: 750 }, skills: ["sleight"] },
};

// Returns the list of hidden classes a stat block currently qualifies for.
export function unlockedHiddenClasses(stats) {
  return Object.values(HIDDEN_CLASSES).filter((hc) =>
    Object.entries(hc.requires).every(([stat, threshold]) => stats[stat] >= threshold)
  );
}
