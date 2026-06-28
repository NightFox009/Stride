// Pure turn-based combat engine. No graphics, no I/O.
// Returns a result object AND a list of events. A UI (text or graphical)
// renders the events — the engine itself never prints.

import { derive } from "./stats.js";
import { SKILLS } from "./skills.js";
import { createRng } from "./rng.js";

// Build a live combatant from a stat block.
export function makeCombatant({ name, stats, skills = [], isPlayer = false, hp = null, bonusHP = 0 }) {
  const maxHP = (hp != null ? hp : derive.maxHP(stats)) + bonusHP;
  return {
    name,
    stats,
    isPlayer,
    skills,
    hp: maxHP,
    maxHP,
    mp: derive.maxMP(stats),
    maxMP: derive.maxMP(stats),
    guard: false,
    stunned: false,
  };
}

const isAlive = (c) => c.hp > 0;

// Core damage application — shared by attacks and skills.
function dealDamage(rng, attacker, target, rawAmount, type, opts = {}) {
  // Dodge (skip for AoE-ish raw guarantees if needed; here always checks)
  const dodge = derive.dodgeChance(target.stats);
  if (rng.chance(dodge)) {
    return { type: "dodge", attacker: attacker.name, target: target.name };
  }
  let amount = rawAmount;
  // Crit
  const crit = derive.critChance(attacker.stats) + (opts.critBonus || 0);
  const isCrit = rng.chance(crit);
  if (isCrit) amount *= derive.critMult();
  // Guard halves
  if (target.guard) amount *= 0.5;
  amount = Math.max(1, Math.round(amount));
  target.hp = Math.max(0, target.hp - amount);
  return {
    type: "damage",
    attacker: attacker.name,
    target: target.name,
    amount,
    crit: isCrit,
    dmgType: type,
    targetHp: target.hp,
    killed: target.hp <= 0,
  };
}

function heal(target, amount) {
  const before = target.hp;
  target.hp = Math.min(target.maxHP, target.hp + amount);
  return { type: "heal", target: target.name, amount: target.hp - before, targetHp: target.hp };
}

// Simple enemy AI: attack a random living player-side target.
function enemyAction(rng, enemy, players) {
  const targets = players.filter(isAlive);
  if (targets.length === 0) return null;
  const target = rng.pick(targets);
  return dealDamage(rng, enemy, target, derive.attack(enemy.stats), "physical");
}

// `choose(player, enemies, rng)` is a policy that returns an action:
//   { kind: "attack", targetIndex }
//   { kind: "skill", skillId, targetIndex }
//   { kind: "flee" }
// In a real UI, this is the player's menu selection. In sims, it's an AI.
export function runBattle({ player, enemies, choose, rng = createRng(), maxRounds = 100 }) {
  const events = [];
  const emit = (e) => { events.push(e); return e; };
  emit({ type: "battleStart", enemies: enemies.map((e) => e.name) });

  let round = 0;
  while (isAlive(player) && enemies.some(isAlive) && round < maxRounds) {
    round++;
    emit({ type: "round", round });

    // Turn order by speed (AGI). Player + enemies interleaved.
    const order = [player, ...enemies]
      .filter(isAlive)
      .sort((a, b) => derive.speed(b.stats) - derive.speed(a.stats));

    for (const actor of order) {
      if (!isAlive(actor) || !isAlive(player) || !enemies.some(isAlive)) continue;

      if (actor.stunned) {
        actor.stunned = false;
        emit({ type: "stunnedSkip", actor: actor.name });
        continue;
      }

      if (actor.isPlayer) {
        actor.guard = false; // guard only lasts until your next turn
        const action = choose(player, enemies, rng) || { kind: "attack", targetIndex: firstAlive(enemies) };

        if (action.kind === "flee") {
          if (rng.chance(derive.fleeChance(player.stats))) {
            emit({ type: "flee", success: true });
            return finish(events, "fled", player, enemies);
          }
          emit({ type: "flee", success: false });
          continue;
        }

        if (action.kind === "skill") {
          const skill = SKILLS[action.skillId];
          if (!skill) { emit({ type: "error", msg: `no skill ${action.skillId}` }); continue; }
          if (player.mp < skill.cost) {
            // fall back to a basic attack if out of MP
            emit({ type: "outOfMp", skill: skill.name });
            basicAttack(rng, player, enemies, action.targetIndex, emit);
            continue;
          }
          player.mp -= skill.cost;
          emit({ type: "skill", actor: player.name, skill: skill.name, cost: skill.cost });
          const targets = resolveTargets(skill.target, player, enemies, action.targetIndex);
          const ctx = {
            user: player, targets, rng,
            dealDamage: (u, t, amt, ty, o) => dealDamage(rng, u, t, amt, ty, o),
            heal,
          };
          for (const ev of skill.effect(ctx)) emit(ev);
          continue;
        }

        // default: attack
        basicAttack(rng, player, enemies, action.targetIndex, emit);
      } else {
        // enemy turn
        actor.guard = false;
        const ev = enemyAction(rng, actor, [player]);
        if (ev) emit(ev);
      }
    }
  }

  if (!isAlive(player)) return finish(events, "defeat", player, enemies);
  if (!enemies.some(isAlive)) return finish(events, "victory", player, enemies);
  return finish(events, "timeout", player, enemies);
}

function firstAlive(enemies) {
  const i = enemies.findIndex(isAlive);
  return i === -1 ? 0 : i;
}

function basicAttack(rng, player, enemies, targetIndex, emit) {
  const idx = isAlive(enemies[targetIndex]) ? targetIndex : firstAlive(enemies);
  const target = enemies[idx];
  if (!target) return;
  emit({ type: "attack", actor: player.name, target: target.name });
  emit(dealDamage(rng, player, target, derive.attack(player.stats), "physical"));
}

function resolveTargets(targetType, player, enemies, targetIndex) {
  if (targetType === "self") return [player];
  if (targetType === "all") return enemies.filter(isAlive);
  const idx = isAlive(enemies[targetIndex]) ? targetIndex : firstAlive(enemies);
  return [enemies[idx]].filter(Boolean);
}

function finish(events, outcome, player, enemies) {
  events.push({ type: "battleEnd", outcome });
  return {
    outcome, // "victory" | "defeat" | "fled" | "timeout"
    events,
    playerHp: player.hp,
    playerMp: player.mp,
    xp: outcome === "victory" ? enemies.reduce((s, e) => s + (e.xp || 0), 0) : 0,
    gold: outcome === "victory" ? enemies.reduce((s, e) => s + (e.gold || 0), 0) : 0,
  };
}
