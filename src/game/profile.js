// The player profile: the persistent save object the whole app revolves around.
// It is a thin shell over the pure engine — all the real rules (stat formulas,
// EXP curve, step conversions) live in ../../engine and are imported here so the
// app and the text sim share one source of truth.

import { BASE_CLASSES, startingStatsFor } from "../../engine/classes.js";
import { derive } from "../../engine/stats.js";
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
    stats: startingStatsFor(classId),
    skills: [...cls.skills],
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

// Derived, never-persisted view used by the UI (HP/MP/attack/etc.).
export function deriveSheet(profile) {
  const s = profile.stats;
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
  }

  // Only a full clear pushes you deeper; defeat/flee keep you on this floor.
  if (result.outcome === "cleared") p.floor = (p.floor || 1) + 1;

  return { profile: p, levelsGained };
}

// Spend one stat point to raise a stat by 1. Returns a new profile (or the same
// one if there are no points to spend).
export function allocateStat(profile, stat) {
  if (profile.statPoints <= 0) return profile;
  if (!(stat in profile.stats)) return profile;
  return {
    ...profile,
    statPoints: profile.statPoints - 1,
    stats: { ...profile.stats, [stat]: profile.stats[stat] + 1 },
  };
}
