// Interactive version of dungeon.js: instead of auto-resolving a whole floor,
// this drives it turn by turn so a UI can let the player choose attack / skill /
// flee each turn. It reuses the SAME engine primitives (createBattle, buildWaves,
// reward formulas) so interactive runs obey the same rules as the auto sim.

import { makeCombatant, createBattle } from "./combat.js";
import { buildWaves, energyCost } from "./floors.js";
import { derive } from "./stats.js";
import { SKILLS } from "./skills.js";
import { TUNING, levelHpBonus } from "./progression.js";
import { rollLoot } from "./items.js";
import { rollMaterials } from "./crafting.js";
import { COMBAT_CORE_CHANCE } from "./knowledge.js";
import { createRng } from "./rng.js";

// Same small between-wave recovery as the auto runner.
function betweenWaveRecovery(player) {
  const hp = Math.round(player.maxHP * 0.18) + derive.hpRegenPerFloor(player.stats);
  const mp = Math.round(player.maxMP * 0.3);
  player.hp = Math.min(player.maxHP, player.hp + hp);
  player.mp = Math.min(player.maxMP, player.mp + mp);
  return { hp, mp };
}

// Returns a controller: snapshot() for the current view, and act()/attack()/
// skill()/flee() to take the player's turn. Non-combat floors resolve instantly.
export function createFloorSession({ floor, stats, skills, skillLevels = {}, primaryStat = "STR", weaponTypes = null, classId = "knight", startHP = null, startMP = null, level = 1, rng = createRng() }) {
  const cost = energyCost(floor);
  const { type, waves } = buildWaves(floor, rng);
  const player = makeCombatant({ name: "You", stats, skills, skillLevels, primaryStat, isPlayer: true, bonusHP: levelHpBonus(level) });
  // Start from carried HP/MP (rest floors will restore to full below).
  if (startHP != null) player.hp = Math.max(1, Math.min(player.maxHP, startHP));
  if (startMP != null) player.mp = Math.max(0, Math.min(player.maxMP, startMP));

  const log = [];
  const emit = (e) => { log.push(e); return e; };
  emit({ type: "floorStart", floor, floorType: type, waves: waves.length, energyCost: cost });

  let phase = "fighting"; // fighting | won | lost | fled
  let result = null;
  let waveIndex = 0;
  let battle = null;
  let totalXp = 0, totalGold = 0, wavesCleared = 0;
  const seen = new Set(); // monster templateIds fought, for core drops

  function finishFloor(outcome, xp, gold) {
    // Loot + materials only drop on a clear; magic find uses the player's Luck.
    const loot = outcome === "cleared" ? rollLoot(type, floor, stats.LUK || 0, rng, { playerClass: classId, playerWeaponTypes: weaponTypes }) : [];
    const materials = outcome === "cleared" ? rollMaterials(type, floor, stats.LUK || 0, rng) : {};
    // Monster cores: a chance per monster type fought, on a clear.
    const cores = {};
    if (outcome === "cleared") {
      for (const id of seen) if (rng.next() < COMBAT_CORE_CHANCE) cores[id] = (cores[id] || 0) + 1;
    }
    result = { outcome, xp, gold, energySpent: cost, wavesCleared, floor, loot, materials, cores, finalHp: player.hp, finalMp: player.mp };
    phase = outcome === "cleared" ? "won" : outcome === "defeat" ? "lost" : "fled";
  }

  function startWave() {
    emit({ type: "waveStart", floor, wave: waveIndex + 1, of: waves.length });
    const enemyCombatants = waves[waveIndex].map((d) => {
      if (d.templateId) seen.add(d.templateId);
      const c = makeCombatant({ name: d.name, stats: d.stats, hp: d.hp });
      c.xp = d.xp; c.gold = d.gold; c.templateId = d.templateId;
      return c;
    });
    battle = createBattle({ player, enemies: enemyCombatants, rng });
    const step = battle.advance();
    for (const e of step.events) log.push(e);
    if (!step.awaiting) resolveBattle();
  }

  function resolveBattle() {
    const out = battle.outcome;
    if (out === "defeat") {
      const kept = Math.floor(totalXp * 0.5);
      emit({ type: "floorDefeat", floor, wave: waveIndex + 1, lostGold: totalGold, xpHalvedTo: kept });
      finishFloor("defeat", kept, 0);
      return;
    }
    if (out === "fled") {
      // Fleeing is a loss: you abandon the run — loot lost, EXP halved.
      const kept = Math.floor(totalXp * 0.5);
      emit({ type: "floorFled", floor, wave: waveIndex + 1, keptXp: kept });
      finishFloor("fled", kept, 0);
      return;
    }
    // victory
    const r = battle.result();
    wavesCleared++;
    totalXp += r.xp;
    totalGold += r.gold;
    emit({ type: "waveCleared", floor, wave: waveIndex + 1, xp: r.xp, gold: r.gold, playerHp: player.hp, playerMp: player.mp });

    if (waveIndex < waves.length - 1) {
      const rec = betweenWaveRecovery(player);
      emit({ type: "recover", hp: rec.hp, mp: rec.mp, playerHp: player.hp, playerMp: player.mp });
      waveIndex++;
      startWave();
    } else {
      const awarded = Math.round(totalXp * TUNING.dungeonXpFactor);
      emit({ type: "floorCleared", floor, wavesCleared, rawXp: totalXp, awardedXp: awarded, gold: totalGold });
      finishFloor("cleared", awarded, totalGold);
    }
  }

  // ── Non-combat floors resolve immediately ──
  if (type === "treasure") {
    const gold = Math.round((20 + floor * 5) * (1 + stats.LUK * 0.02));
    emit({ type: "treasure", floor, gold });
    finishFloor("cleared", 0, gold);
  } else if (type === "rest") {
    player.hp = player.maxHP;
    player.mp = player.maxMP;
    emit({ type: "rest", floor });
    finishFloor("cleared", 0, 0);
  } else {
    startWave();
  }

  function act(action) {
    if (phase !== "fighting" || !battle) return;
    const step = battle.submit(action);
    for (const e of step.events) log.push(e);
    if (!step.awaiting) resolveBattle();
  }

  // Take one turn automatically with the same policy the balance harness uses:
  // heal when low, else cast the first affordable damage skill, else attack.
  function autoStep() {
    if (phase !== "fighting" || !battle) return;
    const enemies = battle.enemies;
    const target = enemies.findIndex((e) => e.hp > 0);
    for (const id of skills) {
      const s = SKILLS[id];
      if (s && s.target === "self" && player.hp < player.maxHP * 0.4 && player.mp >= s.cost) {
        return act({ kind: "skill", skillId: id, targetIndex: target });
      }
    }
    for (const id of skills) {
      const s = SKILLS[id];
      if (s && s.target !== "self" && player.mp >= s.cost) {
        return act({ kind: "skill", skillId: id, targetIndex: target });
      }
    }
    return act({ kind: "attack", targetIndex: target });
  }

  const skillMenu = skills
    .map((id) => {
      const s = SKILLS[id];
      return s ? { id, name: s.name, cost: s.cost, target: s.target, describe: s.describe, level: skillLevels[id] || 1 } : null;
    })
    .filter(Boolean);

  function snapshot() {
    return {
      floor,
      floorType: type,
      phase,
      wave: waveIndex + 1,
      totalWaves: waves.length,
      player: { name: player.name, hp: player.hp, maxHP: player.maxHP, mp: player.mp, maxMP: player.maxMP },
      enemies: battle
        ? battle.enemies.map((e, i) => ({ index: i, name: e.name, hp: e.hp, maxHP: e.maxHP, alive: e.hp > 0 }))
        : [],
      log: [...log],
      awaiting: phase === "fighting" && !!battle && battle.outcome === null,
      result,
    };
  }

  return {
    floorType: type,
    skillMenu,
    act,
    autoStep,
    attack: (targetIndex = 0) => act({ kind: "attack", targetIndex }),
    skill: (skillId, targetIndex = 0) => act({ kind: "skill", skillId, targetIndex }),
    flee: () => act({ kind: "flee" }),
    snapshot,
  };
}
