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
//
// Each base stat now feeds a clear cluster of combat ATTRIBUTES (shown on the
// combat sheet), so investing in a stat has legible side effects:
//   STR → Attack (primary), Max HP, Crit Damage
//   END → Max HP, Max MP, Defense, Magic Defense
//   AGI → Speed, Evasion, Accuracy
//   VIT → Max HP, Defense, HP Regen
//   INT → Magic Attack, Max MP, Skill Power
//   CHA → Max MP, Magic Defense, HP Regen
//   LUK → Critical (crit chance), Evasion, Accuracy
export const derive = {
  maxHP: (s) => 30 + s.END * 6 + s.VIT * 5 + s.STR * 3,
  maxMP: (s) => 20 + s.INT * 5 + s.END * 3 + s.CHA * 3,
  // Physical basic attack scales off the wielder's PRIMARY stat (the class's
  // signature stat). Defaults to STR for enemies and anything class-agnostic.
  attack: (s, primary = "STR") => (s[primary] || 0) * 3,
  // Magic attack is always INT-based (spell power feeds magic skills).
  magicAttack: (s) => (s.INT || 0) * 3,
  skillPower: (s) => s.INT * 2,
  // Mitigation ratings. Incoming damage is scaled by 100/(100+def), so each
  // point of Defense is worth a little less the more you stack — no hard wall.
  defense: (s) => Math.round((s.END || 0) * 0.8 + (s.VIT || 0) * 0.5), // physical
  magicDefense: (s) => Math.round((s.CHA || 0) * 0.7 + (s.VIT || 0) * 0.4 + (s.END || 0) * 0.2), // magic
  critChance: (s) => clamp(5 + s.LUK * 0.5, 0, 75), // %  (LUK)
  critMult: (s = {}) => 1.7 + (s.STR || 0) * 0.01, // STR → harder crits
  // To-hit / avoidance (percent). A hit lands when accuracy beats the target's
  // evasion: hitChance = accuracy − evasion (floored so nothing is unhittable).
  evasion: (s) => clamp((s.AGI || 0) * 0.4 + (s.LUK || 0) * 0.2, 0, 60), // %  (AGI, LUK)
  accuracy: (s) => clamp(85 + (s.AGI || 0) * 0.5 + (s.LUK || 0) * 0.2, 0, 100), // %  (AGI, LUK)
  // Back-compat alias for evasion (older callers used "dodgeChance").
  dodgeChance: (s) => clamp((s.AGI || 0) * 0.4 + (s.LUK || 0) * 0.2, 0, 60),
  speed: (s) => s.AGI + (s.SPD || 0), // turn order: Agility + gear Attack/Cast Speed
  hpRegenPerFloor: (s) => Math.round(s.VIT * 0.5 + s.CHA * 0.4), // (VIT, CHA)
  fleeChance: (s) => clamp(25 + s.AGI * 0.4, 5, 95), // % — fleeing forfeits, so not a perk
};

// Minimum chance any attack has to connect, so high-evasion foes are never
// literally unhittable.
export const MIN_HIT_CHANCE = 35;
