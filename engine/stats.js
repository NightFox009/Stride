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
  // Every primary stat is "attack + a side effect":
  //   STR attack + HP   END attack + HP/regen   AGI attack + dodge/speed
  //   VIT attack + HP    INT attack + MP/power   CHA attack + MP
  //   LUK attack + crit/flee
  maxHP: (s) => 30 + s.END * 6 + s.VIT * 4 + s.STR * 2,
  maxMP: (s) => 20 + s.INT * 5 + s.CHA * 2,
  // Basic attack scales off the wielder's PRIMARY stat (the class's signature
  // stat). Defaults to STR for enemies and anything class-agnostic.
  attack: (s, primary = "STR") => (s[primary] || 0) * 3,
  skillPower: (s) => s.INT * 2,
  critChance: (s) => clamp(5 + s.LUK * 0.5, 0, 75), // %
  critMult: () => 1.75,
  dodgeChance: (s) => clamp(s.AGI * 0.4, 0, 60), // %
  speed: (s) => s.AGI, // turn order
  hpRegenPerFloor: (s) => Math.round(s.VIT * 0.5),
  fleeChance: (s) => clamp(30 + s.AGI * 0.5 + s.LUK * 0.3, 5, 95), // %
};
