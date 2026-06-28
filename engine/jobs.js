// Advanced jobs. Each base class has two jobs that "awaken" at level 20 once
// their stat requirements are met — so how you allocate decides which path you
// can take. One job per class is a pure single-stat focus; the other is a hybrid
// that needs two stats. Awakening grants a permanent stat perk and changes the
// avatar's look (colour + emblem).

export const JOB_LEVEL = 20;

export const JOBS = {
  // Knight (STR)
  warlord:       { id: "warlord", name: "Warlord", classId: "knight", requires: { STR: 28 }, mods: { STR: 8, END: 3 }, color: "#ff6b5e", emblem: "blade", blurb: "Pure, overwhelming offense." },
  crusader:      { id: "crusader", name: "Crusader", classId: "knight", requires: { STR: 18, VIT: 18 }, mods: { STR: 5, VIT: 5 }, color: "#e8b04b", emblem: "tower", blurb: "An armored, relentless bruiser." },

  // Sentinel (VIT)
  guardian:      { id: "guardian", name: "Guardian", classId: "sentinel", requires: { VIT: 28 }, mods: { VIT: 8, END: 3 }, color: "#3fb6a8", emblem: "tower", blurb: "An immovable living wall." },
  templar:       { id: "templar", name: "Templar", classId: "sentinel", requires: { VIT: 18, CHA: 18 }, mods: { VIT: 5, CHA: 5 }, color: "#c792ea", emblem: "crown", blurb: "A holy defender who inspires." },

  // Monk (END)
  grandmaster:   { id: "grandmaster", name: "Grandmaster", classId: "monk", requires: { END: 28 }, mods: { END: 8, STR: 3 }, color: "#e3a857", emblem: "fist", blurb: "A tireless martial master." },
  stormfist:     { id: "stormfist", name: "Stormfist", classId: "monk", requires: { END: 18, AGI: 18 }, mods: { END: 5, AGI: 5 }, color: "#5ad1a0", emblem: "wing", blurb: "A blur of lightning blows." },

  // Ranger (AGI)
  pathfinder:    { id: "pathfinder", name: "Pathfinder", classId: "ranger", requires: { AGI: 28 }, mods: { AGI: 8, END: 3 }, color: "#5ad1a0", emblem: "arrow", blurb: "A swift, untiring hunter." },
  sniper:        { id: "sniper", name: "Sniper", classId: "ranger", requires: { AGI: 18, LUK: 18 }, mods: { AGI: 5, LUK: 5 }, color: "#e3b341", emblem: "eye", blurb: "One shot, one lucky kill." },

  // Scholar (INT)
  archmage:      { id: "archmage", name: "Archmage", classId: "scholar", requires: { INT: 28 }, mods: { INT: 8, VIT: 3 }, color: "#6ea8fe", emblem: "flame", blurb: "Raw, devastating arcana." },
  sage:          { id: "sage", name: "Sage", classId: "scholar", requires: { INT: 18, VIT: 18 }, mods: { INT: 5, VIT: 5 }, color: "#56c2d6", emblem: "eye", blurb: "An enduring, wise mystic." },

  // Herald (CHA)
  monarch:       { id: "monarch", name: "Monarch", classId: "herald", requires: { CHA: 28 }, mods: { CHA: 8, LUK: 3 }, color: "#c792ea", emblem: "crown", blurb: "A commanding, regal ruler." },
  marshal:       { id: "marshal", name: "Marshal", classId: "herald", requires: { CHA: 18, STR: 18 }, mods: { CHA: 5, STR: 5 }, color: "#ff6b5e", emblem: "blade", blurb: "A frontline war-commander." },

  // Wanderer (LUK)
  fortuneseeker: { id: "fortuneseeker", name: "Fortune-Seeker", classId: "wanderer", requires: { LUK: 28 }, mods: { LUK: 8, AGI: 3 }, color: "#e3b341", emblem: "coin", blurb: "Fate itself bends to you." },
  rogue:         { id: "rogue", name: "Rogue", classId: "wanderer", requires: { LUK: 18, AGI: 18 }, mods: { LUK: 5, AGI: 5 }, color: "#5ad1a0", emblem: "wing", blurb: "A cunning, elusive trickster." },
};

export function jobsFor(classId) {
  return Object.values(JOBS).filter((j) => j.classId === classId);
}

export function getJob(id) {
  return id ? JOBS[id] || null : null;
}

// Does this stat block (level + stats) meet a job's requirements?
export function meetsJobReq(job, level, stats) {
  if (!job) return false;
  if (level < JOB_LEVEL) return false;
  return Object.entries(job.requires).every(([stat, v]) => (stats[stat] || 0) >= v);
}
