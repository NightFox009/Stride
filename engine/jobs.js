// Advanced jobs. Each base class has two normal jobs plus one HIDDEN Luck job
// (the lost Wanderer's path, open to everyone). Jobs awaken at level 20 once you
// meet their stat requirements — plain thresholds, deliberately high so claiming
// one means committing most of your points. Hidden jobs only appear once met.

export const JOB_LEVEL = 20;

// Requirement thresholds (stat VALUES). Tuned so meeting a job at level 20 (~77
// stat points) uses the bulk of them, and you can only reach one at a time.
const SIG_REQ = 45;     // signature stat for a normal job
const BRANCH_REQ = 33;  // its secondary stat
const LUCK_REQ = 45;    // Luck for the hidden job
const LUCK_SIG_REQ = 30;// the class stat for the hidden job

// `weapon` is the weapon TYPE this job wields. A character may only equip
// weapons matching their class's job types (the two normal jobs differ). Hidden
// Luck jobs use weapon: null = may wield ANY weapon type.
function normalJob(id, name, classId, sig, branch, color, emblem, skill, weapon, blurb) {
  return {
    id, name, classId, hidden: false, primary: sig, branch, weapon,
    requires: { [sig]: SIG_REQ, [branch]: BRANCH_REQ },
    mods: { [sig]: 6, [branch]: 4 },
    skill, color, emblem, blurb,
  };
}

function luckJob(id, name, classId, sig, blurb) {
  return {
    id, name, classId, hidden: true, primary: "LUK", weapon: null,
    requires: { LUK: LUCK_REQ, [sig]: LUCK_SIG_REQ },
    mods: { LUK: 6, [sig]: 4 },
    skill: "jackpot_strike", color: "#e3b341", emblem: "coin", blurb,
  };
}

export const JOBS = {
  // Knight (STR) — Greatsword vs Sword
  warlord:   normalJob("warlord", "Warlord", "knight", "STR", "END", "#ff6b5e", "blade", "warlords_cleave", "Greatsword", "A relentless, tireless offense."),
  crusader:  normalJob("crusader", "Crusader", "knight", "STR", "VIT", "#e8b04b", "tower", "crusaders_aegis", "Sword", "An armored, immovable bruiser."),
  fateblade: luckJob("fateblade", "Fateblade", "knight", "STR", "A blade guided by sheer fortune."),

  // Sentinel (VIT) — Spear vs Hammer
  guardian:  normalJob("guardian", "Guardian", "sentinel", "VIT", "END", "#3fb6a8", "tower", "fortress_stance", "Spear", "An endlessly enduring wall."),
  templar:   normalJob("templar", "Templar", "sentinel", "VIT", "CHA", "#c792ea", "crown", "consecration", "Hammer", "A holy defender who inspires."),
  fateguard: luckJob("fateguard", "Fateguard", "sentinel", "VIT", "A warden shielded by luck itself."),

  // Monk (END) — Fist vs Staff
  grandmaster: normalJob("grandmaster", "Grandmaster", "monk", "END", "STR", "#e3a857", "fist", "hundred_hands", "Fist", "A crushing martial master."),
  stormfist:   normalJob("stormfist", "Stormfist", "monk", "END", "AGI", "#5ad1a0", "wing", "thunderclap", "Staff", "A blur of lightning blows."),
  fatefist:    luckJob("fatefist", "Fatefist", "monk", "END", "A martial artist riding fate's wind."),

  // Ranger (AGI) — Bow vs Crossbow
  pathfinder: normalJob("pathfinder", "Pathfinder", "ranger", "AGI", "END", "#5ad1a0", "arrow", "hunters_focus", "Bow", "A swift, untiring hunter."),
  sniper:     normalJob("sniper", "Sniper", "ranger", "AGI", "INT", "#56c2d6", "eye", "kill_shot", "Crossbow", "A calculating, deadly marksman."),
  fateseeker: luckJob("fateseeker", "Fateseeker", "ranger", "AGI", "A hunter whose every shot is fated."),

  // Scholar (INT) — Staff vs Wand
  archmage:   normalJob("archmage", "Archmage", "scholar", "INT", "END", "#6ea8fe", "flame", "cataclysm", "Staff", "Raw, devastating arcana."),
  sage:       normalJob("sage", "Sage", "scholar", "INT", "VIT", "#56c2d6", "eye", "arcane_ward", "Wand", "An enduring, wise mystic."),
  fateweaver: luckJob("fateweaver", "Fateweaver", "scholar", "INT", "A mage who weaves chance into spells."),

  // Herald (CHA) — Scepter vs Sword
  monarch:   normalJob("monarch", "Monarch", "herald", "CHA", "VIT", "#c792ea", "crown", "royal_command", "Scepter", "A commanding, regal ruler."),
  marshal:   normalJob("marshal", "Marshal", "herald", "CHA", "STR", "#ff6b5e", "blade", "rallying_charge", "Sword", "A frontline war-commander."),
  fatecaller: luckJob("fatecaller", "Fatecaller", "herald", "CHA", "A leader who commands fortune itself."),
};

// Weapon types a class can use before awakening (both normal jobs' weapons).
export function classWeaponTypes(classId) {
  return jobsFor(classId).filter((j) => !j.hidden && j.weapon).map((j) => j.weapon);
}

export function jobsFor(classId) {
  return Object.values(JOBS).filter((j) => j.classId === classId);
}

export function getJob(id) {
  return id ? JOBS[id] || null : null;
}
