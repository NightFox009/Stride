// The 7 stats and all derived-stat formulas.
// These are the single source of truth for combat math — tune here.

export const STATS = ["STR", "END", "AGI", "VIT", "INT", "CHA", "LUK"];

export const STAT_NAMES = {
  STR: "Strength",
  END: "Endurance",
  AGI: "Agility",
  VIT: "Vitality",
  INT: "Intellect",
  CHA: "Charisma",
  LUK: "Luck",
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeStats(overrides = {}) {
  const base = { STR: 5, END: 5, AGI: 5, VIT: 5, INT: 5, CHA: 5, LUK: 5 };
  return { ...base, ...overrides };
}

// Derived stats — all combat numbers flow from here.
export const derive = {
  // Balanced: every stat gives ATTACK (if it's your primary) + exactly TWO side
  // effects of comparable value:
  //   STR → HP  + crit damage      VIT → HP + HP regen
  //   END → HP  + MP               AGI → dodge + speed
  //   INT → MP  + skill power      CHA → MP + HP regen
  //   LUK → crit chance + dodge
  maxHP: (s) => 30 + s.END * 6 + s.VIT * 5 + s.STR * 3,
  maxMP: (s) => 20 + s.INT * 5 + s.END * 3 + s.CHA * 3,
  // Basic attack scales off the wielder's PRIMARY stat (the class's signature
  // stat). Defaults to STR for enemies and anything class-agnostic.
  attack: (s, primary = "STR") => (s[primary] || 0) * 3,
  skillPower: (s) => s.INT * 2,
  critChance: (s) => clamp(5 + s.LUK * 0.5, 0, 75), // %  (LUK)
  critMult: (s = {}) => 1.7 + (s.STR || 0) * 0.01, // STR → harder crits
  dodgeChance: (s) => clamp(s.AGI * 0.4 + s.LUK * 0.2, 0, 60), // %  (AGI, LUK)
  speed: (s) => s.AGI, // turn order  (AGI)
  hpRegenPerFloor: (s) => Math.round(s.VIT * 0.5 + s.CHA * 0.4), // (VIT, CHA)
  fleeChance: (s) => clamp(25 + s.AGI * 0.4, 5, 95), // % — fleeing forfeits, so not a perk
};
