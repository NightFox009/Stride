// The player profile: the persistent save object the whole app revolves around.
// It is a thin shell over the pure engine — all the real rules (stat formulas,
// EXP curve, step conversions) live in ../../engine and are imported here so the
// app and the text sim share one source of truth.

import { BASE_CLASSES, startingStatsFor } from "../../engine/classes.js";
import { derive } from "../../engine/stats.js";
import { effectiveStats, treeFor } from "../../engine/classTree.js";
import {
  gainExp as engineGainExp,
  stepsToXP,
  stepsToEnergy,
  levelHpBonus,
  TUNING,
} from "../../engine/progression.js";

export const SAVE_VERSION = 1;

// Build a fresh profile for a newly chosen base class.
export function createProfile(classId) {
  const cls = BASE_CLASSES[classId];
  if (!cls) throw new Error(`Unknown class: ${classId}`);
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    classId: cls.id,
    className: cls.name,
    level: 1,
    exp: 0,
    statPoints: 0,
    skillPoints: 0,
    stats: startingStatsFor(classId),
    skills: [...cls.skills],
    passives: [],
    energy: 0,
    gold: 0,
    // Deepest floor not yet cleared — the dungeon's "current floor".
    floor: 1,
    // Lifetime + banking. We bank fractional steps so nothing is lost between
    // the 10-steps-per-XP and 100-steps-per-Energy thresholds.
    totalSteps: 0,
    stepBankXP: 0,
    stepBankEnergy: 0,
    lastSyncAt: Date.now(),
  };
}

// The stat block actually used in combat: base allocation + passive bonuses.
export function statsWithPassives(profile) {
  return effectiveStats(profile.stats, profile.passives || []);
}

// Derived, never-persisted view used by the UI (HP/MP/attack/etc.). Uses the
// effective stats so passives are reflected in the combat sheet.
export function deriveSheet(profile) {
  const s = statsWithPassives(profile);
  return {
    maxHP: derive.maxHP(s) + levelHpBonus(profile.level),
    maxMP: derive.maxMP(s),
    attack: derive.attack(s),
    skillPower: derive.skillPower(s),
    critChance: derive.critChance(s),
    dodgeChance: derive.dodgeChance(s),
    speed: derive.speed(s),
    expToNext: Math.round(TUNING.baseXP * Math.pow(profile.level, 1.5)),
  };
}

// The core walk->reward loop. Takes raw new steps and returns a NEW profile plus
// a summary of what was earned, so the UI can animate/toast level-ups.
export function applySteps(profile, newSteps) {
  newSteps = Math.max(0, Math.floor(newSteps));
  if (newSteps === 0) {
    return { profile, earned: { steps: 0, xp: 0, energy: 0, levelsGained: [] } };
  }

  let p = { ...profile };
  p.totalSteps += newSteps;
  p.lastSyncAt = Date.now();

  // Bank fractional steps so partial progress carries over between syncs.
  p.stepBankXP += newSteps;
  const xpGain = stepsToXP(p.stepBankXP);
  p.stepBankXP -= xpGain * TUNING.stepsPerXP;

  p.stepBankEnergy += newSteps;
  const energyGain = stepsToEnergy(p.stepBankEnergy);
  p.stepBankEnergy -= energyGain * TUNING.stepsPerEnergy;

  p.energy += energyGain;

  let levelsGained = [];
  if (xpGain > 0) {
    const res = engineGainExp(p, xpGain);
    p = res.profile;
    levelsGained = res.levelsGained;
    p.skillPoints = (p.skillPoints || 0) + levelsGained.length; // 1 skill point / level
  }

  return {
    profile: p,
    earned: { steps: newSteps, xp: xpGain, energy: energyGain, levelsGained },
  };
}

// Fold a completed dungeon-floor result (from engine/dungeon.js runFloor) back
// into the profile: spend the energy, bank loot, award EXP through the engine
// (handling level-ups), and advance the floor on a clear. Returns a new profile
// plus the level-ups gained so the UI can celebrate them.
export function applyFloorResult(profile, result) {
  let p = { ...profile };
  p.energy = Math.max(0, p.energy - (result.energySpent || 0));
  p.gold += result.gold || 0;

  let levelsGained = [];
  if (result.xp > 0) {
    const res = engineGainExp(p, result.xp);
    p = res.profile;
    levelsGained = res.levelsGained;
    p.skillPoints = (p.skillPoints || 0) + levelsGained.length; // 1 skill point / level
  }

  // Only a full clear pushes you deeper; defeat/flee keep you on this floor.
  if (result.outcome === "cleared") p.floor = (p.floor || 1) + 1;

  return { profile: p, levelsGained };
}

// Commit a batch of stat allocations at once (the Stats screen drafts these and
// confirms). `alloc` is a map like { STR: 2, AGI: 1 }. Ignores the change if it
// would overspend. Returns a new profile.
export function applyAllocation(profile, alloc) {
  const spend = Object.values(alloc).reduce((s, n) => s + Math.max(0, n), 0);
  if (spend <= 0 || spend > profile.statPoints) return profile;
  const stats = { ...profile.stats };
  for (const [stat, n] of Object.entries(alloc)) {
    if (n > 0 && stat in stats) stats[stat] += n;
  }
  return { ...profile, statPoints: profile.statPoints - spend, stats };
}

// Learn a class-tree skill/passive with skill points. Validates level + cost +
// not-already-known. Returns a new profile (or the same if not learnable).
export function learnSkill(profile, entryId) {
  const entry = treeFor(profile.classId).find((e) => e.id === entryId);
  if (!entry) return profile;
  const known = entry.kind === "passive" ? profile.passives || [] : profile.skills || [];
  if (known.includes(entry.id)) return profile;
  if (profile.level < entry.level) return profile;
  if ((profile.skillPoints || 0) < entry.cost) return profile;

  const next = { ...profile, skillPoints: profile.skillPoints - entry.cost };
  if (entry.kind === "passive") next.passives = [...(profile.passives || []), entry.id];
  else next.skills = [...(profile.skills || []), entry.id];
  return next;
}

// Helpers the UI uses to render the skill tree.
export function knownEntry(profile, entry) {
  const known = entry.kind === "passive" ? profile.passives || [] : profile.skills || [];
  return known.includes(entry.id);
}
