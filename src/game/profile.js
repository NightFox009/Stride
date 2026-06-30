// The player profile: the persistent save object the whole app revolves around.
// It is a thin shell over the pure engine — all the real rules (stat formulas,
// EXP curve, step conversions) live in ../../engine and are imported here so the
// app and the text sim share one source of truth.

import { BASE_CLASSES, startingStatsFor } from "../../engine/classes.js";
import { derive } from "../../engine/stats.js";
import { effectiveStats, treeFor, maxLevelFor, rankLevelReq } from "../../engine/classTree.js";
import { getJob, jobsFor, JOB_LEVEL, classWeaponTypes } from "../../engine/jobs.js";
import { equipmentMods, SLOTS, CLASS_GEAR } from "../../engine/items.js";
import { idleRewards, knowledgeBonuses } from "../../engine/knowledge.js";
import {
  upgradeCost,
  rarityUpgradeCost,
  withUpgrade,
  withRarityUp,
  hasMaterials,
} from "../../engine/crafting.js";
import {
  gainExp as engineGainExp,
  levelHpBonus,
  TUNING,
} from "../../engine/progression.js";

export const SAVE_VERSION = 1;
export const HP_REGEN_PER_MIN = 0.06; // fraction of max HP recovered per real minute
export const MP_REGEN_PER_MIN = 0.08; // fraction of max MP per real minute
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
    inventory: [], // unequipped items
    equipment: { weapon: null, subweapon: null, helm: null, armor: null, gloves: null, boots: null, accessory: null },
    materials: {}, // crafting materials: { matId: count }
    knowledge: {}, // bestiary: { enemyId: coreCount }
    currentHP: null, // carried HP between floors (null = full)
    currentMP: null, // carried MP between floors (null = full)
    lastRestTick: Date.now(), // for time-based HP/MP regen
    gold: 0,
    // Deepest floor not yet cleared — the dungeon's "current floor".
    floor: 1,
    // Wall-clock of the last active moment, for offline idle accrual.
    lastSeenAt: Date.now(),
  };
}

// Base allocation + passive bonuses (scaled by passive level). This is also the
// stat block used to check job requirements (the job's own perk doesn't count).
export function statsWithPassives(profile) {
  return effectiveStats(profile.stats, profile.passives || [], profile.skillLevels || {});
}

// The full combat stat block: passives + the awakened job's perk + equipment.
export function combatStats(profile) {
  const s = statsWithPassives(profile);
  const job = getJob(profile.job);
  if (job) for (const [k, v] of Object.entries(job.mods || {})) s[k] = (s[k] || 0) + v;
  const eq = equipmentMods(profile.equipment || {});
  for (const [k, v] of Object.entries(eq)) s[k] = (s[k] || 0) + v;
  // Knowledge: each studied monster grants its reward stat.
  const kb = knowledgeBonuses(profile.knowledge || {}).stats;
  for (const [k, v] of Object.entries(kb)) s[k] = (s[k] || 0) + v;
  return s;
}

// Knowledge HP / HP-regen bonuses (flat, not stat-block).
export function knowledgeHpBonuses(profile) {
  const { hp, hpRegen } = knowledgeBonuses(profile.knowledge || {});
  return { hp, hpRegen };
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
  const kb = knowledgeBonuses(profile.knowledge || {});
  return {
    maxHP: derive.maxHP(s) + levelHpBonus(profile.level) + (kb.hp || 0),
    maxMP: derive.maxMP(s),
    attack: derive.attack(s, primaryStatOf(profile)),
    defense: derive.defense(s),
    magicAttack: derive.magicAttack(s),
    magicDefense: derive.magicDefense(s),
    skillPower: derive.skillPower(s),
    critChance: derive.critChance(s),
    critMult: derive.critMult(s), // crit damage multiplier
    evasion: derive.evasion(s),
    accuracy: derive.accuracy(s),
    dodgeChance: derive.dodgeChance(s),
    fleeChance: derive.fleeChance(s),
    speed: derive.speed(s), // initiative / attack speed
    hpRegen: derive.hpRegenPerFloor(s) + (kb.hpRegen || 0), // between-wave HP recovery
    expToNext: Math.round(TUNING.baseXP * Math.pow(profile.level, 1.5)),
  };
}

// Fold a completed dungeon-floor result back into the profile: bank loot, award
// EXP through the engine (handling level-ups), and advance the floor on a clear.
// Returns a new profile plus the level-ups gained so the UI can celebrate them.
export function applyFloorResult(profile, result) {
  let p = { ...profile };
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

  // Loot drops go straight into the inventory.
  if (result.loot && result.loot.length) {
    p.inventory = [...(p.inventory || []), ...result.loot];
  }
  // Crafting materials get added to the stash.
  if (result.materials && Object.keys(result.materials).length) {
    const m = { ...(p.materials || {}) };
    for (const [k, q] of Object.entries(result.materials)) m[k] = (m[k] || 0) + q;
    p.materials = m;
  }
  // Monster cores feed the knowledge book.
  if (result.cores && Object.keys(result.cores).length) {
    const k = { ...(p.knowledge || {}) };
    for (const [id, n] of Object.entries(result.cores)) k[id] = (k[id] || 0) + n;
    p.knowledge = k;
  }

  // Carry HP/MP to the next floor. Defeat respawns you at full; otherwise keep
  // the HP/MP you ended the floor on (rest floors end you at full).
  if (result.outcome === "defeat") {
    p.currentHP = null;
    p.currentMP = null;
  } else if (result.finalHp != null) {
    p.currentHP = result.finalHp;
    p.currentMP = result.finalMp;
  }
  p.lastRestTick = Date.now(); // restart the regen clock after a floor

  return { profile: p, levelsGained };
}

// ── Offline idle accrual ─────────────────────────────────────
// The game is fully idle: while you're away your avatar keeps "descending".
// We grant deterministic EXP + monster cores (+ a little gold) for the real
// time elapsed since you were last active, on the same curve the dungeon uses,
// capped at IDLE_CAP_MS (8h). Returns the updated profile plus a summary for a
// "while you were away" screen (or null when there's nothing to grant).
export function applyOfflineProgress(profile, now = Date.now()) {
  if (!profile) return { profile, rewards: null };
  const since = profile.lastSeenAt || profile.lastSyncAt || now;
  const elapsed = now - since;
  if (elapsed < 60_000) return { profile: { ...profile, lastSeenAt: now }, rewards: null };

  const r = idleRewards(profile.floor || 1, elapsed);
  const hasCores = r.cores && Object.keys(r.cores).length > 0;
  if (r.xp <= 0 && !hasCores) return { profile: { ...profile, lastSeenAt: now }, rewards: null };

  let p = { ...profile };
  let levelsGained = [];
  if (r.xp > 0) {
    const g = engineGainExp(p, r.xp);
    p = g.profile;
    levelsGained = g.levelsGained;
    p.skillPoints = (p.skillPoints || 0) + levelsGained.length; // 1 skill point / level
  }
  if (hasCores) {
    const k = { ...(p.knowledge || {}) };
    for (const [id, n] of Object.entries(r.cores)) k[id] = (k[id] || 0) + n;
    p.knowledge = k;
  }
  const gold = Math.round(r.minutes * (1 + (p.floor || 1) * 0.3));
  p.gold = (p.gold || 0) + gold;
  p.lastSeenAt = now;
  return { profile: p, rewards: { minutes: r.minutes, xp: r.xp, gold, cores: r.cores, capped: r.capped, levelsGained } };
}

// Find an item by id across inventory and equipped slots.
function findItem(profile, itemId) {
  return (
    (profile.inventory || []).find((i) => i.id === itemId) ||
    Object.values(profile.equipment || {}).find((i) => i && i.id === itemId) ||
    null
  );
}

// Apply fn() to the item with itemId wherever it lives (inventory or a slot).
function mapItem(profile, itemId, fn) {
  const inventory = (profile.inventory || []).map((i) => (i.id === itemId ? fn(i) : i));
  const equipment = { ...(profile.equipment || {}) };
  for (const slot of Object.keys(equipment)) {
    if (equipment[slot] && equipment[slot].id === itemId) equipment[slot] = fn(equipment[slot]);
  }
  return { ...profile, inventory, equipment };
}

function spendResources(profile, gold, mats) {
  const m = { ...(profile.materials || {}) };
  for (const [k, q] of Object.entries(mats || {})) m[k] = (m[k] || 0) - q;
  return { ...profile, gold: (profile.gold || 0) - gold, materials: m };
}

// Enhance an item one upgrade level if the player can pay the cost.
export function upgradeItem(profile, itemId) {
  const item = findItem(profile, itemId);
  if (!item) return profile;
  const cost = upgradeCost(item);
  if (!cost) return profile; // maxed
  if ((profile.gold || 0) < cost.gold || !hasMaterials(profile.materials, cost.mats)) return profile;
  let p = spendResources(profile, cost.gold, cost.mats);
  return mapItem(p, itemId, (it) => withUpgrade(it));
}

// Craft an item up to the next rarity (keeps stats, adds one), if affordable.
export function craftItemRarity(profile, itemId, rng) {
  const item = findItem(profile, itemId);
  if (!item) return profile;
  const cost = rarityUpgradeCost(item);
  if (!cost) return profile; // already legendary
  if ((profile.gold || 0) < cost.gold || !hasMaterials(profile.materials, cost.mats)) return profile;
  let p = spendResources(profile, cost.gold, cost.mats);
  return mapItem(p, itemId, (it) => withRarityUp(it, rng));
}

// Weapon types this character may equip. A normal job is locked to its one
// weapon; a hidden Luck job or a not-yet-awakened character may use BOTH of the
// class's weapon types (but no others).
export function allowedWeaponTypes(profile) {
  const job = getJob(profile.job);
  if (job && !job.hidden && job.weapon) return [job.weapon];
  return classWeaponTypes(profile.classId);
}

// Can this character equip the given item? Armor and accessories are universal
// (any class may wear them, even off-class). Weapons are limited to the
// character's allowed weapon types; sub-weapons to the class's own type.
export function canEquipItem(profile, item) {
  if (!item) return false;
  if (item.slot === "weapon") {
    const wt = item.weaponType || item.base;
    return !wt || allowedWeaponTypes(profile).includes(wt);
  }
  if (item.slot === "subweapon") {
    const sub = (CLASS_GEAR[profile.classId] || {}).sub;
    return !item.subType || item.subType === sub;
  }
  return true; // helm / armor / gloves / boots / accessory — any class
}

// Equip an item from the inventory; any item already in that slot returns to
// the inventory. Weapons must match the character's allowed types. Returns a
// new profile (unchanged if not equippable).
export function equipItem(profile, itemId) {
  const inv = profile.inventory || [];
  const item = inv.find((i) => i.id === itemId);
  if (!item) return profile;
  if (!canEquipItem(profile, item)) return profile;
  const equipment = { ...(profile.equipment || { weapon: null, armor: null, accessory: null }) };
  const prev = equipment[item.slot];
  const newInv = inv.filter((i) => i.id !== itemId);
  if (prev) newInv.push(prev);
  equipment[item.slot] = item;
  return { ...profile, inventory: newInv, equipment };
}

// Unequip the item in a slot back into the inventory.
export function unequipItem(profile, slot) {
  const equipment = { ...(profile.equipment || {}) };
  const it = equipment[slot];
  if (!it) return profile;
  equipment[slot] = null;
  return { ...profile, inventory: [...(profile.inventory || []), it], equipment };
}

// Sell an inventory item for gold (value scales with item level + rarity).
export function sellItem(profile, itemId) {
  const inv = profile.inventory || [];
  const item = inv.find((i) => i.id === itemId);
  if (!item) return profile;
  const value = Math.max(1, Math.round((item.level || 1) * 2 + Object.values(item.mods || {}).reduce((a, b) => a + b, 0)));
  return { ...profile, inventory: inv.filter((i) => i.id !== itemId), gold: (profile.gold || 0) + value };
}

// Current HP/MP (carried between floors) clamped to the live maximums.
export function vitals(profile) {
  const { maxHP, maxMP } = deriveSheet(profile);
  return {
    hp: profile.currentHP == null ? maxHP : Math.max(0, Math.min(profile.currentHP, maxHP)),
    mp: profile.currentMP == null ? maxMP : Math.max(0, Math.min(profile.currentMP, maxMP)),
    maxHP,
    maxMP,
  };
}

// Regenerate carried HP/MP from elapsed real time. Returns the SAME profile when
// nothing changed so callers can pass it straight to setState.
export function applyHpRegen(profile, now = Date.now()) {
  if (!profile) return profile;
  const { maxHP, maxMP } = deriveSheet(profile);
  const hp = profile.currentHP == null ? maxHP : Math.min(profile.currentHP, maxHP);
  const mp = profile.currentMP == null ? maxMP : Math.min(profile.currentMP, maxMP);
  if (hp >= maxHP && mp >= maxMP) {
    if (profile.currentHP == null && profile.currentMP == null) return profile;
    return { ...profile, currentHP: null, currentMP: null, lastRestTick: now };
  }
  const last = profile.lastRestTick || profile.createdAt || now;
  const minutes = (now - last) / 60000;
  if (minutes <= 0) return profile;
  const newHP = Math.min(maxHP, Math.round(hp + maxHP * HP_REGEN_PER_MIN * minutes));
  const newMP = Math.min(maxMP, Math.round(mp + maxMP * MP_REGEN_PER_MIN * minutes));
  if (newHP <= hp && newMP <= mp) return profile; // nothing meaningful yet — don't advance the clock
  const full = newHP >= maxHP && newMP >= maxMP;
  return {
    ...profile,
    currentHP: full ? null : newHP,
    currentMP: full ? null : newMP,
    lastRestTick: now,
  };
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
