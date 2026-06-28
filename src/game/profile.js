// The player profile: the persistent save object the whole app revolves around.
// It is a thin shell over the pure engine — all the real rules (stat formulas,
// EXP curve, step conversions) live in ../../engine and are imported here so the
// app and the text sim share one source of truth.

import { BASE_CLASSES, startingStatsFor } from "../../engine/classes.js";
import { derive } from "../../engine/stats.js";
import { effectiveStats, treeFor, maxLevelFor, rankLevelReq } from "../../engine/classTree.js";
import { getJob, jobsFor, JOB_LEVEL } from "../../engine/jobs.js";
import {
  gainExp as engineGainExp,
  stepsToXP,
  stepsToEnergy,
  levelHpBonus,
  TUNING,
} from "../../engine/progression.js";

export const SAVE_VERSION = 1;
export const MAX_ENERGY = 200; // hard cap on stored Energy
export const BASE_ENERGY = 100; // starting Energy for a new character
export const ENERGY_REGEN_MS = 10 * 60 * 1000; // +1 Energy per 10 real minutes
// At most 2 of every 3 earned stat points may sit on one stat (so a level's
// 3 points can't all go to the same stat — even across multiple allocations).
export const STAT_FOCUS_RATIO = 2 / 3;

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
    skillLevels: {}, // id -> rank, for learned tree skills/passives
    job: null, // awakened advanced job id (see engine/jobs.js)
    energy: BASE_ENERGY,
    gold: 0,
    // Deepest floor not yet cleared — the dungeon's "current floor".
    floor: 1,
    // Raw steps waiting to be converted into EXP or Energy by the player.
    totalSteps: 0,
    stepBank: 0,
    lastEnergyTick: Date.now(), // for time-based Energy regen
    lastSyncAt: Date.now(),
  };
}

// Base allocation + passive bonuses (scaled by passive level). This is also the
// stat block used to check job requirements (the job's own perk doesn't count).
export function statsWithPassives(profile) {
  return effectiveStats(profile.stats, profile.passives || [], profile.skillLevels || {});
}

// The full combat stat block: passives + the awakened job's perk.
export function combatStats(profile) {
  const s = statsWithPassives(profile);
  const job = getJob(profile.job);
  if (job) for (const [k, v] of Object.entries(job.mods || {})) s[k] = (s[k] || 0) + v;
  return s;
}

// The stat that drives basic-attack damage: the awakened job's primary stat, or
// otherwise the class's signature stat.
export function primaryStatOf(profile) {
  const job = getJob(profile.job);
  return job?.primary || BASE_CLASSES[profile.classId]?.boost || "STR";
}

// Per-job qualification against plain stat-value thresholds (checked on your
// stats including passives). Returns the requirement rows the UI renders.
export function jobProgress(profile, job) {
  const stats = statsWithPassives(profile);
  const levelOk = profile.level >= JOB_LEVEL;
  const reqs = Object.entries(job.requires).map(([stat, need]) => ({
    stat, need, have: stats[stat] || 0, ok: (stats[stat] || 0) >= need,
  }));
  const qualifies = levelOk && reqs.every((r) => r.ok);
  return { levelOk, reqs, qualifies };
}

// Class jobs with qualification + active flags (includes hidden jobs; the UI
// decides whether to reveal them).
export function jobOptions(profile) {
  return jobsFor(profile.classId).map((job) => ({
    ...job,
    qualifies: jobProgress(profile, job).qualifies,
    active: profile.job === job.id,
  }));
}

// Awaken a job the character qualifies for. This is a PERMANENT, one-time
// choice — switching later will require a (future) Class Change item. Grants
// the job's signature skill.
export function awakenJob(profile, jobId) {
  if (profile.job) return profile; // already chosen — locked
  const job = getJob(jobId);
  if (!job || job.classId !== profile.classId) return profile;
  if (!jobProgress(profile, job).qualifies) return profile;

  const next = { ...profile, job: jobId };
  if (job.skill && !(profile.skills || []).includes(job.skill)) {
    next.skills = [...(profile.skills || []), job.skill];
    next.skillLevels = { ...(profile.skillLevels || {}), [job.skill]: 1 };
  }
  return next;
}

// Derived, never-persisted view used by the UI (HP/MP/attack/etc.). Uses the
// full combat stats so passives AND the job perk are reflected.
export function deriveSheet(profile) {
  const s = combatStats(profile);
  return {
    maxHP: derive.maxHP(s) + levelHpBonus(profile.level),
    maxMP: derive.maxMP(s),
    attack: derive.attack(s, primaryStatOf(profile)),
    skillPower: derive.skillPower(s),
    critChance: derive.critChance(s),
    dodgeChance: derive.dodgeChance(s),
    speed: derive.speed(s),
    expToNext: Math.round(TUNING.baseXP * Math.pow(profile.level, 1.5)),
  };
}

// Banks new steps. Steps no longer auto-convert — the player chooses to spend
// the bank on EXP or Energy via convertSteps().
export function applySteps(profile, newSteps) {
  newSteps = Math.max(0, Math.floor(newSteps));
  if (newSteps === 0) return { profile, earned: { steps: 0 } };

  const p = { ...profile };
  p.totalSteps += newSteps;
  p.stepBank = (p.stepBank || 0) + newSteps;
  p.lastSyncAt = Date.now();
  return { profile: p, earned: { steps: newSteps } };
}

// How much EXP / Energy the current step bank could yield right now (Energy is
// limited by remaining capacity under MAX_ENERGY).
export function conversionPreview(profile) {
  const bank = profile.stepBank || 0;
  const capacity = Math.max(0, MAX_ENERGY - (profile.energy || 0));
  return {
    bank,
    xp: stepsToXP(bank),
    energy: Math.min(stepsToEnergy(bank), capacity),
  };
}

// Convert banked steps into either EXP ("exp") or Energy ("energy"). Consumes
// only the whole-unit portion; the remainder stays banked. Returns a new profile
// plus a summary for the UI.
export function convertSteps(profile, mode) {
  let p = { ...profile };
  const bank = p.stepBank || 0;

  if (mode === "exp") {
    const xp = stepsToXP(bank);
    if (xp <= 0) return { profile, converted: { mode, steps: 0, xp: 0, levelsGained: [] } };
    p.stepBank = bank - xp * TUNING.stepsPerXP;
    const res = engineGainExp(p, xp);
    p = res.profile;
    const levelsGained = res.levelsGained;
    p.skillPoints = (p.skillPoints || 0) + levelsGained.length; // 1 skill point / level
    return { profile: p, converted: { mode, steps: xp * TUNING.stepsPerXP, xp, levelsGained } };
  }

  // energy
  const capacity = Math.max(0, MAX_ENERGY - (p.energy || 0));
  const energy = Math.min(stepsToEnergy(bank), capacity);
  if (energy <= 0) return { profile, converted: { mode, steps: 0, energy: 0 } };
  p.stepBank = bank - energy * TUNING.stepsPerEnergy;
  p.energy = (p.energy || 0) + energy;
  return { profile: p, converted: { mode, steps: energy * TUNING.stepsPerEnergy, energy } };
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

// Regenerate Energy from elapsed real time (+1 per ENERGY_REGEN_MS), up to the
// cap. Advances lastEnergyTick only by the Energy actually granted so partial
// progress isn't lost. Returns the SAME profile object when nothing changed, so
// callers can pass it straight to setState without causing a needless re-render.
export function applyEnergyRegen(profile, now = Date.now()) {
  if (!profile) return profile;
  const energy = profile.energy || 0;
  const last = profile.lastEnergyTick || profile.createdAt || now;

  if (energy >= MAX_ENERGY) {
    if (profile.lastEnergyTick === now) return profile;
    return { ...profile, lastEnergyTick: now }; // keep tick fresh while full
  }

  const elapsed = now - last;
  if (elapsed < ENERGY_REGEN_MS) return profile;

  const space = MAX_ENERGY - energy;
  const gain = Math.min(Math.floor(elapsed / ENERGY_REGEN_MS), space);
  const newTick = gain >= space ? now : last + gain * ENERGY_REGEN_MS;
  return { ...profile, energy: energy + gain, lastEnergyTick: newTick };
}

// Milliseconds until the next +1 Energy (null if full).
export function msToNextEnergy(profile, now = Date.now()) {
  if (!profile || (profile.energy || 0) >= MAX_ENERGY) return null;
  const last = profile.lastEnergyTick || profile.createdAt || now;
  return Math.max(0, ENERGY_REGEN_MS - ((now - last) % ENERGY_REGEN_MS));
}

// Points invested into each stat from leveling (current value minus the class
// starting block — the class's own +1 doesn't count toward the focus cap).
export function investedPoints(profile) {
  const base = startingStatsFor(profile.classId);
  const out = {};
  for (const s of Object.keys(profile.stats)) out[s] = profile.stats[s] - (base[s] || 0);
  return out;
}

// Total stat points ever earned = already invested + still unspent. (Every
// granted point is one or the other, so this needs no separate counter.)
export function totalEarnedPoints(profile) {
  const inv = investedPoints(profile);
  const spent = Object.values(inv).reduce((a, b) => a + b, 0);
  return spent + (profile.statPoints || 0);
}

// The most points any single stat may hold (≤ 2/3 of all earned points).
export function maxPerStat(profile) {
  return Math.floor(totalEarnedPoints(profile) * STAT_FOCUS_RATIO);
}

// Commit a batch of stat allocations at once (the Stats screen drafts these and
// confirms). `alloc` is a map like { STR: 2, AGI: 1 }. Rejects overspends and
// any stat that would exceed the focus cap (across all prior allocations too).
export function applyAllocation(profile, alloc) {
  const spend = Object.values(alloc).reduce((s, n) => s + Math.max(0, n), 0);
  if (spend <= 0 || spend > profile.statPoints) return profile;

  const cap = maxPerStat(profile);
  const inv = investedPoints(profile);
  for (const [stat, n] of Object.entries(alloc)) {
    if (n > 0 && (inv[stat] || 0) + n > cap) return profile; // exceeds focus cap
  }

  const stats = { ...profile.stats };
  for (const [stat, n] of Object.entries(alloc)) {
    if (n > 0 && stat in stats) stats[stat] += n;
  }
  return { ...profile, statPoints: profile.statPoints - spend, stats };
}

// Learn or rank up a class-tree skill/passive with skill points. The first
// purchase learns it (level 1); further purchases raise its level up to its max.
// Validates character level + cost + cap. Returns a new profile (or the same).
export function learnSkill(profile, entryId) {
  const entry = treeFor(profile.classId).find((e) => e.id === entryId);
  if (!entry) return profile;
  const max = maxLevelFor(entry);
  const levels = profile.skillLevels || {};
  const current = levels[entry.id] || 0;
  if (current >= max) return profile;
  // The NEXT rank has its own character-level requirement (rank 1 = entry.level,
  // each further rank needs more levels).
  if (profile.level < rankLevelReq(entry, current + 1)) return profile;
  if ((profile.skillPoints || 0) < entry.cost) return profile;

  const next = { ...profile, skillPoints: profile.skillPoints - entry.cost };
  next.skillLevels = { ...levels, [entry.id]: current + 1 };
  if (current === 0) {
    if (entry.kind === "passive") next.passives = [...(profile.passives || []), entry.id];
    else next.skills = [...(profile.skills || []), entry.id];
  }
  return next;
}

// Helpers the UI uses to render the skill tree.
export function skillLevelOf(profile, id) {
  return (profile.skillLevels || {})[id] || 0;
}

// Character level required to buy the next rank of a tree entry (null if maxed).
export function nextRankLevelReq(profile, entry) {
  const current = (profile.skillLevels || {})[entry.id] || 0;
  if (current >= maxLevelFor(entry)) return null;
  return rankLevelReq(entry, current + 1);
}
