// Gold upgrades — the main gold sink. Spend gold to permanently raise core
// combat ATTRIBUTES (not base stats). Bonuses are flat additions layered on top
// of your stat-derived values, so gold complements your stat build instead of
// replacing it. Each upgrade has its own escalating gold cost.
//
// `attr` names the bonus key these feed (see profile.upgradeBonuses). A couple
// of upgrades feed two attributes (Power → physical + magic, Guard → both
// defenses), handled in upgradeBonuses.

export const UPGRADES = {
  power:     { id: "power",     label: "Power",        attr: "attack",     per: 3,    base: 50,  unit: "ATK",     desc: "+3 Attack & Magic Attack per level" },
  vitality:  { id: "vitality",  label: "Vitality",     attr: "maxHP",      per: 25,   base: 40,  unit: "HP",      desc: "+25 Max HP per level" },
  regen:     { id: "regen",     label: "Regeneration", attr: "hpRegen",    per: 2,    base: 60,  unit: "HP",      desc: "+2 HP recovered between waves" },
  guard:     { id: "guard",     label: "Guard",        attr: "defense",    per: 2,    base: 50,  unit: "DEF",     desc: "+2 Defense & Magic Defense per level" },
  precision: { id: "precision", label: "Precision",    attr: "critChance", per: 1,    base: 120, unit: "%",       desc: "+1% Crit Chance per level", max: 50 },
  ferocity:  { id: "ferocity",  label: "Ferocity",     attr: "critMult",   per: 0.05, base: 150, unit: "×",       desc: "+5% Crit Damage per level" },
  leech:     { id: "leech",     label: "Lifesteal",    attr: "lifesteal",  per: 0.01, base: 220, unit: "%",       desc: "Heal 1% of damage dealt per level", max: 25 },
  haste:     { id: "haste",     label: "Haste",        attr: "speed",      per: 1,    base: 100, unit: "SPD",     desc: "+1 Speed (act sooner) per level" },
};

// Display/order for the Upgrades screen.
export const UPGRADE_ORDER = ["power", "vitality", "guard", "regen", "precision", "ferocity", "leech", "haste"];

export function upgradeMax(id) {
  return UPGRADES[id]?.max ?? 9999;
}

// Gold cost to go from `level` → `level+1`. Geometric so it stays a sink.
export function upgradeGoldCost(id, level) {
  const u = UPGRADES[id];
  if (!u) return Infinity;
  return Math.round(u.base * Math.pow(1.5, level));
}

// Flat combat-attribute bonuses from all purchased upgrades.
export function upgradeBonuses(upgrades = {}) {
  const b = {
    attack: 0, magicAttack: 0, maxHP: 0, hpRegen: 0,
    defense: 0, magicDefense: 0, critChance: 0, critMult: 0, lifesteal: 0, speed: 0,
  };
  for (const [id, lvl] of Object.entries(upgrades)) {
    const u = UPGRADES[id];
    if (!u || !lvl) continue;
    const amt = u.per * lvl;
    if (id === "power") { b.attack += amt; b.magicAttack += amt; }
    else if (id === "guard") { b.defense += amt; b.magicDefense += amt; }
    else b[u.attr] += amt;
  }
  return b;
}
