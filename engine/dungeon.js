// Runs a whole dungeon floor end to end: spends Energy, fights all 10 waves
// (carrying HP/MP between waves), handles non-combat floor types, and applies
// the death penalty. Pure logic + events — no printing.

import { makeCombatant, runBattle } from "./combat.js";
import { buildWaves, energyCost } from "./floors.js";
import { derive } from "./stats.js";
import { TUNING } from "./progression.js";

// Small recovery granted between waves so a 10-wave floor is survivable but
// still attritional. Tunable.
function betweenWaveRecovery(player) {
  const hp = Math.round(player.maxHP * 0.05) + derive.hpRegenPerFloor(player.stats);
  const mp = Math.round(player.maxMP * 0.15);
  player.hp = Math.min(player.maxHP, player.hp + hp);
  player.mp = Math.min(player.maxMP, player.mp + mp);
  return { hp, mp };
}

// player: a profile-like { stats, skills } (we build the live combatant here).
// Returns { outcome, events, wavesCleared, xp, gold, energySpent, player }.
export function runFloor({ floor, stats, skills, choose, rng, energy }) {
  const events = [];
  const emit = (e) => { events.push(e); return e; };

  const cost = energyCost(floor);
  if (energy < cost) {
    emit({ type: "floorBlocked", floor, need: cost, have: energy });
    return { outcome: "no_energy", events, wavesCleared: 0, xp: 0, gold: 0, energySpent: 0 };
  }

  const { type, waves } = buildWaves(floor, rng);
  emit({ type: "floorStart", floor, floorType: type, waves: waves.length, energyCost: cost });

  const player = makeCombatant({ name: "You", stats, skills, isPlayer: true });

  // ── Non-combat floors ────────────────────────────────────────
  if (type === "treasure") {
    const luckBonus = 1 + stats.LUK * 0.02;
    const gold = Math.round((20 + floor * 5) * luckBonus);
    emit({ type: "treasure", floor, gold });
    return { outcome: "cleared", events, wavesCleared: 0, xp: 0, gold, energySpent: cost, player };
  }
  if (type === "rest") {
    player.hp = player.maxHP; player.mp = player.maxMP;
    emit({ type: "rest", floor });
    return { outcome: "cleared", events, wavesCleared: 0, xp: 0, gold: 0, energySpent: cost, player };
  }

  // ── Combat / Elite / Boss floors: fight every wave ───────────
  let totalXp = 0, totalGold = 0, wavesCleared = 0;

  for (let w = 0; w < waves.length; w++) {
    emit({ type: "waveStart", floor, wave: w + 1, of: waves.length });

    const enemyCombatants = waves[w].map((d) => {
      const c = makeCombatant({ name: d.name, stats: d.stats });
      c.xp = d.xp; c.gold = d.gold;
      return c;
    });

    const result = runBattle({ player, enemies: enemyCombatants, choose, rng });
    for (const e of result.events) events.push(e);

    if (result.outcome === "defeat") {
      // Death penalty: loot lost, run EXP halved, energy spent is gone.
      const keptXp = Math.floor(totalXp * 0.5);
      emit({ type: "floorDefeat", floor, wave: w + 1, lostGold: totalGold, xpHalvedTo: keptXp });
      return {
        outcome: "defeat", events, wavesCleared,
        xp: keptXp, gold: 0, energySpent: cost, player,
      };
    }
    if (result.outcome === "fled") {
      const keptXp = Math.floor(totalXp * 0.5);
      emit({ type: "floorFled", floor, wave: w + 1, keptXp });
      return { outcome: "fled", events, wavesCleared, xp: keptXp, gold: totalGold, energySpent: cost, player };
    }

    wavesCleared++;
    totalXp += result.xp;
    totalGold += result.gold;
    emit({ type: "waveCleared", floor, wave: w + 1, xp: result.xp, gold: result.gold,
           playerHp: player.hp, playerMp: player.mp });

    if (w < waves.length - 1) {
      const rec = betweenWaveRecovery(player);
      emit({ type: "recover", hp: rec.hp, mp: rec.mp, playerHp: player.hp, playerMp: player.mp });
    }
  }

  // Floor cleared — apply the reduced dungeon-EXP factor on the way out.
  const awardedXp = Math.round(totalXp * TUNING.dungeonXpFactor);
  emit({ type: "floorCleared", floor, wavesCleared, rawXp: totalXp, awardedXp, gold: totalGold });
  return { outcome: "cleared", events, wavesCleared, xp: awardedXp, gold: totalGold, energySpent: cost, player };
}
