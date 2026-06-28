// Advanced jobs. Each base class has two jobs that "awaken" at level 20. Both
// build on the class's signature stat but diverge on a different SECONDARY stat
// ("branch"). You qualify for the job whose branch stat you've invested in MORE
// — so the two paths are mutually exclusive: your allocation picks exactly one.
//
// Requirements: level 20+, signature stat >= min, branch stat >= min, AND your
// branch stat strictly higher than the sibling job's branch stat.

export const JOB_LEVEL = 20;

// Tuned against the points available around level 20 (~77 stat points) so each
// path is a real commitment, while the branch comparison guarantees exclusivity.
const SIG_MIN = 24;
const BRANCH_MIN = 18;

function job(id, name, classId, signature, branch, color, emblem, skill, blurb) {
  return {
    id, name, classId,
    signature: { stat: signature, min: SIG_MIN },
    branch, branchMin: BRANCH_MIN,
    mods: { [signature]: 6, [branch]: 4 },
    skill, // signature active granted on awakening
    color, emblem, blurb,
  };
}

export const JOBS = {
  // Knight (STR) — END (relentless) vs VIT (armored)
  warlord:       job("warlord", "Warlord", "knight", "STR", "END", "#ff6b5e", "blade", "warlords_cleave", "A relentless, tireless offense."),
  crusader:      job("crusader", "Crusader", "knight", "STR", "VIT", "#e8b04b", "tower", "crusaders_aegis", "An armored, immovable bruiser."),

  // Sentinel (VIT) — END (endless) vs CHA (holy)
  guardian:      job("guardian", "Guardian", "sentinel", "VIT", "END", "#3fb6a8", "tower", "fortress_stance", "An endlessly enduring wall."),
  templar:       job("templar", "Templar", "sentinel", "VIT", "CHA", "#c792ea", "crown", "consecration", "A holy defender who inspires."),

  // Monk (END) — STR (power) vs AGI (speed)
  grandmaster:   job("grandmaster", "Grandmaster", "monk", "END", "STR", "#e3a857", "fist", "hundred_hands", "A crushing martial master."),
  stormfist:     job("stormfist", "Stormfist", "monk", "END", "AGI", "#5ad1a0", "wing", "thunderclap", "A blur of lightning blows."),

  // Ranger (AGI) — END (hunter) vs LUK (crit)
  pathfinder:    job("pathfinder", "Pathfinder", "ranger", "AGI", "END", "#5ad1a0", "arrow", "hunters_focus", "A swift, untiring hunter."),
  sniper:        job("sniper", "Sniper", "ranger", "AGI", "LUK", "#e3b341", "eye", "kill_shot", "One shot, one lucky kill."),

  // Scholar (INT) — LUK (raw power) vs VIT (enduring)
  archmage:      job("archmage", "Archmage", "scholar", "INT", "LUK", "#6ea8fe", "flame", "cataclysm", "Raw, devastating arcana."),
  sage:          job("sage", "Sage", "scholar", "INT", "VIT", "#56c2d6", "eye", "arcane_ward", "An enduring, wise mystic."),

  // Herald (CHA) — LUK (regal) vs STR (war)
  monarch:       job("monarch", "Monarch", "herald", "CHA", "LUK", "#c792ea", "crown", "royal_command", "A commanding, regal ruler."),
  marshal:       job("marshal", "Marshal", "herald", "CHA", "STR", "#ff6b5e", "blade", "rallying_charge", "A frontline war-commander."),

  // Wanderer (LUK) — CHA (charmed) vs AGI (nimble)
  fortuneseeker: job("fortuneseeker", "Fortune-Seeker", "wanderer", "LUK", "CHA", "#e3b341", "coin", "jackpot_strike", "Fate itself bends to you."),
  rogue:         job("rogue", "Rogue", "wanderer", "LUK", "AGI", "#5ad1a0", "wing", "shadowstrike", "A cunning, elusive trickster."),
};

export function jobsFor(classId) {
  return Object.values(JOBS).filter((j) => j.classId === classId);
}

export function getJob(id) {
  return id ? JOBS[id] || null : null;
}

// The other job of the same class (its branch is what you're compared against).
// Qualification itself lives in profile.js (jobProgress), since it depends on
// invested points and total earned points, not just current stat values.
export function siblingJob(job) {
  if (!job) return null;
  return jobsFor(job.classId).find((j) => j.id !== job.id) || null;
}
