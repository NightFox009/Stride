// Knowledge & idle systems.
//
// Knowledge book: a bestiary of every monster. Killing floor monsters (or idling
// on their floor) can drop "monster cores"; collecting enough of a monster's
// cores "studies" it, and studied monsters grant a small permanent stat bonus.
//
// Idle/camp: when you're stuck on a floor you can camp it and passively earn EXP
// and cores over real time (capped), in the spirit of idle games.

import { ENEMIES } from "./enemies.js";
import { ZONES, zoneForFloor } from "./zones.js";
import { floorType } from "./floors.js";

// Knowledge tiers: tier 1 at 12 cores, tier 2 at 24, tier 3 at 36, … Each tier
// grants a permanent bonus to the monster's reward STAT (goblins → HP/VIT,
// slimes → attack/STR, etc.). Elites/bosses grant more per tier.
export const CORE_TIER_SIZE = 12;
export const STAT_PER_TIER = 2; // reward-stat points per tier (normal monster)
export const KIND_MULT = { normal: 1, elite: 2, boss: 3 };
export const COMBAT_CORE_CHANCE = 0.12; // per monster type, per cleared floor
export const IDLE_CAP_MS = 8 * 60 * 60 * 1000; // offline idle accrues up to 8h

export function discoveredCount(knowledge = {}) {
  return Object.values(knowledge).filter((n) => n > 0).length;
}
export function knowledgeTier(cores = 0) {
  return Math.floor(cores / CORE_TIER_SIZE);
}
export function tieredCount(knowledge = {}) {
  return Object.values(knowledge).filter((n) => knowledgeTier(n) > 0).length;
}
// Cores needed to reach the next tier (for UI progress).
export function nextTierAt(cores = 0) {
  return (knowledgeTier(cores) + 1) * CORE_TIER_SIZE;
}
// The reward stat + amount a monster currently grants (for the UI).
export function monsterReward(monster, cores = 0) {
  if (!monster || !monster.reward) return null;
  const tier = knowledgeTier(cores);
  const amount = tier * STAT_PER_TIER * (KIND_MULT[monster.kind] || 1);
  return { stat: monster.reward, tier, amount };
}

// Total stat bonuses from the whole knowledge book: { STAT: total }. Each
// studied monster contributes its reward stat scaled by tier (and kind).
export function knowledgeStatBonus(knowledge = {}) {
  const mods = {};
  for (const [id, cores] of Object.entries(knowledge)) {
    const m = ENEMIES[id];
    const r = monsterReward(m, cores);
    if (r && r.amount > 0) mods[r.stat] = (mods[r.stat] || 0) + r.amount;
  }
  return mods;
}

// Monster ids that appear on a floor (its zone pool + the floor's elite/boss).
export function floorMonsterIds(floor) {
  const z = zoneForFloor(floor);
  const type = floorType(floor);
  const ids = [...z.pool];
  if (type === "boss") ids.push(z.boss);
  else ids.push(z.elite);
  return ids;
}

// Rewards for camping a floor over elapsed real time (capped). Deterministic so
// it can be previewed live and claimed.
export function idleRewards(floor, elapsedMs) {
  const capped = Math.min(Math.max(0, elapsedMs), IDLE_CAP_MS);
  const minutes = capped / 60000;
  const xp = Math.round((2 + floor * 0.8) * minutes);
  const ids = floorMonsterIds(floor);
  const coreTotal = Math.floor(minutes / 15); // ~1 core / 15 min
  const cores = {};
  for (let i = 0; i < coreTotal; i++) {
    const id = ids[i % ids.length];
    cores[id] = (cores[id] || 0) + 1;
  }
  return { xp, cores, minutes: Math.floor(minutes), capped: elapsedMs >= IDLE_CAP_MS };
}

// The full bestiary grouped by zone (for the Knowledge screen).
export function bestiaryByZone() {
  return ZONES.map((z) => ({
    name: z.name,
    monsters: [...z.pool, z.elite, z.boss].map((id) => ENEMIES[id]).filter(Boolean),
  }));
}
